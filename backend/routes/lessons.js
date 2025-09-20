const express = require('express');
const {
  getLessonsByCourse,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  updateLessonProgress,
  addBookmark,
  addNote
} = require('../controllers/lessons');

const { protect, authorize, checkEnrollment } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Get lessons for a course
router.get('/course/:courseId', checkEnrollment, getLessonsByCourse);

// CRUD operations
router.route('/')
  .post(authorize('instructor', 'admin'), createLesson);

router.route('/:id')
  .get(getLesson)
  .put(authorize('instructor', 'admin'), updateLesson)
  .delete(authorize('instructor', 'admin'), deleteLesson);

// Progress tracking
router.post('/:id/progress', updateLessonProgress);

// Bookmarks and notes
router.post('/:id/bookmarks', addBookmark);
router.post('/:id/notes', addNote);

module.exports = router;