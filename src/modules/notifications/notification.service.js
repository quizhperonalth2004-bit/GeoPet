const mongoose = require('mongoose');
const Notification = require('./notification.model');
const Profile = require('../users/models/profile.model');

class NotificationService {
    async createNotifications(notifications) {
        if (!notifications || !Array.isArray(notifications)) {
            const error = new Error('Las notificaciones deben ser un array');
            error.statusCode = 400;
            throw error;
        }

        for (const notification of notifications) {
            if (typeof notification !== 'object') {
                const error = new Error('Cada notificación debe ser un objeto');
                error.statusCode = 400;
                throw error;
            }
        }

        const savedNotifications = await Notification.insertMany(notifications);
        return savedNotifications;
    }

    async updateNotification(id) {
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return null;
        }
        return await Notification.findByIdAndUpdate(
            id,
            { view: true },
            { new: true }
        );
    }

    async getNotificationsByOwner(owner) {
        if (!owner || !mongoose.Types.ObjectId.isValid(owner)) {
            return [];
        }

        try {
            // Determinar si 'owner' es User ID o Profile ID
            let userObjectId = owner;
            let profileObjectId = null;
            let notificationIds = [];

            // Buscar si es un profile directamente o un user con perfil
            const profileByUser = await Profile.findOne({ user: owner });
            if (profileByUser) {
                profileObjectId = profileByUser._id;
                notificationIds = profileByUser.notifications || [];
            } else {
                const profileById = await Profile.findById(owner);
                if (profileById) {
                    profileObjectId = profileById._id;
                    userObjectId = profileById.user;
                    notificationIds = profileById.notifications || [];
                }
            }

            const queryConditions = [
                { receiver_id: userObjectId }
            ];

            if (profileObjectId) {
                queryConditions.push({ receiver_id: profileObjectId });
            }
            if (notificationIds.length > 0) {
                queryConditions.push({ _id: { $in: notificationIds } });
            }

            const notifications = await Notification.find({
                $or: queryConditions
            }).sort({ createdAt: -1 });

            return notifications || [];
        } catch (e) {
            console.warn('[NotificationService] Error al consultar notificaciones:', e.message);
            return [];
        }
    }

    /**
     * Envía notificaciones a todos los perfiles excepto al emisor
     */
    async broadcastNotification({ type, emitterId, itemId, itemField }) {
        try {
            const profiles = await Profile.find({});
            if (!profiles || profiles.length === 0) return;

            const filteredProfiles = profiles.filter(p => p.user && String(p.user) !== String(emitterId));
            if (filteredProfiles.length === 0) return;

            const notificationsToCreate = filteredProfiles.map(p => ({
                type,
                emiter_id: emitterId,
                receiver_id: p.user || p._id,
                [itemField]: itemId
            }));

            const savedNotifs = await Notification.insertMany(notificationsToCreate);

            // Actualizar perfiles con las nuevas notificaciones
            for (const profile of filteredProfiles) {
                const matchingNotif = savedNotifs.find(n =>
                    String(n.receiver_id) === String(profile.user) || String(n.receiver_id) === String(profile._id)
                );
                if (matchingNotif) {
                    profile.notifications = profile.notifications || [];
                    profile.notifications.push(matchingNotif._id);
                    await profile.save();
                }
            }
        } catch (error) {
            console.warn('[NotificationService] Error en broadcastNotification:', error.message);
        }
    }
}

module.exports = new NotificationService();
