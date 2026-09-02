const express = require('express');
const router = express.Router();
const upload = require('../../middlewares/upload.middleware');
const petController = require('./pets.controller');

router.get('/list', petController.getAllPets);
router.post('/new', upload, petController.createPet);
router.post('/search', petController.getPetsByUser);
router.post('/change', petController.changeStatusPet);
router.get('/:id', petController.getPetById);
router.put('/:id', petController.updatePet);
router.delete('/:id', petController.deletePet);

module.exports = router;
