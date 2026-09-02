const eventService = require('../services/event.service');

const eventController = {
    createEvent: async (req, res) => {
        try {
            const event = await eventService.createEvent(req.body);
            res.status(201).send(event);
        } catch (error) {
            console.error('Error al crear evento:', error);
            res.status(error.statusCode || 500).send({ error: error.message });
        }
    },

    getEvents: async (req, res) => {
        try {
            const events = await eventService.getEvents();
            res.status(200).json(events);
        } catch (error) {
            console.error('Error fetching events:', error);
            res.status(500).json({ error: 'Error fetching events' });
        }
    },

    saveEvents: async (req, res) => {
        const { userId, eventId } = req.body;
        try {
            const event = await eventService.saveEvents(userId, eventId);
            res.status(200).json({ message: 'Evento guardado con éxito', event });
        } catch (error) {
            console.error('Error al guardar evento:', error);
            res.status(error.statusCode || 500).json({ message: error.message || 'Error al guardar el evento' });
        }
    },

    getEventsByUserId: async (req, res) => {
        try {
            const events = await eventService.getEventsByUserId(req.params.id);
            res.status(200).json(events);
        } catch (error) {
            console.error('Error en getEventsByUserId:', error);
            res.status(500).json({ error: error.message });
        }
    },

    getUsersInEvents: async (req, res) => {
        try {
            const profiles = await eventService.getUsersInEvents(req.params.id);
            res.status(200).json(profiles);
        } catch (error) {
            console.error('Error en getUsersInEvents:', error);
            res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
};

module.exports = eventController;
