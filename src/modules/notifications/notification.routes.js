const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const validate = require('../../middlewares/validate.middleware');
const {
    notificationIdParamDto,
    updateNotificationDto,
    createNotificationsDto
} = require('./notifications.dto');

router.get('/', notificationController.getNotificationByProfileId);
router.post('/', notificationController.getNotificationByProfileId);
router.post('/new', validate(createNotificationsDto, 'body'), notificationController.createNotifications);
router.post('/profile/notifications', notificationController.getNotificationByProfileId);
router.post('/user/notifications', notificationController.getNotificationByProfileId);
router.get('/profile/notifications', notificationController.getNotificationByProfileId);
router.get('/profile/:id', notificationController.getNotificationByProfileId);
router.get('/user/:id', notificationController.getNotificationByProfileId);
router.put('/:id', validate({ params: notificationIdParamDto, body: updateNotificationDto }), notificationController.updateNotification);

module.exports = router;
