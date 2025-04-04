import express from "express";
import { autocompletePlaces, reverseGeocode } from "../controllers/map.controller.js";

const router = express.Router();

router.route("/autocomplete").get(autocompletePlaces);
router.route("/reverse-geocode").get(reverseGeocode);

export default router;