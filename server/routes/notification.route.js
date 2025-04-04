import express from 'express';
import {
  sendNotification,
  getUserNotifications,
  markNotificationRead,
  deleteNotificationById,
  sendUniversalNotification,
  notifyUserOnApproval,
  notifyAdmin,
  sendFavoriteNotification,
} from '../controllers/notification.controller.js';
import { authUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/send').post(sendNotification);
router.route('/universal').post(sendUniversalNotification);
router.route('/admin/product-sale').post(notifyAdmin);
router.route('/user/product-status').post(notifyUserOnApproval);
router.route('/favorite').post(authUser,sendFavoriteNotification);
router.route('/get').get(getUserNotifications);
router.route('/read/:id').put(markNotificationRead);
router.route('/:id').delete(deleteNotificationById);

export default router;
