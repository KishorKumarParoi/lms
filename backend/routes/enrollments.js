const express = require('express');
const {
  enrollInCourse,
  getMyEnrollments,
  getEnrollment,
  updateEnrollmentStatus,
  getCourseEnrollments,
  generateCertificate,
  getEnrollmentStats
} = require('../controllers/enrollments');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Student routes
router.post('/', enrollInCourse);
router.get('/my', getMyEnrollments);
router.post('/:id/certificate', generateCertificate);

// General routes
router.get('/:id', getEnrollment);
router.put('/:id/status', updateEnrollmentStatus);

// Instructor/Admin routes
router.get('/course/:courseId', authorize('instructor', 'admin'), getCourseEnrollments);
router.get('/stats', authorize('admin'), getEnrollmentStats);

module.exports = router;