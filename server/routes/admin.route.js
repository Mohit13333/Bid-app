import express from "express";
import { approveProductController } from "../controllers/product.controller.js";
import { authUser } from "../middlewares/auth.middleware.js";
import { authAdmin } from "../middlewares/admin.middleware.js";
import { getAllUser } from "../controllers/auth.controller.js";


const router = express.Router();

router.route("/approve/:id").patch(authUser, authAdmin, approveProductController);
router.route("/getallusers").get(authUser, authAdmin, getAllUser);


export default router;