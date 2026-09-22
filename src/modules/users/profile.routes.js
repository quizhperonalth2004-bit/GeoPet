const express = require('express');
const router = express.Router();
const profileController = require('./profile.controller');
const upload = require('../../middlewares/upload.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');

router.post('/new', upload, profileController.createProfile);
router.get('/all', profileController.getProfiles);
router.put('/update/:id', authMiddleware.verifyToken, profileController.updateProfile);
router.put('/profile', authMiddleware.verifyToken, profileController.updateProfile);
router.put('/profile/:id', authMiddleware.verifyToken, profileController.updateProfile);
router.get('/:id', profileController.getProfileByUserId);
router.patch('/:id', authMiddleware.verifyToken, profileController.updateProfile);
router.delete('/:id', authMiddleware.verifyToken, profileController.deleteProfile);

module.exports = router;
