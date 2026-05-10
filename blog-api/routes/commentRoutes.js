const express = require('express');
// mergeParams: true allows this router to access :postId from the parent router
const router = express.Router({ mergeParams: true });
const { addComment, getCommentsByPost } = require('../controllers/commentController');

router.route('/').post(addComment).get(getCommentsByPost);

module.exports = router;
