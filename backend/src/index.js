const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
const exportRoutes = require('./routes/export');
const modelRoutes = require('./routes/models');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/models', modelRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LocalMind Backend Running' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`LocalMind AI Backend running on http://127.0.0.1:${PORT}`);
});
