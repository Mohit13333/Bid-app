import pool from "../config/connectDB.js";

const createNotificationTable = async () => {
  const query = `
        CREATE TABLE IF NOT EXISTS notifications (
            id BIGSERIAL PRIMARY KEY,
            user_id VARCHAR(255),
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `;
  await pool.query(query);
};

createNotificationTable();

export const createNotification = async (userId, message) => {
  const query = userId
    ? `INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *`
    : `INSERT INTO notifications (message) VALUES ($1) RETURNING *`;

  const values = userId ? [userId, message] : [message];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const createGlobalNotification = async (message) => {
  const result = await pool.query(
    `INSERT INTO notifications (message) VALUES ($1) RETURNING *`,
    [message]
  );
  return result.rows[0];
};


export const getNotifications = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM notifications WHERE user_id IS NULL OR user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const markAsRead = async (id) => {
  const result = await pool.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
};

// Delete a notification
export const deleteNotification = async (id) => {
  const result = await pool.query(
    `DELETE FROM notifications WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
};

export const notifyAdminOnProductSale = async (userId, productId, productName) => {
  const message = `User ${userId} has listed a new product (ID: ${productId} - Name: ${productName} for sale.`;
  return createNotification(null, message);
};

export const notifyUserOnProductApproval = async (userId, productId, productName, status, reason) => {
  const statusText = status ? "approved" : "rejected";
  const message = `Your product (ID: ${productId} - Name: ${productName}) has been ${statusText}. ${reason ? `Reason: ${reason}` : ''}`;
  return createNotification(userId, message);
};

export const notifyProductOwnerOnFavorite = async (userId, productId) => {
  try {
    console.log("Received Request - userId:", userId, "productId:", productId);

    const productQuery = await pool.query(
      `SELECT created_by AS "ownerId", name AS "productName" FROM products WHERE id = $1`,
      [productId]
    );


    console.log("Product Query Result:", productQuery.rows);

    if (productQuery.rows.length === 0) {
      console.error("Error: Product not found.");
      throw new Error("Product not found.");
    }

    const { ownerId, productName } = productQuery.rows[0];

    console.log("Product Owner ID:", ownerId, "Favoriting User ID:", userId);

    if (!ownerId) {
      console.warn("Warning: Product has no owner.");
      return null;
    }

    if (ownerId === userId) {
      console.log("No notification needed - User favorited their own product.");
      return null;
    }

    const message = `Your product "${productName}" has been added to favorites by a user.`;

    console.log("Sending Notification to Owner ID:", ownerId, "Message:", message);

    const result = await pool.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *`,
      [ownerId, message]
    );

    console.log("Notification Sent Successfully:", result.rows[0]);

    return result.rows[0];
  } catch (error) {
    console.error("Error in notifyProductOwnerOnFavorite:", error);
    throw new Error("Failed to notify product owner.");
  }
};

export const notifyUsersOnProductUpdate = async (productId, updatedProduct) => {
  try {
    const favoriteUsersQuery = await pool.query(
      `SELECT user_id FROM favorites WHERE product_id = $1`,
      [productId]
    );

    if (favoriteUsersQuery.rows.length === 0) {
      return null;
    }
    const productName = updatedProduct?.name;
    const productPrice = updatedProduct?.price;
    const productType = updatedProduct?.product_type;
    const productDescription = updatedProduct?.description;

    const message = `A product you favorited has been updated! "${productName}" now has new details. Price: ₹${productPrice}, Description: ${productDescription}, Product Type: ${productType}. For more details, check out the product.`;
    const notifications = [];

    for (const row of favoriteUsersQuery.rows) {
      const result = await createNotification(row.user_id, message);
      notifications.push(result);
    }

    return notifications;
  } catch (error) {
    throw new Error("Failed to notify users about product update.");
  }
};

// export const notifyUserOnMessage = async (recipientUserId, senderUserId, messageContent) => {
//   try {
//     const senderQuery = await pool.query(
//       `SELECT name FROM users WHERE id = $1`,
//       [senderUserId]
//     );

//     if (senderQuery.rows.length === 0) {
//       throw new Error("Sender user not found.");
//     }

//     const senderUsername = senderQuery.rows[0].name;

//     const message = `You have received a new message from ${senderUsername}: "${messageContent}"`;
//     const result = await pool.query(
//       `INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *`,
//       [recipientUserId, message]
//     );

//     return result.rows[0];
//   } catch (error) {
//     console.log(error)
//     throw new Error("Failed to notify user about new message.");
//   }
// };