import express from "express";
import {
    createOrder,
    verifyPayment,
    handleWebhook,
    buyPremiumWithBidCreditsController,
} from "../controllers/payment.controller.js";
import { authUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create-order", authUser, createOrder);
router.post("/verify-payment", authUser, verifyPayment);
router.post("/webhook", handleWebhook);
router.route("/buy-premium-with-bidcredits").post(authUser,buyPremiumWithBidCreditsController)

export default router;