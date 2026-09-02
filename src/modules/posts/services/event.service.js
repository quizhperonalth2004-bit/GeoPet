const Event = require('../models/event.model');
const User = require('../../users/models/user.model');
const Profile = require('../../users/models/profile.model');

class EventService {
    async createEvent({ title, description, date, location, userId }) {
        const user = await User.findById(userId);
        if (!user) {
            const error = new Error('Usuario no encontrado');
            error.statusCode = 404;
            throw error;
        }

        const event = new Event({
            title,
            description,
            date,
            location,
            createdBy: userId,
            users_saveds: []
        });

        return await event.save();
    }

    async getEvents() {
        return await Event.find({});
    }

    async saveEvents(userId, eventId) {
        const event = await Event.findById(eventId);
        if (!event) {
            const error = new Error('Evento no encontrado');
            error.statusCode = 404;
            throw error;
        }

        if (event.users_saveds.includes(userId)) {
            const error = new Error('El usuario ya ha guardado este evento');
            error.statusCode = 400;
            throw error;
        }

        event.users_saveds.push(userId);
        await event.save();

        return event;
    }

    async getEventsByUserId(userId) {
        return await Event.find({ users_saveds: userId });
    }

    async getUsersInEvents(eventId) {
        const event = await Event.findById(eventId);
        if (!event) {
            const error = new Error('Evento no encontrado');
            error.statusCode = 404;
            throw error;
        }

        const userIds = event.users_saveds || [];
        const profiles = await Promise.all(
            userIds.map(async (userId) => {
                const profile = await Profile.findOne({ user: userId });
                const user = await User.findById(userId);
                return {
                    profile: profile ? profile.toObject() : {},
                    user: user ? user.toObject() : {}
                };
            })
        );

        return profiles;
    }
}

module.exports = new EventService();
