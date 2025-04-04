import {
    getRecentSearches,
    deleteRecentSearch,
    searchProducts,
} from "../models/search.model.js";
import "dotenv/config";
import jwt from "jsonwebtoken";

export const searchProduct = async (req, res) => {
    try {
        const token = req.cookies.access_token || req.headers.authorization?.split(" ")[1];
        let userId = null;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.userId;
            } catch (error) {
                console.log("Invalid token:", error.message);
            }
        }

        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ message: "Search query is required", error: true, success: false });
        }

        const products = await searchProducts(userId, query);

        return res.status(200).json({ products, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: true, success: false });
    }
};



export const getRecentSearch = async (req, res) => {
    try {
        const { userId } = req.user;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized", error: true, success: false });
        }
        const searches = await getRecentSearches(userId);
        return res.status(200).json({ searches, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: true, success: false });
    }
};

export const deleteRecentSearches = async (req, res) => {
    try {
        const { userId } = req.user;
        const { searchId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized", error: true, success: false });
        }

        const deletedSearch = await deleteRecentSearch(searchId, userId);

        if (!deletedSearch) {
            return res.status(404).json({ message: "Search record not found", error: true, success: false });
        }

        return res.status(200).json({ message: "Search deleted successfully", error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: true, success: false });
    }
};
