const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// Connect to the database
const connectDB = async () => {
  try {
    await pool.query('SELECT 1'); // Check if DB is connected
    console.log('☑️  Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection error', error);
    process.exit(1);
  }
};

async function checkDbStatus() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1'); // Simple lightweight query
    client.release();
    return { status: 'OK', message: 'Database connected successfully' };
  } catch (error) {
    return { status: 'ERROR', message: error.message };
  }
}



module.exports = { pool, connectDB,checkDbStatus };
