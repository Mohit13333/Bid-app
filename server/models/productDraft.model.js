import pool from "../config/connectDB.js";

// Ensure the product_drafts table exists
const productDraftTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS product_drafts (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255),
            description TEXT,
            price NUMERIC(12, 2) default null,
            images TEXT[],
            category_id INTEGER,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            product_type VARCHAR(100),
            brands VARCHAR(100),
            model VARCHAR(100),
            variant VARCHAR(100),
            year INTEGER,
            fuel_type VARCHAR(50),
            transmission VARCHAR(50),
            km_driven INTEGER,
            no_of_owners INTEGER,
            sell_type VARCHAR(50),
            salary_start NUMERIC(12, 2) default null,
            salary_end NUMERIC(12, 2) default null,
            status VARCHAR(50),
            industry VARCHAR(100),
            type VARCHAR(50),
            salary_period VARCHAR(50),
            address TEXT,
            subcategory VARCHAR(100),
            profession VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id)
        )`;
    await pool.query(query);
};

productDraftTable();

export const saveProductDraft = async (
    user_id,
    name,
    description,
    price = null,
    images,
    category_id,
    latitude,
    longitude,
    product_type,
    brands,
    model,
    variant,
    year,
    fuel_type,
    transmission,
    km_driven,
    no_of_owners,
    sell_type,
    salary_start = null,
    salary_end = null,
    status,
    industry,
    type,
    salary_period,
    address,
    subcategory,
    profession
) => {
    const clean = (val) => (val === "" ? null : val);
    const query = `
        INSERT INTO product_drafts (
            user_id, name, description, price, images, category_id,
            latitude, longitude, product_type, brands, model, variant,
            year, fuel_type, transmission, km_driven, no_of_owners,
            sell_type, salary_start, salary_end, status, industry,
            type, salary_period, address, subcategory, profession
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
                $23, $24, $25, $26, $27)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            images = EXCLUDED.images,
            category_id = EXCLUDED.category_id,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            product_type = EXCLUDED.product_type,
            brands = EXCLUDED.brands,
            model = EXCLUDED.model,
            variant = EXCLUDED.variant,
            year = EXCLUDED.year,
            fuel_type = EXCLUDED.fuel_type,
            transmission = EXCLUDED.transmission,
            km_driven = EXCLUDED.km_driven,
            no_of_owners = EXCLUDED.no_of_owners,
            sell_type = EXCLUDED.sell_type,
            salary_start = EXCLUDED.salary_start,
            salary_end = EXCLUDED.salary_end,
            status = EXCLUDED.status,
            industry = EXCLUDED.industry,
            type = EXCLUDED.type,
            salary_period = EXCLUDED.salary_period,
            address = EXCLUDED.address,
            subcategory = EXCLUDED.subcategory,
            profession = EXCLUDED.profession,
            updated_at = NOW()
        RETURNING *`;

    const result = await pool.query(query, [
        user_id, name, description, clean(price), images, category_id,
        latitude, longitude, product_type, brands, model, variant,
        year, fuel_type, transmission, km_driven, no_of_owners,
        sell_type, clean(salary_start),
        clean(salary_end),
        status, industry,
        type, salary_period, address, subcategory, profession
    ]);

    return result.rows[0];
};

export const getProductDraftByUserId = async (userId) => {
    const result = await pool.query(
        'SELECT * FROM product_drafts WHERE user_id = $1',
        [userId]
    );
    return result.rows[0];
};

export const deleteProductDraft = async (userId) => {
    const result = await pool.query(
        'DELETE FROM product_drafts WHERE user_id = $1 RETURNING *',
        [userId]
    );
    return result.rows[0];
};