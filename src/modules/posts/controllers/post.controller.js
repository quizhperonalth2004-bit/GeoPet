const postService = require('../services/post.service');

const postController = {
    createPost: async (req, res) => {
        try {
            const result = await postService.createPost(req.body, req.files);
            res.status(201).json(result);
        } catch (error) {
            console.error('Error al crear la publicación:', error);
            res.status(error.statusCode || 500).json({ error: error.message || 'Hubo un error al crear la publicación' });
        }
    },

    addSighting: async (req, res) => {
        try {
            const { id } = req.params;
            const result = await postService.addSighting(id, req.body, req.user, req.files);
            res.status(201).json(result);
        } catch (error) {
            if (process.env.NODE_ENV !== 'test') {
                console.error('Error al registrar avistamiento:', error);
            }
            res.status(error.statusCode || 500).json({
                message: error.message || 'Error al registrar avistamiento',
                error: error.message || 'Error al registrar avistamiento'
            });
        }
    },

    getPostByUserId: async (req, res) => {
        try {
            const enrichedPosts = await postService.getPostByUserId(req.params.id);
            res.status(200).json(enrichedPosts || []);
        } catch (error) {
            console.error('Error al obtener posts por usuario:', error);
            res.status(200).json([]);
        }
    },

    getPost: async (req, res) => {
        try {
            const enrichedPosts = await postService.getPost(req.query);
            res.send(enrichedPosts);
        } catch (error) {
            console.error('Error al obtener posts:', error);
            res.status(500).json({ error: 'Error fetching posts' });
        }
    },

    getPostsAll: async (req, res) => {
        try {
            const posts = await postService.getPostsAll();
            res.send(posts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            res.status(500).send('Error fetching posts');
        }
    },

    getPostsAllByUser: async (req, res) => {
        try {
            const posts = await postService.getPostsAllByUser(req.params.id);
            res.send(posts);
        } catch (error) {
            console.error('Error fetching posts by user:', error);
            res.status(500).send('Error fetching posts');
        }
    },

    getPostById: async (req, res) => {
        try {
            const postDetails = await postService.getPostById(req.params.id);
            if (!postDetails) {
                return res.status(404).json({ error: 'Post not found' });
            }
            res.json(postDetails);
        } catch (error) {
            console.error('Error al obtener post por id:', error);
            res.status(500).json({ error: 'Error fetching post' });
        }
    },

    updatePost: async (req, res) => {
        try {
            const post = await postService.updatePost(req.params.id, req.body);
            if (!post) {
                return res.status(404).send({ error: 'Post not found' });
            }
            res.send(post);
        } catch (error) {
            console.error('Error al actualizar post:', error);
            res.status(error.statusCode || 400).send(error.message);
        }
    },

    deletePost: async (req, res) => {
        try {
            const post = await postService.deletePost(req.params.id);
            if (!post) {
                return res.status(404).send({ error: 'Post not found' });
            }
            res.send(post);
        } catch (error) {
            console.error('Error al eliminar post:', error);
            res.status(500).send(error.message);
        }
    }
};

module.exports = postController;
