import express from "express";
import { getPromotions, sendPromotion } from "../controllers/promotion.controller.js";
import { authUser } from "../middlewares/auth.middleware.js";
import { authAdmin } from "../middlewares/admin.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.route("/send").post(authUser,authAdmin,upload, sendPromotion); 
router.get("/", getPromotions);       

export default router;
