const express = require('express');
const router = express.Router();
const upload = require('../../middlewares/upload.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const petController = require('./pets.controller');

router.get('/list', petController.getAllPets);
router.post('/new', [authMiddleware.verifyToken, upload], petController.createPet);
router.post('/search', petController.getPetsByUser);
router.post('/change', authMiddleware.verifyToken, petController.changeStatusPet);
router.get('/:id', petController.getPetById);
router.put('/:id', authMiddleware.verifyToken, petController.updatePet);
router.delete('/:id', authMiddleware.verifyToken, petController.deletePet);

module.exports = router;
