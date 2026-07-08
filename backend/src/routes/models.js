const express = require('express');
const { Ollama } = require('ollama');

const router = express.Router();
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

router.get('/', async (req, res) => {
  try {
    const list = await ollama.list();
    res.json(list);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models from Ollama. Is Ollama running?' });
  }
});

module.exports = router;
