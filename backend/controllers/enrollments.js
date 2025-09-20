const { asyncHandler } = require('../middleware/error');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Enroll in a course
// @route   POST /api/enrollments
// @access  Private
exports.enrollInCourse = asyncHandler(async (req, res, next) => {
  const { courseId } = req.body;
  const studentId = req.user.id;

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if course is published
  if (course.status !== 'published') {
    return res.status(400).json({
      success: false,
      message: 'Course is not available for enrollment'
    });
  }

  // Check if already enrolled
  const existingEnrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId
  });

  if (existingEnrollment) {
    return res.status(400).json({
      success: false,
      message: 'Already enrolled in this course'
    });
  }

  // For paid courses, this would integrate with payment processing
  // For now, we'll allow free enrollment
  const paymentDetails = course.price > 0 ? {
    amount: course.discountPrice || course.price,
    currency: 'USD',
    paymentMethod: 'free', // This would be actual payment method
    transactionId: `txn_${Date.now()}`,
    paymentDate: new Date()
  } : undefined;

  const enrollment = await Enrollment.create({
    student: studentId,
    course: courseId,
    status: 'active',
    paymentDetails
  });

  // Update course enrollment count
  await Course.findByIdAndUpdate(courseId, {
    $inc: { enrollmentCount: 1 }
  });

  // Populate the enrollment
  await enrollment.populate([
    { path: 'course', select: 'title instructor' },
    { path: 'student', select: 'firstName lastName email' }
  ]);

  res.status(201).json({
    success: true,
    message: 'Successfully enrolled in course',
    data: enrollment
  });
});

// @desc    Get user enrollments
// @route   GET /api/enrollments/my
// @access  Private
exports.getMyEnrollments = asyncHandler(async (req, res, next) => {
  const studentId = req.user.id;
  const status = req.query.status || '';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const query = { student: studentId };
  if (status) {
    query.status = status;
  }

  const startIndex = (page - 1) * limit;
  const total = await Enrollment.countDocuments(query);

  const enrollments = await Enrollment.find(query)
    .populate('course', 'title thumbnail instructor price level')
    .populate('course.instructor', 'firstName lastName')
    .sort('-enrollmentDate')
    .limit(limit)
    .skip(startIndex);

  // Add completion stats for each enrollment
  const enrollmentsWithStats = await Promise.all(
    enrollments.map(async (enrollment) => {
      const stats = await enrollment.getCompletionStats();
      return {
        ...enrollment.toObject(),
        completionStats: stats
      };
    })
  );

  const pagination = {};
  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }
  if (startIndex + limit < total) {
    pagination.next = { page: page + 1, limit };
  }

  res.status(200).json({
    success: true,
    count: enrollments.length,
    pagination,
    data: enrollmentsWithStats
  });
});

// @desc    Get specific enrollment
// @route   GET /api/enrollments/:id
// @access  Private
exports.getEnrollment = asyncHandler(async (req, res, next) => {
  const enrollment = await Enrollment.findById(req.params.id)
    .populate('course')
    .populate('student', 'firstName lastName email');

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: 'Enrollment not found'
    });
  }

  // Check if user owns this enrollment or is admin/instructor
  if (
    enrollment.student._id.toString() !== req.user.id &&
    req.user.role !== 'admin' &&
    req.user.role !== 'instructor'
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this enrollment'
    });
  }

  const stats = await enrollment.getCompletionStats();

  res.status(200).json({
    success: true,
    data: {
      ...enrollment.toObject(),
      completionStats: stats
    }
  });
});

// @desc    Update enrollment status
// @route   PUT /api/enrollments/:id/status
// @access  Private/Admin/Instructor
exports.updateEnrollmentStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const enrollmentId = req.params.id;

  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: 'Enrollment not found'
    });
  }

  // Check permissions
  if (req.user.role === 'student') {
    // Students can only drop their own courses
    if (enrollment.student.toString() !== req.user.id || status !== 'dropped') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this enrollment'
      });
    }
  }

  enrollment.status = status;
  await enrollment.save();

  res.status(200).json({
    success: true,
    message: 'Enrollment status updated',
    data: enrollment
  });
});

// @desc    Get enrollments for a course (instructor/admin)
// @route   GET /api/enrollments/course/:courseId
// @access  Private/Instructor/Admin
exports.getCourseEnrollments = asyncHandler(async (req, res, next) => {
  const courseId = req.params.courseId;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const status = req.query.status || '';

  // Check if user owns the course or is admin
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view course enrollments'
    });
  }

  const query = { course: courseId };
  if (status) {
    query.status = status;
  }

  const startIndex = (page - 1) * limit;
  const total = await Enrollment.countDocuments(query);

  const enrollments = await Enrollment.find(query)
    .populate('student', 'firstName lastName email avatar')
    .sort('-enrollmentDate')
    .limit(limit)
    .skip(startIndex);

  const pagination = {};
  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }
  if (startIndex + limit < total) {
    pagination.next = { page: page + 1, limit };
  }

  res.status(200).json({
    success: true,
    count: enrollments.length,
    pagination,
    data: enrollments
  });
});

// @desc    Generate certificate
// @route   POST /api/enrollments/:id/certificate
// @access  Private
exports.generateCertificate = asyncHandler(async (req, res, next) => {
  const enrollmentId = req.params.id;
  
  const enrollment = await Enrollment.findById(enrollmentId)
    .populate('course', 'title instructor certificate')
    .populate('student', 'firstName lastName');

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: 'Enrollment not found'
    });
  }

  // Check permissions
  if (enrollment.student._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to generate certificate for this enrollment'
    });
  }

  // Check if course is completed
  if (enrollment.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Course must be completed to generate certificate'
    });
  }

  // Check if course allows certificates
  if (!enrollment.course.certificate.enabled) {
    return res.status(400).json({
      success: false,
      message: 'Certificates are not enabled for this course'
    });
  }

  const certificateId = await enrollment.generateCertificate();

  if (!certificateId) {
    return res.status(400).json({
      success: false,
      message: 'Certificate already exists or could not be generated'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Certificate generated successfully',
    data: {
      certificateId,
      downloadUrl: `/api/enrollments/${enrollmentId}/certificate/download`
    }
  });
});

// @desc    Get enrollment statistics
// @route   GET /api/enrollments/stats
// @access  Private/Admin
exports.getEnrollmentStats = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const totalEnrollments = await Enrollment.countDocuments();
  const activeEnrollments = await Enrollment.countDocuments({ status: 'active' });
  const completedEnrollments = await Enrollment.countDocuments({ status: 'completed' });
  
  // Monthly enrollment trends
  const monthlyTrends = await Enrollment.aggregate([
    {
      $match: {
        enrollmentDate: {
          $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$enrollmentDate' },
          month: { $month: '$enrollmentDate' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      monthlyTrends
    }
  });
});

module.exports = exports;