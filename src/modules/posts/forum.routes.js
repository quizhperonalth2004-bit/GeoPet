const express = require('express');
const router = express.Router();
const forumController = require('./controllers/forum.controller');

router.post('/new', forumController.createForum);
router.get('/all', forumController.getForums);
router.get('/:id', forumController.getForumById);
router.put('/:id', forumController.updateForum);
router.delete('/:id', forumController.deleteForum);

module.exports = router;
