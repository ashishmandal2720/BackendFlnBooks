const { Client } = require('pg');
require('dotenv').config();


const createDatabaseIfNotExists = async () => {
  const dbName = process.env.DB_NAME;

  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: "postgres", // Connect to 'postgres' to check/create DB
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
  });

  try {
    await client.connect(); // Connect to the database

    // Check if the database exists
    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1;`;
    const checkDbResult = await client.query(checkDbQuery, [dbName]);

    if (checkDbResult.rowCount === 0) {
      // Create database if it doesn't exist
      const createDbQuery = `CREATE DATABASE ${dbName} WITH OWNER = postgres ENCODING = 'UTF8' LC_COLLATE = 'en-GB' LC_CTYPE = 'en-GB' LOCALE_PROVIDER = 'libc' TABLESPACE = pg_default CONNECTION LIMIT = -1 IS_TEMPLATE = False;`;
      await client.query(createDbQuery);
      console.log(`✅ Database "${dbName}" created successfully.`);
      return true;
    } else {
      console.log(`⚡ Database "${dbName}" already exists.`);
      return true;
    }
  } catch (err) {
    console.error('❌ Error creating database:', err);
    return false;
  } finally {
    await client.end(); // Properly close the connection
  }
};

module.exports = { createDatabaseIfNotExists };
