import { translateText } from "../config/azureTranslation.js";

export const translate = async (req, res) => {
    try {
        const { text, from, to } = req.body;
        console.log("req.body",req.body)
        if (!text || !from || !to) {
            return res.status(400).json({ message: "Missing required fields: text, from, to" });
        }
        const translatedText = await translateText(text, from, to);
        res.status(200).json({ translatedText });
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json({
                message: "Translation API error",
                error: error.response.data,
            });
        }
        res.status(500).json({ message: "Translation failed", error: error.message });
    }
};
