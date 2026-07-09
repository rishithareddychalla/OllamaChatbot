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
  const parsedMessages = messages.map(m => {
    if (m.images && typeof m.images === 'string') {
      try {
        m.images = JSON.parse(m.images);
      } catch(e) {}
    }
    return m;
  });
  res.json(parsedMessages);
});

// Stream response
router.post('/:id/stream', async (req, res) => {
  const { id } = req.params;
  const { message, regenerateId, images, model } = req.body;
  
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  const activeModel = model || chat.model || 'llama3';
  if (model && model !== chat.model) {
    db.prepare('UPDATE chats SET model = ?, updatedAt = ? WHERE id = ?').run(model, Date.now(), id);
  }

  // Handle new message
  let userMessageId = uuidv4();
  if (message || (images && images.length > 0)) {
    const imagesStr = images ? JSON.stringify(images) : null;
    db.prepare('INSERT INTO messages (id, chatId, role, content, images, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userMessageId, id, 'user', message || '', imagesStr, Date.now());
  }

  // Get full history
  const history = db.prepare('SELECT role, content, images FROM messages WHERE chatId = ? ORDER BY createdAt ASC').all(id);
  
  // Format for Ollama
  const messages = history.map(m => {
    const msg = { role: m.role, content: m.content };
    if (m.images) {
      try {
        const parsedImages = JSON.parse(m.images);
        if (Array.isArray(parsedImages)) {
          msg.images = parsedImages.map(img => img.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, ''));
        }
      } catch (e) {}
    }
    return msg;
  });
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
    const isVisionModel = activeModel.toLowerCase().match(/llava|vision|pixtral|minicpm/);
    const hasImages = messages.some(m => m.images && m.images.length > 0);
    if (hasImages && !isVisionModel) {
      throw new Error("The selected model does not support images. Please select a vision model like 'llava' from the dropdown at the top.");
    }

    const stream = await ollama.chat({
      model: activeModel,
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
    let errorMsg = error.message || String(error);
    if (errorMsg.toLowerCase().includes('does not support multimodal')) {
      errorMsg = "The selected model does not support images. Please select a vision model like 'llava' from the dropdown, or run `ollama run llava` in your terminal to install one.";
    }
    res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.end();
  }
});

// Edit message and truncate history
router.post('/:id/edit-message', (req, res) => {
  const { id } = req.params;
  const { messageId, newContent } = req.body;
  
  const msg = db.prepare('SELECT createdAt FROM messages WHERE id = ? AND chatId = ?').get(messageId, id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  
  // Update the user message
  db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(newContent, messageId);
  
  // Delete all messages after this one
  db.prepare('DELETE FROM messages WHERE chatId = ? AND createdAt > ?').run(id, msg.createdAt);
  
  res.json({ success: true });
});

// Generate Title for Chat
router.post('/:id/title', async (req, res) => {
  const { id } = req.params;
  const { prompt, model } = req.body;
  
  try {
    const response = await ollama.chat({
      model: model || 'llama3',
      messages: [
        { role: 'system', content: 'You are an expert at summarizing. Read the user prompt and generate a short, punchy title for this conversation (max 5 words). Do not use quotes or prefixes. Just the title.' },
        { role: 'user', content: prompt }
      ],
      stream: false,
    });
    
    let generatedTitle = response.message.content.trim();
    // Clean up any quotes the model might have added
    if (generatedTitle.startsWith('"') && generatedTitle.endsWith('"')) {
      generatedTitle = generatedTitle.slice(1, -1);
    }
    
    db.prepare('UPDATE chats SET title = ?, updatedAt = ? WHERE id = ?').run(generatedTitle, Date.now(), id);
    res.json({ success: true, title: generatedTitle });
  } catch (error) {
    console.error('Title generation error:', error);
    res.status(500).json({ error: error.message });
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
