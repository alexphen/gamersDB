// server/index.js - Add debugging and error handling
const express = require('express');
const path = require('path');
const cors = require('cors');

// Add error handling for require statements
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv not available:', error.message);
}

console.log('Starting server...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('Current directory:', __dirname);

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Check if client build exists
const clientBuildPath = path.join(__dirname, '../client/build');
console.log('Looking for client build at:', clientBuildPath);

try {
  // Serve static files from the React app build directory
  app.use(express.static(clientBuildPath));
  console.log('Static files configured successfully');
} catch (error) {
  console.error('Error setting up static files:', error);
}

// API routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Catch all handler: send back React's index.html file
app.get('*', (req, res) => {
  try {
    const indexPath = path.join(clientBuildPath, 'index.html');
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

const PORT = process.env.PORT || 5000;

// Add error handling for server startup
app.listen(PORT, (error) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
  console.log(`Server is running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;