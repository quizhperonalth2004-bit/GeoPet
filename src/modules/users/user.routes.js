const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { validateCi } = require('../../middlewares/validator.middleware');
const validate = require('../../middlewares/validate.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const {
    mongoIdParamDto,
    userProfileUpdateDto,
    updatePasswordDto,
    updateUserRoleDto
} = require('./users.dto');

router.get('/list', userController.getUsers);
router.get('/allUsers', [authMiddleware.verifyToken, authMiddleware.verifyAdmin], userController.getUsersAll);
router.post('/new', validateCi, userController.createUser);
router.get('/:id', validate({ params: mongoIdParamDto }), userController.getUserById);
router.post('/:id/delete', [authMiddleware.verifyToken, authMiddleware.verifyAdmin, validate({ params: mongoIdParamDto })], userController.deleteUser);
router.delete('/:id', [authMiddleware.verifyToken, authMiddleware.verifyAdmin, validate({ params: mongoIdParamDto })], userController.deleteUser);
router.get('/email/:email', userController.getUserByEmail);
router.post('/:email/updatePassword', [authMiddleware.verifyToken, validate(updatePasswordDto, 'body')], userController.updatePassword);
router.post('/:userId/updateInteraction', userController.updateInteraction);
router.patch('/:id/role', [authMiddleware.verifyToken, authMiddleware.verifyAdmin, validate({ params: mongoIdParamDto, body: updateUserRoleDto })], userController.updateUserRole);
router.put('/profile', [authMiddleware.verifyToken, validate(userProfileUpdateDto, 'body')], userController.updateUserProfile);
router.put('/profile/:id', [authMiddleware.verifyToken, validate({ params: mongoIdParamDto, body: userProfileUpdateDto })], userController.updateUserProfile);

module.exports = router;
