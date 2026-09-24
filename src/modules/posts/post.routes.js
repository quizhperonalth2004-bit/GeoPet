const express = require('express');
const router = express.Router();
const upload = require('../../middlewares/upload.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
    createPostDto,
    addSightingDto,
    postIdParamDto,
    getPostQueryDto
} = require('./posts.dto');
const postController = require('./post.controller');

// Ruta para crear una nueva publicación
router.post('/new', upload, validate(createPostDto), postController.createPost);

// Ruta para registrar avistamientos con geolocalización (protegida por JWT)
router.post('/:id/sightings', authMiddleware.verifyToken, upload, validate({ params: postIdParamDto, body: addSightingDto }), postController.addSighting);
router.post('/:id/sighting', authMiddleware.verifyToken, upload, validate({ params: postIdParamDto, body: addSightingDto }), postController.addSighting);
router.post('/:id/mark-sighting', authMiddleware.verifyToken, upload, validate({ params: postIdParamDto, body: addSightingDto }), postController.addSighting);

// Rutas fijas antes de las parametrizadas
router.get('/list', postController.getPostsAll);
router.get('/user/:id', postController.getPostByUserId);
router.get('/profile/:id', postController.getPostByUserId);
router.get('/owner/:id', postController.getPostByUserId);
router.get('/', validate(getPostQueryDto, 'query'), postController.getPost);

// Rutas parametrizadas por ID
router.delete('/moderation/:id', [authMiddleware.verifyToken, authMiddleware.verifyAdmin, validate({ params: postIdParamDto })], postController.deletePost);
router.get('/:id', validate({ params: postIdParamDto }), postController.getPostById);
router.patch('/:id', validate({ params: postIdParamDto }), postController.updatePost);
router.delete('/:id', [authMiddleware.verifyToken, authMiddleware.verifyAdminOrOwner, validate({ params: postIdParamDto })], postController.deletePost);

module.exports = router;
