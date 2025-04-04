import {
    addFavorite,
    removeFavorite,
    isFavorite,
    getUserFavorites,
} from "../models/favorite.model.js";
import { decrementFavoriteCount, incrementFavoriteCount } from "../models/product.model.js";

// Toggle favorite
export const toggleFavorite = async (req, res) => {
    const { productId } = req.params;
    const { userId } = req.user;

    try {
        if (!productId) {
            return res.status(400).json({ success: false, error: true, message: "Product ID is required" });
        }

        let message;
        let favoriteCount;
        if (await isFavorite(userId, productId)) {
            await removeFavorite(userId, productId);
            favoriteCount = await decrementFavoriteCount(productId);
            message = "Removed from favorites";
        } else {
            await addFavorite(userId, productId);
            favoriteCount = await incrementFavoriteCount(productId);
            message = "Added to favorites";
        }
        const updatedFavorites = await getUserFavorites(userId);

        return res.status(200).json({
            success: true,
            error: false,
            message,
            favorites: updatedFavorites,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: true, message: error.message });
    }
};


// Get all favorites of a user
export const getFavorites = async (req, res) => {
    const { userId } = req.user;

    try {
        const favorites = await getUserFavorites(userId);
        res.status(200).json({ success: true, error: false, favorites });
    } catch (error) {
        res.status(500).json({ success: false, error: true, message: error.message });
    }
};

export const checkFavorite = async (req, res) => {
    const { productId } = req.params;
    const { userId } = req.user;

    try {
        if (!productId) {
            return res.status(400).json({ success: false, error: true, message: "Product ID is required" });
        }

        const exists = await isFavorite(userId, productId);
        res.status(200).json({
            success: true,
            error: false,
            isFavorite: exists,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: true, message: error.message });
    }
};