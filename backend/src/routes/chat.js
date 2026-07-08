const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Ollama } = require('ollama');
const db = require('../db');

const router = express.Router();
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

// Get all chats
router.get('/', (req, res) => {
  const chats = db.prepare('SELECT * FROM chats ORDER BY isPinned DESC, updatedAt DESC').all();
  res.json(chats);
});

// Create new chat
router.post('/', (req, res) => {
  const { title, systemPrompt, model, temperature, topP } = req.body;
  const id = uuidv4();
  const now = Date.now();
  db.prepare(`
    INSERT INTO chats (id, title, createdAt, updatedAt, systemPrompt, model, temperature, topP)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title || 'New Chat', now, now, systemPrompt || '', model || 'llama3', temperature || 0.7, topP || 0.9);
  res.json({ id, title, model });
});

// Get chat messages
router.get('/:id/messages', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt ASC').all(req.params.id);
  res.json(messages);
});

// Stream response
router.post('/:id/stream', async (req, res) => {
  const { id } = req.params;
  const { message, regenerateId } = req.body;
  
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  // Handle new message
  let userMessageId = uuidv4();
  if (message) {
    db.prepare('INSERT INTO messages (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(userMessageId, id, 'user', message, Date.now());
  }

  // Get full history
  const history = db.prepare('SELECT role, content FROM messages WHERE chatId = ? ORDER BY createdAt ASC').all(id);
  
  // Format for Ollama
  const messages = history.map(m => ({ role: m.role, content: m.content }));
  if (chat.systemPrompt) {
    messages.unshift({ role: 'system', content: chat.systemPrompt });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let fullResponse = '';
  const startTime = Date.now();
  const assistantMsgId = regenerateId || uuidv4();

  try {
    const stream = await ollama.chat({
      model: chat.model || 'llama3',
      messages,
      stream: true,
      options: {
        temperature: chat.temperature || 0.7,
        top_p: chat.topP || 0.9
      }
    });

    for await (const chunk of stream) {
      const token = chunk.message.content;
      fullResponse += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    const latency = Date.now() - startTime;
    // Estimate tokens (roughly 4 chars per token for English)
    const tokens = Math.ceil(fullResponse.length / 4);

    if (regenerateId) {
      db.prepare('UPDATE messages SET content = ?, tokens = ?, latency = ? WHERE id = ?')
        .run(fullResponse, tokens, latency, assistantMsgId);
    } else {
      db.prepare('INSERT INTO messages (id, chatId, role, content, createdAt, tokens, latency) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(assistantMsgId, id, 'assistant', fullResponse, Date.now(), tokens, latency);
    }

    db.prepare('UPDATE chats SET updatedAt = ? WHERE id = ?').run(Date.now(), id);

    res.write(`data: ${JSON.stringify({ done: true, latency, tokens })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Update chat (e.g. pin)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, isPinned } = req.body;
  const updates = [];
  const params = [];
  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (isPinned !== undefined) { updates.push('isPinned = ?'); params.push(isPinned ? 1 : 0); }
  
  if (updates.length > 0) {
    params.push(id);
    db.prepare(`UPDATE chats SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  res.json({ success: true });
});

// Delete chat
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM chats WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
