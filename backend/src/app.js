const express = require('express');
const cors = require('cors');
require('dotenv').config({ quiet: true });

const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

module.exports = app;