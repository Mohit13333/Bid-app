import pool from "../config/connectDB.js";

// Ensure the promotions table exists
export const promotionTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS promotions (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            image TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`;
    await pool.query(query);
};

promotionTable();

export const createPromotion = async (title, message, image) => {
    const newPromo = await pool.query(
        "INSERT INTO promotions (title, message, image) VALUES ($1, $2, $3) RETURNING *",
        [title, message, image]
    );
    return newPromo.rows[0];
};

export const getAllPromotions = async () => {
    const promotions = await pool.query("SELECT * FROM promotions ORDER BY created_at DESC");
    return promotions.rows;
};
