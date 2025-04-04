import express from "express";
import { getChatMessage, getUnreadMessagesController, getUserChat } from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/:roomId", getChatMessage);
router.get("/user/:userId", getUserChat);
router.route("/unread/:userId").get( getUnreadMessagesController);


export default router;
