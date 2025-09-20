const express = require('express');
const { asyncHandler } = require('../middleware/error');
const Progress = require('../models/Progress');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get user progress for all courses
// @route   GET /api/progress/my
// @access  Private
router.get('/my', asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

  const analytics = await Progress.getLearningAnalytics(userId, startDate, endDate);

  res.status(200).json({
    success: true,
    data: analytics
  });
}));

// @desc    Get progress for a specific course
// @route   GET /api/progress/course/:courseId
// @access  Private
router.get('/course/:courseId', asyncHandler(async (req, res, next) => {
  const courseId = req.params.courseId;
  const userId = req.user.id;

  const progress = await Progress.getUserCourseProgress(userId, courseId);

  res.status(200).json({
    success: true,
    data: progress
  });
}));

module.exports = router;