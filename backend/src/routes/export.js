const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../db');

const router = express.Router();

router.get('/:id/json', (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.id);
  const messages = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt ASC').all(req.params.id);
  if (!chat) return res.status(404).send('Chat not found');

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="chat-${chat.id}.json"`);
  res.send(JSON.stringify({ chat, messages }, null, 2));
});

router.get('/:id/md', (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.id);
  const messages = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt ASC').all(req.params.id);
  if (!chat) return res.status(404).send('Chat not found');

  let md = `# ${chat.title}\n\n`;
  messages.forEach(m => {
    md += `### ${m.role === 'user' ? 'User' : 'Assistant'}\n${m.content}\n\n---\n\n`;
  });

  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="chat-${chat.id}.md"`);
  res.send(md);
});

router.get('/:id/pdf', (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.id);
  const messages = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt ASC').all(req.params.id);
  if (!chat) return res.status(404).send('Chat not found');

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="chat-${chat.id}.pdf"`);
  doc.pipe(res);

  doc.fontSize(24).text(chat.title, { align: 'center' });
  doc.moveDown();

  messages.forEach(m => {
    doc.fontSize(14).fillColor(m.role === 'user' ? 'blue' : 'green').text(m.role === 'user' ? 'User' : 'LocalMind AI', { underline: true });
    doc.fontSize(12).fillColor('black').text(m.content);
    doc.moveDown();
  });

  doc.end();
});

module.exports = router;
