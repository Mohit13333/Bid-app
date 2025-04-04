import express from "express";
import { toggleFavorite, getFavorites, checkFavorite } from "../controllers/favorite.controller.js";
import { authUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/toggle/:productId").post(authUser, toggleFavorite);
router.route("/getproducts").get(authUser, getFavorites);
router.route("/check/:productId").get(authUser,checkFavorite);

export default router;
