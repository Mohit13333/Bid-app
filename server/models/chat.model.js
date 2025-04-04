import pool from "../config/connectDB.js";
import cron from "node-cron";

// Create Chats Table
const createChatTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS chats (
        id BIGSERIAL PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL,
        sender VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delete_after TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE
    )`;
  await pool.query(query);
};

createChatTable();

//Craete chat
export const saveChatMessage = async (roomId, sender, message) => {

  const userResult = await pool.query(
    "SELECT plan_type FROM users WHERE id = $1",
    [sender]
  );
  const userPlan = userResult.rows[0]?.plan_type;

  let deleteAfter = null;
  if (userPlan === "free") {
    deleteAfter = new Date();
    deleteAfter.setDate(deleteAfter.getDate() + 15);
  }

  const result = await pool.query(
    "INSERT INTO chats (room_id, sender, message, delete_after, is_read) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [roomId, sender, message, deleteAfter, false]
  );
  return result.rows[0];
};

// Fetch chat messages by room ID
export const getChatMessages = async (roomId, userId) => {
  const result = await pool.query(
    `SELECT *, sender != $2 AS is_unread 
     FROM chats 
     WHERE room_id = $1 AND (delete_after IS NULL OR delete_after > NOW())
     ORDER BY created_at ASC`,
    [roomId, userId]
  );
  return result.rows;
};

// Fetch user chats (List of Conversations)
export const getUserChats = async (userId) => {
  const result = await pool.query(
    `SELECT room_id, 
            MAX(message) AS last_message, 
            MAX(sender) AS sender, 
            MAX(created_at) AS created_at, 
            COUNT(*) FILTER (WHERE is_read = FALSE AND sender != $1) AS unread_count
     FROM chats 
     WHERE room_id LIKE $2 AND (delete_after IS NULL OR delete_after > NOW())
     GROUP BY room_id
     ORDER BY MAX(created_at) DESC`,
    [userId, `%${userId}%`]
  );
  return result.rows;
};

// Fetch other user details
export const getOtherUser = async (otherUserId) => {
  const result = await pool.query("SELECT name FROM users WHERE id = $1", [
    otherUserId,
  ]);
  return result.rows[0];
};

// delete chat in free plan after 15 days
export const deleteExpiredChats = async () => {
  try {
    const result = await pool.query(
      "DELETE FROM chats WHERE delete_after IS NOT NULL AND delete_after <= NOW()"
    );
    console.log(`Deleted ${result.rowCount} expired chat messages.`);
  } catch (error) {
    console.error("Error deleting expired chats:", error);
  }
};

cron.schedule("0 0 * * *", deleteExpiredChats, {
  scheduled: true,
  timezone: "UTC",
});

export const markMessagesAsRead = async (roomId, userId) => {
  await pool.query(
    `UPDATE chats 
     SET is_read = TRUE 
     WHERE room_id = $1 AND sender != $2 AND is_read = FALSE`,
    [roomId, userId]
  );
};

export const getUnreadMessages = async (userId) => {
  console.log("Fetching unread messages for userId:", userId);
  const result = await pool.query(
    `SELECT * FROM chats 
     WHERE room_id LIKE $1 
       AND sender != $2 
       AND is_read = FALSE
     ORDER BY created_at ASC`,
    [`%${userId}%`, userId]
  );
  return result.rows;
};

// console.log("user chts",await getUnreadMessages("Zydl4rLwMrM80xOFkRpZtoTRpDs1"));