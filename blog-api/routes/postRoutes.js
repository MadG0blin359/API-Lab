const express = require('express');
const router = express.Router();
const { createPost, getAllPosts, getPostsByTag, getPostById, updatePost, deletePost } = require('../controllers/postController');
const commentRouter = require('./commentRoutes');

// IMPORTANT: /tag/:tag must come BEFORE /:id
router.get('/tag/:tag', getPostsByTag);

router.route('/').get(getAllPosts).post(createPost);
router.route('/:id').get(getPostById).put(updatePost).delete(deletePost);

// Merge params so commentRouter can access :postId
router.use('/:postId/comments', (req, res, next) => {
  req.params.postId = req.params.postId;
  next();
}, commentRouter);

module.exports = router;
