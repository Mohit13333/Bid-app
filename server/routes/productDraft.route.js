import express from 'express';
import { getDraft, removeDraft, saveDraft } from '../controllers/productDraft.controller.js';
import { authUser } from '../middlewares/auth.middleware.js';


const router = express.Router();

router.route('/save').post(authUser, saveDraft);

router.route('/get').get(authUser, getDraft);

router.route('/delete').delete(authUser, removeDraft);

export default router;