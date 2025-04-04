import pool from "../config/connectDB.js";

const createSearchHistoryTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS search_history (
      id BIGSERIAL PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
      query TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
};

createSearchHistoryTable();

const saveSearchQuery = async (userId, query) => {
    if (userId) {
        await pool.query(
            `INSERT INTO search_history (user_id, query) VALUES ($1, $2)`,
            [userId, query]
        );
    }
};

export const getRecentSearches = async (userId) => {
    if (!userId) {
        throw new Error("User ID is required to fetch recent searches");
    }

    const result = await pool.query(
        `SELECT * FROM search_history 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT 5`,
        [userId]
    );
    return result.rows;
};

export const deleteRecentSearch = async (searchId, userId) => {
    if (!userId) {
        throw new Error("User ID is required to delete a search");
    }

    const result = await pool.query(
        `DELETE FROM search_history 
     WHERE id = $1 AND user_id = $2 
     RETURNING *`,
        [searchId, userId]
    );
    return result.rows[0];
};

export const searchProducts = async (userId, query) => {
    if (userId) {
        await saveSearchQuery(userId, query);
    }
    const result = await pool.query(
        `SELECT p.*, 
                c.name AS category_name 
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE (p.name ILIKE $1 OR p.description ILIKE $1) 
         AND p.is_approved = TRUE`,
        [`%${query}%`]
    );

    return result.rows;
};
