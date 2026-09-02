const profileService = require('./profile.service');

const profileController = {
    createProfile: async (req, res) => {
        try {
            const { profile, user } = await profileService.createProfile(req.body, req.files);
            res.status(201).json({ message: 'Se ha creado un nuevo perfil para el usuario ' + user.name, profile });
        } catch (error) {
            console.error('Error al crear el perfil:', error);
            res.status(error.statusCode || 400).json({ error: error.message || 'Error al crear el perfil' });
        }
    },

    getProfiles: async (req, res) => {
        try {
            const profiles = await profileService.getProfiles();
            res.status(200).json(profiles);
        } catch (error) {
            console.error('Error fetching profiles:', error);
            res.status(500).json({ error: 'Error fetching profiles' });
        }
    },

    getProfileByUserId: async (req, res) => {
        try {
            const data = await profileService.getProfileByUserId(req.params.id);
            if (!data) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(data);
        } catch (error) {
            console.error('Error en getProfileByUserId:', error);
            res.status(500).json({ error: error.message });
        }
    },

    getProfileId: async (req, res) => {
        try {
            const profile = await profileService.getProfileById(req.params.id);
            if (!profile) {
                return res.status(404).json({ message: 'Perfil no encontrado' });
            }
            res.status(200).json(profile);
        } catch (error) {
            res.status(500).json({ message: 'Error del servidor', error: error.message });
        }
    },

    updateProfile: async (req, res) => {
        try {
            const profile = await profileService.updateProfile(req.params.id, req.body);
            if (!profile) {
                return res.status(404).json({ error: 'Perfil no encontrado' });
            }
            res.status(200).json(profile);
        } catch (error) {
            console.error('Error al actualizar el perfil:', error);
            res.status(400).json({ error: error.message });
        }
    },

    deleteProfile: async (req, res) => {
        try {
            const profile = await profileService.deleteProfile(req.params.id);
            if (!profile) {
                return res.status(404).json({ error: 'Perfil no encontrado' });
            }
            res.json(profile);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = profileController;
