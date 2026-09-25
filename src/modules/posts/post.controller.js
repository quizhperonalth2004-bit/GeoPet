const postService = require('./post.service');

const postController = {
    createPost: async (req, res, next) => {
        try {
            const result = await postService.createPost(req.body, req.files);
            res.status(201).json(result);
        } catch (error) {
            console.error('Error al crear la publicación:', error);
            next(error);
        }
    },

    addSighting: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await postService.addSighting(id, req.body, req.user, req.files);
            res.status(201).json(result);
        } catch (error) {
            if (process.env.NODE_ENV !== 'test') {
                console.error('Error al registrar avistamiento:', error);
            }
            next(error);
        }
    },

    getPostByUserId: async (req, res, next) => {
        try {
            const enrichedPosts = await postService.getPostByUserId(req.params.id);
            res.status(200).json(enrichedPosts || []);
        } catch (error) {
            console.error('Error al obtener posts por usuario:', error);
            res.status(200).json([]);
        }
    },

    getPost: async (req, res, next) => {
        try {
            const enrichedPosts = await postService.getPost(req.query);
            res.send(enrichedPosts);
        } catch (error) {
            console.error('Error al obtener posts:', error);
            next(error);
        }
    },

    getPostsAll: async (req, res, next) => {
        try {
            const posts = await postService.getPostsAll();
            res.send(posts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            next(error);
        }
    },

    getPostsAllByUser: async (req, res, next) => {
        try {
            const posts = await postService.getPostsAllByUser(req.params.id);
            res.send(posts);
        } catch (error) {
            console.error('Error fetching posts by user:', error);
            next(error);
        }
    },

    getPostById: async (req, res, next) => {
        try {
            const postDetails = await postService.getPostById(req.params.id);
            if (!postDetails) {
                return res.status(404).json({
                    success: false,
                    statusCode: 404,
                    message: 'Post not found',
                    error: 'Post not found'
                });
            }
            res.json(postDetails);
        } catch (error) {
            console.error('Error al obtener post por id:', error);
            next(error);
        }
    },

    updatePost: async (req, res, next) => {
        try {
            const post = await postService.updatePost(req.params.id, req.body);
            if (!post) {
                return res.status(404).json({
                    success: false,
                    statusCode: 404,
                    message: 'Post not found',
                    error: 'Post not found'
                });
            }
            res.send(post);
        } catch (error) {
            console.error('Error al actualizar post:', error);
            next(error);
        }
    },

    deletePost: async (req, res, next) => {
        try {
            const post = await postService.deletePost(req.params.id);
            if (!post) {
                return res.status(404).json({
                    success: false,
                    statusCode: 404,
                    message: 'Post not found',
                    error: 'Post not found'
                });
            }
            res.send(post);
        } catch (error) {
            console.error('Error al eliminar post:', error);
            next(error);
        }
    }
};

module.exports = postController;
