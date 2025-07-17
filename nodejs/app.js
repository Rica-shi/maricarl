// app.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

const testDB = require('./routes/test-db');
const itemRoutes = require('./routes/item');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const sellerRoutes = require('./routes/seller');

// ✅ Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use('/api/v1', testDB); 
app.use('/api/v1', itemRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', sellerRoutes);

// Serve uploads folder for profile images and other uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ✅ Sample Route (Temporary Test)
app.get('/api/v1/hello', (req, res) => {
  res.json({ message: 'Hello from your Node.js backend!' });
});

// ✅ Export the app
module.exports = app;
