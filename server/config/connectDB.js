// import pkg from "pg";
// const { Pool } = pkg;
// const pool = new Pool({
//   connectionString:
//     "postgresql://postgres:QaoltNpjeYZlOTZthDLndxlWWLdcOmmq@trolley.proxy.rlwy.net:20984/railway",
//   ssl: { rejectUnauthorized: false },
// });

// // Test connection
// pool.query("SELECT NOW()", (err, res) => {
//   if (err) console.error("Connection error", err);
//   else console.log("Connected to Railway PostgreSQL:", res.rows[0]);
// });

// export default pool;

import pkg from "pg";
import "dotenv/config"
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

export default pool;
