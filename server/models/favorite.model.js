import pool from "../config/connectDB.js";

// Create Favorites Table
const createFavoriteTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS favorites (
        id BIGSERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
    )`;
    await pool.query(query);
};

createFavoriteTable();

// Add to favorites
export const addFavorite = async (userId, productId) => {
    const result = await pool.query(
        "INSERT INTO favorites (user_id, product_id) VALUES ($1, $2) RETURNING *",
        [userId, productId]
    );
    return result.rows[0];
};

// Remove from favorites
export const removeFavorite = async (userId, productId) => {
    await pool.query("DELETE FROM favorites WHERE user_id = $1 AND product_id = $2", [
        userId,
        productId,
    ]);
};

// Check if a product is already a favorite
export const isFavorite = async (userId, productId) => {
    const result = await pool.query(
        "SELECT * FROM favorites WHERE user_id = $1 AND product_id = $2",
        [userId, productId]
    );
    return result.rows.length > 0;
};

export const getUserFavorites = async (userId) => {
    const result = await pool.query(
        `SELECT products.* FROM products 
     JOIN favorites ON products.id = favorites.product_id 
     WHERE favorites.user_id = $1`,
        [userId]
    );
    return result.rows;
};
