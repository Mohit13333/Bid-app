import express from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createProductController,
  deactivateExpiredAdvertisementsController,
  deleteProductController,
  generateListing,
  getAllProductsController,
  getNearbyProductsController,
  getProductByCategory,
  getProductController,
  getProductsByUserId,
  getSuggestedProductsController,
  searchProduct,
  updateProductController,
} from "../controllers/product.controller.js";
import { authUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/create").post(authUser, upload, createProductController);
router.route("/getall").get(getAllProductsController);
router.route("/nearby").get(getNearbyProductsController);
router.route("/getbycategory/:categoryId").get(getProductByCategory);
router.route("/search").get(searchProduct);
router.route("/get/:id").get(getProductController);
router.route("/getbyuserid").get(authUser, getProductsByUserId);
router.route("/update/:id").patch(authUser, upload, updateProductController);
router.route("/delete/:id").delete(authUser, deleteProductController);
router.route("/deactivate-expired").post(authUser, deactivateExpiredAdvertisementsController);
router.route("/suggested-products/:userId?").get(getSuggestedProductsController);
router.route("/generate-listing").post(generateListing);


export default router;
