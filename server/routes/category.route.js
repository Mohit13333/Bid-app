import express from "express";
import { authUser } from "../middlewares/auth.middleware.js";
import { authAdmin } from "../middlewares/admin.middleware.js";
import { createCategories, deleteCategoryById, getAllCategories } from "../controllers/category.controller.js";

const router = express.Router();


router.route("/create").post(authUser, authAdmin, createCategories);
router.route("/delete/:id").delete(authUser, authAdmin, deleteCategoryById);
router.route("/get").get(getAllCategories);


export default router;