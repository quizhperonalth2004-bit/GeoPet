const express = require('express');
const router = express.Router();
const profileController = require('./profile.controller');
const upload = require('../../middlewares/upload.middleware');

router.post('/new', upload, profileController.createProfile);
router.get('/all', profileController.getProfiles);
router.put('/update/:id', profileController.updateProfile);
router.put('/profile', profileController.updateProfile);
router.put('/profile/:id', profileController.updateProfile);
router.get('/:id', profileController.getProfileByUserId);
router.patch('/:id', profileController.updateProfile);
router.delete('/:id', profileController.deleteProfile);

module.exports = router;
