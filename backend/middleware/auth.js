const jwt = require('jsonwebtoken');
const { asyncHandler } = require('./error');
const User = require('../models/User');

// Protect routes - user must be authenticated
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check for token in cookies (if using cookie-based auth)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found'
      });
    }

    // Check if user is active
    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, invalid token'
    });
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this resource`
      });
    }
    next();
  };
};

// Check if user owns resource or has permission
exports.checkOwnership = (resourceField = 'user') => {
  return asyncHandler(async (req, res, next) => {
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Get the resource ID from request params or body
    const resourceId = req.params.id || req.body[resourceField];
    
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID not provided'
      });
    }

    // For courses, check if user is the instructor
    if (req.baseUrl.includes('/courses')) {
      const Course = require('../models/Course');
      const course = await Course.findById(resourceId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this course'
        });
      }
    }

    // For other resources, check direct ownership
    else {
      if (req.user._id.toString() !== resourceId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }
    }

    next();
  });
};

// Check if user is enrolled in a course
exports.checkEnrollment = asyncHandler(async (req, res, next) => {
  const courseId = req.params.courseId || req.params.id;
  const userId = req.user._id;

  // Admin and instructors can access any course
  if (req.user.role === 'admin' || req.user.role === 'instructor') {
    return next();
  }

  const Enrollment = require('../models/Enrollment');
  const enrollment = await Enrollment.findOne({
    student: userId,
    course: courseId,
    status: 'active'
  });

  if (!enrollment) {
    // Check if course is free
    const Course = require('../models/Course');
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.price > 0) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to access this content'
      });
    }
  }

  next();
});

// Rate limiting for sensitive operations
exports.rateLimitSensitive = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for sensitive operations
  message: {
    success: false,
    message: 'Too many attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validate API key for external integrations
exports.validateApiKey = asyncHandler(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required'
    });
  }

  // In production, store API keys in database
  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  next();
});

// Optional authentication - adds user to req if token is valid
exports.optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Token invalid, but that's ok for optional auth
      req.user = null;
    }
  }

  next();
});

module.exports = exports;