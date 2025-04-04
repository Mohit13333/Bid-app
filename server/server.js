import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.route.js";
import productRouter from "./routes/product.route.js";
import chatRouter from "./routes/chat.route.js";
import adminRouter from "./routes/admin.route.js";
import searchRouter from "./routes/search.route.js";
import notificationRouter from "./routes/notification.route.js";
import categoryRouter from "./routes/category.route.js";
import favoriteRouter from "./routes/favorite.route.js";
import paymentRouter from "./routes/payment.route.js";
import mapRouter from "./routes/map.route.js"
import translationRouter from "./routes/translation.route.js"
import promotionRouter from "./routes/promotion.route.js"
import draftRouter from "./routes/productDraft.route.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import "dotenv/config";
import { getUnreadMessages, markMessagesAsRead, saveChatMessage } from "./models/chat.model.js";
import setupNotificationSocket from "./utils/notification.socket.js";
import pool from "./config/connectDB.js";
import { sendNewMessageNotification } from "./utils/chatEmail.js";

// Create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "https://bid-app-1.onrender.com",
  },
});

app.use(express.json());
app.use(cors({ origin: "https://bid-app-1.onrender.com", credentials: true }));
app.use(cookieParser());
app.use(express.static(join(__dirname, './dist')));
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, './dist', 'index.html'));
});

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/chat", chatRouter);
app.use("/api/admin", adminRouter);
app.use("/api/search", searchRouter)
app.use("/api/notifications", notificationRouter);
app.use("/api/category", categoryRouter);
app.use("/api/favorites", favoriteRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/maps",mapRouter)
app.use("/api/text",translationRouter)
app.use("/api/promotion",promotionRouter)
app.use("/api/draft",draftRouter)

app.get("/", (req, res) => {
  res.end("Hi, I am Mohit Singh");
});

io.on("connection", (socket) => {
  socket.on("joinRoom", async ({ roomId, userId }) => {
    socket.join(roomId);
    await markMessagesAsRead(roomId, userId);
  });

  socket.on("chatMessage", async ({ roomId, sender, message }) => {
    try {
      const savedMessage = await saveChatMessage(roomId, sender, message);
      io.to(roomId).emit("message", {
        sender: savedMessage.sender,
        message: savedMessage.message,
        is_read: savedMessage.is_read,
      });

      const [user1, user2] = roomId.split("_");
      const recipientUserId = sender === user1 ? user2 : user1;

      const userQuery = await pool.query(
        `SELECT 
           u1.email AS recipientEmail, 
           u1.name AS recipientName, 
           u1.phone AS recipientPhone,
           u2.name AS senderName
         FROM users u1 
         JOIN users u2 ON u2.id = $2
         WHERE u1.id = $1`,
        [recipientUserId, sender]
      );
      const userData = userQuery.rows[0];
      console.log(userData.recipientemail)

      if (userData?.recipientemail) {
        await sendNewMessageNotification({
          to: userData.recipientemail,
          sender: userData.sendername,
          message,
          roomId,
        });
      }

      // Fetch the latest unread messages for the recipient
      const unreadMessages = await getUnreadMessages(recipientUserId);

      // Emit the new unread message to the recipient
      io.to(recipientUserId).emit("newUnreadMessage", {
        unreadMessages, // Include the updated unread messages list
      });

      console.log(`Recipient ${recipientUserId} notified about a new unread message`);

      // await notifyUserOnMessage(recipientUserId, sender, message);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("leaveRoom", (roomId) => {
    socket.leave(roomId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

setupNotificationSocket(io);
pool
  .connect()
  .then(() => {
    console.log("Database connected");
    server.listen(process.env.PORT, () => {
      console.log(`Server is running at port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });
