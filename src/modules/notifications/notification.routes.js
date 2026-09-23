const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');

router.post('/new', notificationController.createNotifications);
router.post('/profile/notifications', notificationController.getNotificationByProfileId);
router.post('/user/notifications', notificationController.getNotificationByProfileId);
router.get('/profile/notifications', notificationController.getNotificationByProfileId);
router.get('/profile/:id', notificationController.getNotificationByProfileId);
router.get('/user/:id', notificationController.getNotificationByProfileId);
router.put('/:id', notificationController.updateNotification);

module.exports = router;
