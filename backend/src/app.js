const express = require('express');
const cors = require('cors');
require('dotenv').config({ quiet: true });

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const queueRoutes = require('./routes/queueRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api', projectRoutes);
app.use('/api/queues', queueRoutes);

module.exports = app;