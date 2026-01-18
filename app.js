/**
 * cPanel Node.js Application Entry Point
 *
 * This file is the main entry point for cPanel's Node.js selector.
 * cPanel expects the entry point to be in the root directory.
 */

// Load environment variables first
require('dotenv').config();

// Start the server
require('./src/server');
