import { findUserById } from "../models/user.model.js";

export const authAdmin = async (req, res, next) => {
  try {
    const { userId } = req.user;

    if (!userId) {
      return res.status(403).json({ message: "User ID not found" });
    }

    const user = await findUserById(userId);

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Permission denied: Admin role required",
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({ message: "Access denied" });
  }
};
