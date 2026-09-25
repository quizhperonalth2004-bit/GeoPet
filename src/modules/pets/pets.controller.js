const petsService = require('./pets.service');

const petsController = {
    createPet: async (req, res, next) => {
        try {
            const pet = await petsService.createPet(req.body, req.files, req.user);
            res.status(201).json(pet);
        } catch (error) {
            console.error('Error al crear mascota:', error);
            next(error);
        }
    },

    getAllPets: async (req, res, next) => {
        try {
            const pets = await petsService.getAllPets();
            res.json(pets);
        } catch (error) {
            console.error('Error al obtener mascotas:', error);
            next(error);
        }
    },

    getPetsByUser: async (req, res, next) => {
        try {
            const ownerId = req.body.owner;
            const pets = await petsService.getPetsByUser(ownerId);
            res.status(200).json(pets);
        } catch (error) {
            console.error('Error en getPetsByUser:', error);
            next(error);
        }
    },

    changeStatusPet: async (req, res, next) => {
        try {
            const { petId, status } = req.body;
            const pet = await petsService.changeStatusPet(petId, status, req.user);
            res.status(200).json(pet);
        } catch (error) {
            console.error('Error en changeStatusPet:', error);
            next(error);
        }
    },

    getPetById: async (req, res, next) => {
        try {
            const pet = await petsService.getPetById(req.params.id);
            if (!pet) {
                return res.status(404).json({
                    success: false,
                    statusCode: 404,
                    message: 'Pet not found',
                    error: 'Pet not found'
                });
            }
            res.json({ pet });
        } catch (error) {
            console.error('Error en getPetById:', error);
            next(error);
        }
    },

    updatePet: async (req, res, next) => {
        try {
            const pet = await petsService.updatePet(req.params.id, req.body, req.user);
            if (!pet) {
                return res.status(404).json({
                    success: false,
                    statusCode: 404,
                    message: 'Pet not found',
                    error: 'Pet not found'
                });
            }
            res.json(pet);
        } catch (error) {
            console.error('Error en updatePet:', error);
            next(error);
        }
    },

    deletePet: async (req, res, next) => {
        try {
            const pet = await petsService.deletePet(req.params.id, req.user);
            if (!pet) {
                return res.status(404).json({
                    success: false,
                    statusCode: 404,
                    message: 'Pet not found',
                    error: 'Pet not found'
                });
            }
            res.json(pet);
        } catch (error) {
            console.error('Error en deletePet:', error);
            next(error);
        }
    }
};

module.exports = petsController;
