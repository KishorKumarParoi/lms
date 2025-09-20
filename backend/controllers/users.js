const { asyncHandler } = require('../middleware/error');
const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortDir = req.query.sortDir || 'desc';
  const search = req.query.search || '';
  const role = req.query.role || '';
  const status = req.query.status || '';

  // Build query
  const query = {};
  
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (role) {
    query.role = role;
  }
  
  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  const startIndex = (page - 1) * limit;
  const total = await User.countDocuments(query);

  const users = await User.find(query)
    .select('-password')
    .sort({ [sortBy]: sortDir === 'desc' ? -1 : 1 })
    .limit(limit)
    .skip(startIndex)
    .populate('enrolledCourses', 'title')
    .populate('createdCourses', 'title');

  // Pagination result
  const pagination = {};
  
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }
  
  if (startIndex + limit < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: users.length,
    pagination,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin or Own Profile
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('enrolledCourses')
    .populate('createdCourses');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Soft delete - just deactivate
  user.isActive = false;
  await user.save();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get user stats
// @route   GET /api/users/stats
// @access  Private/Admin
exports.getUserStats = asyncHandler(async (req, res, next) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalUsers = await User.countDocuments({ isActive: true });
  const newUsersThisMonth = await User.countDocuments({
    isActive: true,
    createdAt: {
      $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    }
  });

  const activeUsersLast30Days = await User.countDocuments({
    isActive: true,
    lastLogin: {
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      newUsersThisMonth,
      activeUsersLast30Days,
      roleBreakdown: stats
    }
  });
});

// @desc    Update user avatar
// @route   PUT /api/users/:id/avatar
// @access  Private (Own profile or Admin)
exports.updateAvatar = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Handle avatar upload here
  // This would integrate with your file upload service (Cloudinary, etc.)
  
  res.status(200).json({
    success: true,
    message: 'Avatar updated successfully',
    data: user
  });
});

// @desc    Get user learning progress
// @route   GET /api/users/:id/progress
// @access  Private (Own profile or Admin/Instructor)
exports.getUserProgress = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  const Enrollment = require('../models/Enrollment');
  const Progress = require('../models/Progress');

  // Get user enrollments with progress
  const enrollments = await Enrollment.find({ student: userId, status: 'active' })
    .populate('course', 'title thumbnail duration')
    .sort('-enrollmentDate');

  // Get detailed progress for each enrollment
  const progressData = await Promise.all(
    enrollments.map(async (enrollment) => {
      const courseProgress = await Progress.getUserCourseProgress(userId, enrollment.course._id);
      return {
        course: enrollment.course,
        enrollment: enrollment,
        progress: courseProgress
      };
    })
  );

  // Calculate overall statistics
  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter(e => e.status === 'completed').length;
  const totalStudyTime = enrollments.reduce((total, e) => total + e.totalStudyTime, 0);

  res.status(200).json({
    success: true,
    data: {
      totalCourses,
      completedCourses,
      totalStudyTime,
      progressData
    }
  });
});

// @desc    Get user certificates
// @route   GET /api/users/:id/certificates
// @access  Private (Own profile or Admin)
exports.getUserCertificates = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  const Enrollment = require('../models/Enrollment');

  const certificates = await Enrollment.find({
    student: userId,
    certificateIssued: true
  })
  .populate('course', 'title instructor')
  .populate('course.instructor', 'firstName lastName')
  .select('course certificateId completionDate')
  .sort('-completionDate');

  res.status(200).json({
    success: true,
    count: certificates.length,
    data: certificates
  });
});

module.exports = exports;