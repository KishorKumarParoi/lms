const express = require('express');
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getCoursesByInstructor,
  addCourseReview,
  publishCourse,
  getCourseAnalytics
} = require('../controllers/courses');

const { protect, authorize, checkOwnership, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getCourses);
router.get('/:id', optionalAuth, getCourse);
router.get('/instructor/:instructorId', getCoursesByInstructor);

// Protected routes
router.use(protect);

// Course creation and management
router.post('/', authorize('instructor', 'admin'), createCourse);
router.put('/:id', authorize('instructor', 'admin'), updateCourse);
router.delete('/:id', authorize('instructor', 'admin'), deleteCourse);

// Course publishing
router.put('/:id/publish', authorize('instructor', 'admin'), publishCourse);

// Course reviews
router.post('/:id/reviews', addCourseReview);

// Course analytics
router.get('/:id/analytics', authorize('instructor', 'admin'), getCourseAnalytics);

module.exports = router;