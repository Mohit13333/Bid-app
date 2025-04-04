import pool from "../config/connectDB.js";
import cron from "node-cron";

// **1. Create OTP Requests Table**
const createOtpTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS otp_requests (
        id BIGSERIAL PRIMARY KEY,
        phone VARCHAR(15) NOT NULL,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
    await pool.query(query);
};

createOtpTable();

export const saveOtpRequest = async (phone) => {
    console.log(phone)
    const result = await pool.query(
        "INSERT INTO otp_requests (phone) VALUES ($1) RETURNING *",
        [phone]
    );
    return result.rows[0];
};

export const checkOtpLimit = async (phone) => {
    const { rows } = await pool.query(
        `SELECT COUNT(*) FROM otp_requests 
     WHERE phone = $1 AND requested_at >= NOW() - INTERVAL '2 hours'`,
        [phone]
    );
    return parseInt(rows[0].count) >= 100000;
};

export const deleteExpiredOtps = async () => {
    await pool.query(
        "DELETE FROM otp_requests WHERE requested_at <= NOW() - INTERVAL '2 hours'"
    );
};

cron.schedule("0 */2 * * *", deleteExpiredOtps, {
    scheduled: true,
    timezone: "UTC",
});
