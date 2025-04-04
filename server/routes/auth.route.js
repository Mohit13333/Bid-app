import express from "express";
import {
  register,
  login,
  logout,
  getUserById,
  getUser,
  checkUser,
  upgradePlan,
  checkAdvertisementLimit,
  postAdvertisement,
  requestEmailVerification,
  verifyEmail,
  getOtherUserProfile,
} from "../controllers/auth.controller.js";
import { authUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/signup").post(register);
router.route("/login").post(login);
router.route("/logout").post(authUser, logout);
router.route("/check-user").post(checkUser);
router.route("/getuser").post(getUserById);
router.route("/getuserbyid").get(authUser, getUser)
router.route("/upgrade-plan").post(authUser, upgradePlan);
router.route("/check-ad-limit").post(authUser, checkAdvertisementLimit);
router.route("/post-advertisement").post(authUser, postAdvertisement);
router.route("/request-email-verification").post(requestEmailVerification);
router.route("/verify-email").get(verifyEmail);
router.route("/getotheruser/:userId").get(getOtherUserProfile);

export default router;