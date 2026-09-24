const express = require('express');
const router = express.Router();
const upload = require('../../middlewares/upload.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createPetDto, updatePetDto, changeStatusPetDto, getPetsByUserDto } = require('./pets.dto');
const petController = require('./pets.controller');

router.get('/list', petController.getAllPets);
router.post('/new', [authMiddleware.verifyToken, upload, validate(createPetDto)], petController.createPet);
router.post('/search', validate(getPetsByUserDto), petController.getPetsByUser);
router.post('/change', [authMiddleware.verifyToken, validate(changeStatusPetDto)], petController.changeStatusPet);
router.get('/:id', petController.getPetById);
router.put('/:id', [authMiddleware.verifyToken, validate(updatePetDto)], petController.updatePet);
router.delete('/:id', authMiddleware.verifyToken, petController.deletePet);

module.exports = router;
