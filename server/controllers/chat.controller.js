import {
  getChatMessages,
  getOtherUser,
  getUnreadMessages,
  getUserChats,
} from "../models/chat.model.js";

export const getChatMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await getChatMessages(roomId);
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserChat = async (req, res) => {
  const { userId } = req.params;
  try {
    const chats = await getUserChats(userId);

    const chatDetails = await Promise.all(
      chats.map(async (chat) => {
        const [user1, user2] = chat.room_id.split("_");
        const otherUserId = userId === user1 ? user2 : user1;
        const otherUser = await getOtherUser(otherUserId);
        return {
          roomId: chat.room_id,
          lastMessage: chat.last_message,
          otherUserName: otherUser ? otherUser.name : 'Unknown',
        };
      })
    );

    res.status(200).json(chatDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadMessagesController = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "UserId is required", error: true, success: false });
    }

    const unreadMessages = await getUnreadMessages(userId);
    res.status(200).json({ unreadMessages, success: true, error: false });
  } catch (error) {
    console.error("Error fetching unread messages:", error);
    res.status(500).json({ message: error.message, error: true, success: false });
  }
};