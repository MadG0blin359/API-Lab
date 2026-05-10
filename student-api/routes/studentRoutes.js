const express = require('express');
const router = express.Router();
const {
  createStudent,
  getAllStudents,
  searchStudents,
  getStudentById,
  updateStudent,
  patchStudent,
  deleteStudent,
  deactivateStudent,
} = require('../controllers/studentController');

// IMPORTANT: /search must be defined BEFORE /:id to avoid Express
// treating the literal string "search" as a dynamic :id parameter
router.get('/search', searchStudents);

router.route('/').get(getAllStudents).post(createStudent);

router
  .route('/:id')
  .get(getStudentById)
  .put(updateStudent)
  .patch(patchStudent)
  .delete(deleteStudent);

router.patch('/:id/deactivate', deactivateStudent);

module.exports = router;
