const petsService = require('./pets.service');

const petsController = {
    createPet: async (req, res) => {
        try {
            const pet = await petsService.createPet(req.body, req.files, req.user);
            res.status(201).json(pet);
        } catch (error) {
            console.error('Error al crear mascota:', error);
            res.status(error.statusCode || 500).json({ error: error.message || 'Server error, please try again later' });
        }
    },

    getAllPets: async (req, res) => {
        try {
            const pets = await petsService.getAllPets();
            res.json(pets);
        } catch (error) {
            console.error('Error al obtener mascotas:', error);
            res.status(500).json({ error: error.message });
        }
    },

    getPetsByUser: async (req, res) => {
        try {
            const ownerId = req.body.owner;
            const pets = await petsService.getPetsByUser(ownerId);
            res.status(200).json(pets);
        } catch (error) {
            console.error('Error en getPetsByUser:', error);
            res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
        }
    },

    changeStatusPet: async (req, res) => {
        try {
            const { petId, status } = req.body;
            const pet = await petsService.changeStatusPet(petId, status, req.user);
            res.status(200).json(pet);
        } catch (error) {
            console.error('Error en changeStatusPet:', error);
            res.status(error.statusCode || 500).json({ message: error.message || 'Error al actualizar el estado de la mascota.' });
        }
    },

    getPetById: async (req, res) => {
        try {
            const pet = await petsService.getPetById(req.params.id);
            if (!pet) {
                return res.status(404).json({ error: 'Pet not found' });
            }
            res.json({ pet });
        } catch (error) {
            console.error('Error en getPetById:', error);
            res.status(500).json({ error: error.message });
        }
    },

    updatePet: async (req, res) => {
        try {
            const pet = await petsService.updatePet(req.params.id, req.body, req.user);
            if (!pet) {
                return res.status(404).json({ error: 'Pet not found' });
            }
            res.json(pet);
        } catch (error) {
            console.error('Error en updatePet:', error);
            res.status(error.statusCode || 400).json({ error: error.message });
        }
    },

    deletePet: async (req, res) => {
        try {
            const pet = await petsService.deletePet(req.params.id, req.user);
            if (!pet) {
                return res.status(404).json({ error: 'Pet not found' });
            }
            res.json(pet);
        } catch (error) {
            console.error('Error en deletePet:', error);
            res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
};

module.exports = petsController;
