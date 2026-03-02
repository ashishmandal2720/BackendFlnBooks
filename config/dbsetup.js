const { Client } = require('pg');
const format = require('pg-format');
require('dotenv').config();


const createDatabaseIfNotExists = async () => {
  const dbName = process.env.DB_NAME;

  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'fln_books', // must connect to default DB
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
  });

  try {
    await client.connect();

    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1;`;
    const checkDbResult = await client.query(checkDbQuery, [dbName]);

    if (checkDbResult.rowCount === 0) {
      const createDbQuery = format(
        `CREATE DATABASE %I WITH OWNER = %I ENCODING = 'UTF8' LOCALE_PROVIDER = 'libc' TABLESPACE = pg_default CONNECTION LIMIT = -1 IS_TEMPLATE = false;`,
        dbName,
        process.env.DB_USER // or 'postgres' if hardcoded
      );
      await client.query(createDbQuery);
      console.log(`✅ Database "${dbName}" created successfully.`);
    } else {
      console.log(`⚡ Database "${dbName}" already exists.`);
    }

    return true;
  } catch (err) {
    console.error('❌ Error creating database:', err.message);
    return false;
  } finally {
    await client.end();
  }
};

module.exports = { createDatabaseIfNotExists };
