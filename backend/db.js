const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Cloud providers automatically set NODE_ENV to 'production'. 
  // This turns on SSL in the cloud, but keeps it off for your local machine.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = pool;