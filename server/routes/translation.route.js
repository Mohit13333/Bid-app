import express from 'express';
import { translate } from '../controllers/translation.controller.js';

const router = express.Router();
router.route('/translate').post(translate);

export default router;