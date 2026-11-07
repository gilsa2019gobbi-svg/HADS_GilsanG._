
// INICIO - CONEXÃO POSTGRESQL - MSBARBEARIAS

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000
});

module.exports = pool;

// FIM - CONEXÃO POSTGRESQL
