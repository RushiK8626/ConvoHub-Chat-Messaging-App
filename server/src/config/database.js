const mysql = require('mysql2');
require('dotenv').config({ path: '.env' });

const DEFAULT_PORT = 3306;
const POOL_CONFIG = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const parseDbUrl = (url) => ({
  host: url.hostname,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.substring(1),
  port: url.port || DEFAULT_PORT,
  ...POOL_CONFIG
});

const getEnvConfig = () => ({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || DEFAULT_PORT,
  ...POOL_CONFIG
});

const getDbConfig = () => {
  if (!process.env.DATABASE_URL) return getEnvConfig();
  
  try {
    return parseDbUrl(new URL(process.env.DATABASE_URL));
  } catch {
    return getEnvConfig();
  }
};

const pool = mysql.createPool(getDbConfig()).promise();

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
};

module.exports = { pool, testConnection };