import pool from '../config/connectDB.js';

// Create Category Table
export const createCategoryTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS categories (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL
        )`;
    await pool.query(query);
};

createCategoryTable();

// Create Category
export const createCategory = async (name) => {
    const query = 'INSERT INTO categories (name) VALUES ($1) RETURNING *';
    const values = [name];
    const result = await pool.query(query, values);
    return result.rows[0];
};

// Get All Categories
export const getCategories = async () => {
    const query = 'SELECT * FROM categories';
    const result = await pool.query(query);
    return result.rows;
};

// // Get Category by ID
// export const getCategoryById = async (id) => {
//     const query = 'SELECT * FROM categories WHERE id = $1';
//     const values = [id];
//     const result = await pool.query(query, values);
//     return result.rows[0];
// };

// Update Category
export const updateCategory = async (id, name) => {
    const query = 'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *';
    const values = [name, id];
    const result = await pool.query(query, values);
    return result.rows[0];
};

// Delete Category
export const deleteCategory = async (id) => {
    const query = 'DELETE FROM categories WHERE id = $1 RETURNING *';
    const values = [id];
    const result = await pool.query(query, values);
    return result.rows[0];
};
