const express = require('express');
const router = express.Router();
const upload = require('../../middlewares/upload.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const postController = require('./controllers/post.controller');

// Ruta para crear una nueva publicación
router.post('/new', upload, postController.createPost);

// Ruta para registrar avistamientos con geolocalización (protegida por JWT)
router.post('/:id/sightings', authMiddleware.verifyToken, upload, postController.addSighting);

// Rutas fijas antes de las parametrizadas
router.get('/list', postController.getPostsAll);
router.get('/user/:id', postController.getPostByUserId);
router.get('/profile/:id', postController.getPostByUserId);
router.get('/owner/:id', postController.getPostByUserId);
router.get('/', postController.getPost);

// Rutas parametrizadas por ID
router.delete('/moderation/:id', [authMiddleware.verifyToken, authMiddleware.verifyAdmin], postController.deletePost);
router.get('/:id', postController.getPostById);
router.patch('/:id', postController.updatePost);
router.delete('/:id', [authMiddleware.verifyToken, authMiddleware.verifyAdminOrOwner], postController.deletePost);

module.exports = router;
