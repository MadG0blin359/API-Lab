const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');

// POST /api/posts/:postId/comments — Add a comment to a post
const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, user } = req.body;

    if (!text || !user) {
      return res.status(400).json({ success: false, message: 'text and user are required' });
    }

    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Validate user exists
    const userExists = await User.findById(user);
    if (!userExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const comment = await Comment.create({ text, post: postId, user });
    await comment.populate('user', 'username email');

    res.status(201).json({ success: true, message: 'Comment added successfully', data: comment });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET /api/posts/:postId/comments — Get all comments for a post
const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comments = await Comment.find({ post: postId })
      .populate('user', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid post ID format' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// DELETE /api/comments/:id — Delete a specific comment
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    res.status(200).json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid comment ID format' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { addComment, getCommentsByPost, deleteComment };
