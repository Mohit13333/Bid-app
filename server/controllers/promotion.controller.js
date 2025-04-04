import uploadOnCloudinary from "../config/cloudinary.js";
import { createPromotion, getAllPromotions } from "../models/promotion.model.js";
export const sendPromotion = async (req, res) => {
    try {
        const { title, message } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: "Title and message are required" });
        }
        const imageUrl =
        req.files?.length > 0
          ? await uploadOnCloudinary(req.files.map((file) => file.path))
          : [];

        const promotion = await createPromotion(title, message, imageUrl);

        res.status(201).json({ message: "Promotion sent successfully", promotion });
    } catch (err) {
        console.error("Error sending promotion:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

export const getPromotions = async (req, res) => {
    try {
        const promotions = await getAllPromotions();
        res.status(200).json(promotions);
    } catch (err) {
        console.error("Error fetching promotions:", err);
        res.status(500).json({ error: "Server Error" });
    }
};