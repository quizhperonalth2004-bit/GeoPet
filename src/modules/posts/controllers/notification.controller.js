const notificationService = require('../services/notification.service');

const notificationController = {
    createNotifications: async (req, res) => {
        try {
            const notifications = req.body.notifications;
            const newNotifications = await notificationService.createNotifications(notifications);
            res.status(201).json(newNotifications);
        } catch (error) {
            console.error('Error al crear notificaciones:', error);
            res.status(error.statusCode || 500).json({ error: error.message || 'Error al crear notificaciones' });
        }
    },

    updateNotification: async (req, res) => {
        try {
            const notificationId = req.params.id;
            const updatedNotification = await notificationService.updateNotification(notificationId);
            if (!updatedNotification) {
                return res.status(404).json({ error: 'Notificación no encontrada' });
            }
            res.status(200).json(updatedNotification);
        } catch (error) {
            console.error('Error al actualizar la notificación:', error);
            res.status(500).json({ error: 'Error al actualizar la notificación' });
        }
    },

    getNotificationByProfileId: async (req, res) => {
        try {
            const owner = req.body.owner || req.params.id || req.query.owner;
            const notifications = await notificationService.getNotificationsByOwner(owner);
            res.status(200).json(notifications || []);
        } catch (error) {
            console.error('Error al obtener notificaciones por perfil:', error);
            res.status(200).json([]);
        }
    }
};

module.exports = notificationController;
