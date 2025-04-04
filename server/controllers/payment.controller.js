import Razorpay from "razorpay";
import crypto from "crypto";
import "dotenv/config";
import { savePayment } from "../models/payment.model.js";
import { buyPremiumWithBidCredits, findUserById, rewardForSubscription, upgradeToPremiumPlan } from "../models/user.model.js";
import { error } from "console";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
export const createOrder = async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const { userId } = req.user;
        const user = await findUserById(userId);

        // const { plan_type, plan_end_date, ads_posted_in_current_period, max_ads_allowed } = user;
        // const currentDate = new Date();

        // if (plan_type !== "free monthly" && new Date(plan_end_date) > currentDate && ads_posted_in_current_period < max_ads_allowed) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "You cannot purchase a new plan until your current plan expires or ad limit is reached."
        //     });
        // }
        const options = {
            amount: amount * 100,
            currency,
            receipt: `receipt_${Date.now()}`,
            notes: {
                userId: userId,
            },
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Verify Payment
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
        const { userId } = req.user;

        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature === razorpay_signature) {
            // await savePayment(userId, razorpay_payment_id, razorpay_order_id, amount, "captured");
            // Upgrade the plan based on amount
            // if (amount === 49) {
            //     await upgradeToPremiumPlan(userId, "49");
            // } else if (amount === 99) {
            //     await upgradeToPremiumPlan(userId, "99");
            // } else if (amount === 149) {
            //     await upgradeToPremiumPlan(userId, "149");
            // } else if (amount === 199) {
            //     await upgradeToPremiumPlan(userId, "199");
            // }
            await rewardForSubscription(userId)
            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            await savePayment(userId, razorpay_payment_id, razorpay_order_id, 500, "failed");
            res.status(400).json({ success: false, message: "Invalid payment signature" });
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, error: error.message });
    }
};

// Webhook Handler
export const handleWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const receivedSignature = req.headers["x-razorpay-signature"];
        const generatedSignature = crypto
            .createHmac("sha256", secret)
            .update(JSON.stringify(req.body))
            .digest("hex");

        if (receivedSignature === generatedSignature) {
            const event = req.body.event;
            const payment = req.body.payload.payment.entity;
            const amount = payment.amount / 100;
            const userId = payment.notes?.userId;
            console.log("webhook", payment.amount)


            if (event === "payment.captured") {
                await savePayment(userId, payment.id, payment.order_id, amount, "captured");

                // Upgrade the plan based on amount
                if (amount === 49) {
                    await upgradeToPremiumPlan(userId, "49");
                } else if (amount === 99) {
                    await upgradeToPremiumPlan(userId, "99");
                } else if (amount === 149) {
                    await upgradeToPremiumPlan(userId, "149");
                } else if (amount === 199) {
                    await upgradeToPremiumPlan(userId, "199");
                }
            } else if (event === "payment.failed") {
                await savePayment(userId, payment.id, payment.order_id, amount, "failed");
            }

            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Buy premium with bid credits
export const buyPremiumWithBidCreditsController = async (req, res) => {
    const { planType } = req.body;
    const { userId } = req.user;

    if (!userId || !planType) {
        return res.status(400).json({
            success: false,
            message: "userId and planType are required.",
            error: true
        });
    }

    try {
        const updatedUser = await buyPremiumWithBidCredits(userId, planType);

        return res.status(200).json({
            success: true,
            error: false,
            message: "Plan purchased successfully using bid credits.",
            data: updatedUser,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: true,
            message: error.message,
        });
    }
};