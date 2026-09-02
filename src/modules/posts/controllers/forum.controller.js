const forumService = require('../services/forum.service');

const forumController = {
    createForum: async (req, res) => {
        try {
            const { question, date, createdBy } = req.body;
            const newForum = await forumService.createForum({ question, date, createdBy });
            res.status(201).json(newForum);
        } catch (error) {
            console.error('Error al crear foro:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    getForums: async (req, res) => {
        try {
            const forums = await forumService.getForums();
            res.json(forums);
        } catch (error) {
            console.error('Error fetching forums:', error);
            res.status(500).json({ error: 'Error fetching posts' });
        }
    },

    getForumById: async (req, res) => {
        try {
            const forum = await forumService.getForumById(req.params.id);
            if (!forum) {
                return res.status(404).json({ error: 'Foro no encontrado' });
            }
            res.status(200).json(forum);
        } catch (error) {
            console.error('Error al obtener foro por id:', error);
            res.status(400).json({ error: error.message });
        }
    },

    updateForum: async (req, res) => {
        try {
            const forum = await forumService.updateForum(req.params.id, req.body);
            if (!forum) {
                return res.status(404).json({ error: 'Foro no encontrado' });
            }
            res.status(200).json(forum);
        } catch (error) {
            console.error('Error al actualizar foro:', error);
            res.status(400).json({ error: error.message });
        }
    },

    deleteForum: async (req, res) => {
        try {
            const forum = await forumService.deleteForum(req.params.id);
            if (!forum) {
                return res.status(404).json({ error: 'Foro no encontrado' });
            }
            res.status(200).json({ message: 'Foro eliminado correctamente' });
        } catch (error) {
            console.error('Error al eliminar foro:', error);
            res.status(400).json({ error: error.message });
        }
    }
};

module.exports = forumController;
