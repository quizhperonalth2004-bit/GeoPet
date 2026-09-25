const notificationService = require('./notification.service');

const notificationController = {
    createNotifications: async (req, res, next) => {
        try {
            const notifications = req.body.notifications;
            const newNotifications = await notificationService.createNotifications(notifications);
            res.status(201).json(newNotifications);
        } catch (error) {
            console.error('Error al crear notificaciones:', error);
            next(error);
        }
    },

    updateNotification: async (req, res, next) => {
        try {
            const notificationId = req.params.id;
            const updatedNotification = await notificationService.updateNotification(notificationId);
            if (!updatedNotification) {
                return res.status(404).json({
                    success: false,
                    statusCode: 404,
                    message: 'Notificación no encontrada',
                    error: 'Notificación no encontrada'
                });
            }
            res.status(200).json(updatedNotification);
        } catch (error) {
            console.error('Error al actualizar la notificación:', error);
            next(error);
        }
    },

    getNotificationByProfileId: async (req, res, next) => {
        try {
            const owner = req.body?.owner || req.params?.id || req.query?.owner || req.query?.userId || req.query?.id || (req.user ? (req.user._id || req.user.id) : null);
            if (!owner) {
                return res.status(200).json([]);
            }
            const notifications = await notificationService.getNotificationsByOwner(owner);
            return res.status(200).json(notifications || []);
        } catch (error) {
            console.error('Error al obtener notificaciones por perfil:', error);
            return res.status(200).json([]);
        }
    }
};

module.exports = notificationController;
