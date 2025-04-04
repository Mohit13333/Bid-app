import pool from "../config/connectDB.js";

const createPaymentsTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_id VARCHAR(255) UNIQUE NOT NULL,
      order_id VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
    await pool.query(query);
};

await createPaymentsTable();


export const savePayment = async (userId, paymentId, orderId, amount, status) => {
    const query = `
      INSERT INTO payments (user_id, payment_id, order_id, amount, status)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [userId, paymentId, orderId, amount, status]);
} 