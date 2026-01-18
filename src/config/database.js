const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Parse DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

if (!urlMatch) {
  throw new Error('Invalid DATABASE_URL format');
}

const [, user, password, host, port, database] = urlMatch;

// Create connection pool
const pool = mysql.createPool({
  host,
  port: parseInt(port),
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test connection
pool.getConnection()
  .then(connection => {
    logger.info('✓ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    logger.error('✗ Database connection failed:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await pool.end();
});

module.exports = pool;
