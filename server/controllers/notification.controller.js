import {
    createNotification,
    getNotifications,
    markAsRead,
    deleteNotification,
    notifyUserOnProductApproval,
    notifyAdminOnProductSale,
    notifyProductOwnerOnFavorite,
} from '../models/notification.model.js';
import jwt from "jsonwebtoken";

export const sendNotification = async (req, res) => {
    try {
        const { userId, message } = req.body;
        const notification = await createNotification(userId, message);
        return res.status(201).json({
            success: true,
            error: false,
            message: "Notification sent successfully.",
            notification,
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to send notification.",
        });
    }
};

export const getUserNotifications = async (req, res) => {
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
        const notifications = await getNotifications(userId);
        return res.status(200).json({
            success: true,
            error: false,
            message: "Notifications retrieved successfully.",
            notifications,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to retrieve notifications.",
        });
    }
};

export const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: true,
                message: "Notification ID is required.",
            });
        }
        const notifications = await markAsRead(id);
        return res.status(200).json({
            success: true,
            error: false,
            notifications,
            message: "Notification marked as read successfully.",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to mark notification as read.",
        });
    }
};


export const deleteNotificationById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                error: true,
                message: "Notification ID is required.",
            });
        }
        const notifications = await deleteNotification(id);
        return res.status(200).json({
            success: true,
            error: false,
            notifications,
            message: "Notification deleted successfully.",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to delete notification.",
        });
    }
};

export const notifyAdmin = async (req, res) => {
    try {
        const { userId, productId, productName } = req.body;

        const notification = await notifyAdminOnProductSale(userId, productId, productName)

        return res.status(201).json({
            success: true,
            error: false,
            message: "Admin notified about the new product sale.",
            notification,
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to notify admin.",
        });
    }
};

export const notifyUserOnApproval = async (req, res) => {
    try {
        const { userId, productId, productName, status, reason } = req.body;

        if (!userId || !productId || !productName || status === undefined) {
            return res.status(400).json({
                success: false,
                error: true,
                message: "User ID, Product ID, Product Name, and Status are required.",
            });
        }
        const notification = await notifyUserOnProductApproval(userId, productId, productName, status, reason);

        return res.status(201).json({
            success: true,
            error: false,
            message: "User notified about product approval/rejection.",
            notification,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to notify user.",
        });
    }
};

// ✅ Send universal notification to all users
export const sendUniversalNotification = async (req, res) => {
    try {
        const { message } = req.body;

        const notification = await createNotification(null, message);

        return res.status(201).json({
            success: true,
            error: false,
            message: "Universal notification sent to all users.",
            notification,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to send universal notification.",
        });
    }
};

export const sendFavoriteNotification = async (req, res) => {
    try {
        const { productId } = req.body;
        const { userId } = req.user;

        if (!userId || !productId) {
            return res.status(400).json({
                success: false,
                error: true,
                message: "User ID and Product ID are required.",
            });
        }

        const notification = await notifyProductOwnerOnFavorite(userId, productId);

        if (!notification) {
            return res.status(200).json({
                success: true,
                error: false,
                message: "No notification needed (self-favoriting or product not found).",
            });
        }

        return res.status(201).json({
            success: true,
            error: false,
            message: "Product owner notified about the favorite action.",
            notification,
        });

    } catch (error) {
        console.error("Error notifying product owner on favorite:", error);
        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to send favorite notification.",
        });
    }
};
