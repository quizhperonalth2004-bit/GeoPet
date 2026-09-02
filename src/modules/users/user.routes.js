const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { validateCi } = require('../../middlewares/validator.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');

router.get('/list', userController.getUsers);
router.get('/allUsers', [authMiddleware.verifyToken, authMiddleware.verifyAdmin], userController.getUsersAll);
router.post('/new', validateCi, userController.createUser);
router.get('/:id', userController.getUserById);
router.post('/:id/delete', [authMiddleware.verifyToken, authMiddleware.verifyAdmin], userController.deleteUser);
router.delete('/:id', [authMiddleware.verifyToken, authMiddleware.verifyAdmin], userController.deleteUser);
router.get('/email/:email', userController.getUserByEmail);
router.post('/:email/updatePassword', userController.updatePassword);
router.post('/:userId/updateInteraction', userController.updateInteraction);
router.patch('/:id/role', [authMiddleware.verifyToken, authMiddleware.verifyAdmin], userController.updateUserRole);
router.put('/profile', authMiddleware.verifyToken, userController.updateUserProfile);
router.put('/profile/:id', userController.updateUserProfile);

module.exports = router;
