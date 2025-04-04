import express from "express";
import { deleteRecentSearches, getRecentSearch, searchProduct } from "../controllers/search.controller.js";
import { authUser } from "../middlewares/auth.middleware.js";


const router = express.Router();

router.get("/",searchProduct); 
router.get("/recent", authUser, getRecentSearch); 
router.delete("/recent/:searchId", authUser, deleteRecentSearches); 

export default router;
