import pool from '../config/connectDB.js';
import { getRecentSearches } from './search.model.js';
import { canPostAdvertisement, decrementMaxAdsCount, incrementAdvertisementCount, markFirstItemUploaded } from './user.model.js';

// Create products table
const createProductTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price VARCHAR(255) NOT NULL,
      images TEXT[] NOT NULL,
      category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      created_by VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
      is_approved BOOLEAN DEFAULT NULL,
      badge VARCHAR(50) DEFAULT NULL,
      product_type VARCHAR(70) NOT NULL,
      posted_date DATE DEFAULT CURRENT_DATE,
      valid_until_date DATE DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
      is_active BOOLEAN DEFAULT TRUE,
      view_count INT DEFAULT 0,
      favorite_count INT DEFAULT 0
    )`;
  await pool.query(query);
};

createProductTable();

// Create product (advertisement)
export const createProduct = async (
  name,
  description,
  price,
  images,
  categoryId,
  latitude,
  longitude,
  createdBy,
  badge = null,
  product_type
) => {
  // Check if the user can post an advertisement
  const { canPost, reason } = await canPostAdvertisement(createdBy);
  if (!canPost) {
    throw new Error(reason);
  }

  // Create the product (advertisement)
  const result = await pool.query(
    `INSERT INTO products (
      name, description, price, images, category_id, latitude, longitude, 
      created_by, is_approved, badge, product_type, posted_date, valid_until_date, view_count, favorite_count
    ) 
    VALUES ($1, $2, $3, $4::TEXT[], $5, $6, $7, $8, NULL, $9, $10, CURRENT_DATE, CURRENT_DATE + INTERVAL '15 days', 0, 0) 
    RETURNING *`,
    [name, description, price, images, categoryId, latitude, longitude, createdBy, badge, product_type]
  );

  await markFirstItemUploaded(createdBy);
  await incrementAdvertisementCount(createdBy);
  await decrementMaxAdsCount(createdBy);

  return result.rows[0];
};

// Get product by ID
export const getProductById = async (id) => {
  const result = await pool.query(
    `SELECT p.*,
            c.name AS category_name,
            u.email AS created_by_email, 
            COALESCE(u.phone, '') AS created_by_phone 
     FROM products p 
     JOIN categories c ON p.category_id = c.id
     JOIN users u ON p.created_by = u.id 
     WHERE p.id = $1 AND p.is_approved = TRUE`,
    [id]
  );
  return result.rows[0];
};

// Get product by user ID
export const getProductByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM products WHERE created_by = $1`,
    [userId]
  );
  return result.rows;
};

// Get products by category
export const getProductsByCategory = async (categoryId) => {
  const result = await pool.query(
    `SELECT p.*, 
            c.name AS category_name,
            u.email AS created_by_email, 
            COALESCE(u.phone, '') AS created_by_phone 
     FROM products p 
     JOIN categories c ON p.category_id = c.id
     JOIN users u ON p.created_by = u.id
     WHERE p.category_id = $1 AND p.is_approved = TRUE`,
    [categoryId]
  );
  return result.rows;
};

// Get all products
export const getAllProducts = async (
  userId,
  sortBy = "posted_date",
  sortOrder = "DESC",
  filters = {}
) => {
  const { priceRange, categoryIds, latitude, longitude, maxDistance } = filters;

  let orderClause = "";
  let filterClause = "";
  let queryParams = [];
  let paramIndex = 1;

  // Check if the user is an admin
  let isAdmin = false;
  if (userId) {
    const userResult = await pool.query(`SELECT role FROM users WHERE id = $1`, [userId]);
    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }
    const user = userResult.rows[0];
    isAdmin = user.role === "admin";
  }

  // Sorting logic
  if (sortBy === "price") {
    orderClause = `ORDER BY p.price ${sortOrder}`; // Directly sort by price with the specified order
  } else if (sortBy === "category") {
    orderClause = `ORDER BY c.name ${sortOrder}`;
  } else if (sortBy === "location" && latitude && longitude && maxDistance) {
    orderClause = `ORDER BY distance ${sortOrder}`;
  } else {
    orderClause = `ORDER BY p.posted_date ${sortOrder}`;
  }

  // Filtering logic
  const filterConditions = [];

  if (priceRange && priceRange.min !== undefined && priceRange.max !== undefined) {
    filterConditions.push(`p.price BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
    queryParams.push(priceRange.min, priceRange.max);
    paramIndex += 2;
  }

  if (categoryIds && categoryIds.length > 0) {
    const categoryPlaceholders = categoryIds.map(() => `$${paramIndex++}`).join(",");
    filterConditions.push(`p.category_id IN (${categoryPlaceholders})`);
    queryParams.push(...categoryIds);
  }

  let distanceClause = "";
  if (latitude && longitude && maxDistance) {
    distanceClause = `, (6371 * acos(
      cos(radians($${paramIndex})) * cos(radians(p.latitude)) * 
      cos(radians(p.longitude) - radians($${paramIndex + 1})) + 
      sin(radians($${paramIndex})) * sin(radians(p.latitude))
    )) AS distance`;
    filterConditions.push(`(6371 * acos(
      cos(radians($${paramIndex})) * cos(radians(p.latitude)) * 
      cos(radians(p.longitude) - radians($${paramIndex + 1})) + 
      sin(radians($${paramIndex})) * sin(radians(p.latitude))
    )) <= $${paramIndex + 2}`);
    queryParams.push(latitude, longitude, maxDistance);
    paramIndex += 3;
  }

  if (filterConditions.length > 0) {
    filterClause = `AND ${filterConditions.join(" AND ")}`;
  }

  // Base query for admin (no restrictions on is_approved or is_active)
  let baseQuery = `
    SELECT p.*, 
           c.name AS category_name,
           u.email AS created_by_email, 
           COALESCE(u.phone, '') AS created_by_phone
           ${distanceClause}
    FROM products p 
    JOIN categories c ON p.category_id = c.id
    JOIN users u ON p.created_by = u.id
    WHERE 1=1`;

  // Add filters for non-admin users
  if (!isAdmin) {
    baseQuery += ` AND p.is_approved = TRUE AND p.is_active = TRUE`;
  }

  // Append filter and order clauses
  baseQuery += ` ${filterClause} ${orderClause}`;

  const result = await pool.query(baseQuery, queryParams);
  return result.rows;
};
// Update product
export const updateProduct = async (
  id,
  name,
  description,
  price,
  images,
  categoryId,
  latitude,
  longitude,
  badge,
  product_type
) => {
  const result = await pool.query(
    `UPDATE products 
     SET name = $1, 
         description = $2, 
         price = $3, 
         images = COALESCE($4, images), 
         category_id = $5, 
         latitude = $6, 
         longitude = $7, 
         badge = COALESCE($8, badge), 
         product_type = $9
     WHERE id = $10 
     RETURNING *`,
    [name, description, price, images, categoryId, latitude, longitude, badge, product_type, id]
  );
  return result.rows[0];
};

// Delete product
export const deleteProduct = async (id) => {
  const result = await pool.query(
    "DELETE FROM products WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows[0];
};

// Get nearby products
export const getNearbyProducts = async (latitude, longitude) => {
  const maxDistance = 20;

  const result = await pool.query(
    `SELECT * FROM (
      SELECT p.*, 
             c.name AS category_name,
             (6371 * acos(
                 cos(radians($1)) * cos(radians(latitude)) * 
                 cos(radians(longitude) - radians($2)) + 
                 sin(radians($1)) * sin(radians(latitude))
             )) AS distance
      FROM products p
      JOIN categories c ON p.category_id = c.id 
      WHERE p.is_approved = TRUE
    ) AS subquery
    WHERE distance <= $3
    ORDER BY distance ASC`,
    [latitude, longitude, maxDistance]
  );

  return result.rows;
};

// Approve product
export const approveProduct = async (productId, status) => {
  const result = await pool.query(
    `UPDATE products SET is_approved = $1 WHERE id = $2 RETURNING *`,
    [status, productId]
  );
  return result.rows[0];
};

// Deactivate expired advertisements
export const deactivateExpiredAdvertisements = async () => {
  const result = await pool.query(
    `UPDATE products 
     SET is_active = FALSE 
     WHERE valid_until_date < CURRENT_DATE AND is_active = TRUE`
  );
  return result.rowCount;
};

// export const getSuggestedProducts = async (userId) => {
//   const recentSearches = await getRecentSearches(userId);
//   const searchTerms = recentSearches.map((search) => search.query);
//   let suggestedProducts = [];
//   if (searchTerms.length > 0) {
//     const orConditions = searchTerms
//       .map((_, index) => `(p.name ILIKE $${index + 1} OR p.description ILIKE $${index + 1})`)
//       .join(" OR ");

//     const searchQuery = `
//           SELECT p.*, 
//                  c.name AS category_name,
//                  u.email AS created_by_email, 
//                  COALESCE(u.phone, '') AS created_by_phone 
//           FROM products p 
//           JOIN categories c ON p.category_id = c.id
//           JOIN users u ON p.created_by = u.id
//           WHERE p.is_approved = TRUE 
//             AND p.is_active = TRUE 
//             AND (${orConditions})
//           ORDER BY p.posted_date DESC 
//           LIMIT 10`;

//     const searchPatterns = searchTerms.map((term) => `%${term}%`);
//     const searchResult = await pool.query(searchQuery, searchPatterns);
//     suggestedProducts = searchResult.rows;
//   }
//   const freshProductsResult = await pool.query(
//     `SELECT p.*, 
//               c.name AS category_name,
//               u.email AS created_by_email, 
//               COALESCE(u.phone, '') AS created_by_phone 
//        FROM products p 
//        JOIN categories c ON p.category_id = c.id
//        JOIN users u ON p.created_by = u.id
//        WHERE p.is_approved = TRUE 
//          AND p.is_active = TRUE 
//        ORDER BY p.posted_date DESC 
//        LIMIT 10`
//   );

//   const freshProducts = freshProductsResult.rows;
//   const combinedProducts = [...suggestedProducts, ...freshProducts];
//   const uniqueProducts = Array.from(new Set(combinedProducts.map((product) => product.id)))
//     .map((id) => combinedProducts.find((product) => product.id === id));
//   const shuffledProducts = shuffleArray(uniqueProducts);

//   return shuffledProducts;
// };
// const shuffleArray = (array) => {
//   for (let i = array.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [array[i], array[j]] = [array[j], array[i]];
//   }
//   return array;
// };

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const getSuggestedProducts = async (userId) => {
  let suggestedProducts = [];

  // Fetch suggested products based on recent searches if userId is available
  if (userId) {
    const recentSearches = await getRecentSearches(userId);
    const searchTerms = recentSearches.map((search) => search.query);

    if (searchTerms.length > 0) {
      const orConditions = searchTerms
        .map((_, index) => `(p.name ILIKE $${index + 1} OR p.description ILIKE $${index + 1})`)
        .join(" OR ");

      const searchQuery = `
        SELECT p.*, 
               c.name AS category_name,
               u.email AS created_by_email, 
               COALESCE(u.phone, '') AS created_by_phone 
        FROM products p 
        JOIN categories c ON p.category_id = c.id
        JOIN users u ON p.created_by = u.id
        WHERE p.is_approved = TRUE 
          AND p.is_active = TRUE 
          AND (${orConditions})
        ORDER BY p.posted_date DESC 
        LIMIT 10`;

      const searchPatterns = searchTerms.map((term) => `%${term}%`);
      const searchResult = await pool.query(searchQuery, searchPatterns);
      suggestedProducts = searchResult.rows;
    }
  }

  // Fetch fresh products sorted by posted_date
  const freshProductsResult = await pool.query(
    `SELECT p.*, 
              c.name AS category_name,
              u.email AS created_by_email, 
              COALESCE(u.phone, '') AS created_by_phone 
       FROM products p 
       JOIN categories c ON p.category_id = c.id
       JOIN users u ON p.created_by = u.id
       WHERE p.is_approved = TRUE 
         AND p.is_active = TRUE 
       ORDER BY p.posted_date DESC 
       LIMIT 10`
  );

  const freshProducts = freshProductsResult.rows;

  const combinedProducts = [...suggestedProducts, ...freshProducts];

  const uniqueProducts = Array.from(new Set(combinedProducts.map((product) => product.id)))
    .map((id) => combinedProducts.find((product) => product.id === id));

  const shuffledProducts = shuffleArray(uniqueProducts);

  return shuffledProducts;
};

const results=await getSuggestedProducts();
// console.log(results)


// Increment product view count
export const incrementProductViewCount = async (productId) => {

  const result = await pool.query(
    `UPDATE products 
     SET view_count = view_count + 1 
     WHERE id = $1 
     RETURNING view_count`,
    [productId]
  );
  return result.rows[0];
};

export const incrementFavoriteCount = async (productId) => {
  const result = await pool.query(
    `UPDATE products 
     SET favorite_count = favorite_count + 1 
     WHERE id = $1 
     RETURNING favorite_count`,
    [productId]
  );
  return result.rows[0];
};

export const decrementFavoriteCount = async (productId) => {
  const result = await pool.query(
    `UPDATE products 
     SET favorite_count = GREATEST(favorite_count - 1, 0) 
     WHERE id = $1 
     RETURNING favorite_count`,
    [productId]
  );
  return result.rows[0];
};

// const suggestedProducts = await getSuggestedProducts("Zydl4rLwMrM80xOFkRpZtoTRpDs1");
// console.log(suggestedProducts);
// console.log(suggestedProducts.length)