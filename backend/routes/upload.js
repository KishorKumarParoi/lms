const express = require('express');
const multer = require('multer');
const path = require('path');
const { asyncHandler } = require('../middleware/error');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else {
      uploadPath += 'documents/';
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Videos
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'application/zip', 'application/x-zip-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not supported`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: fileFilter
});

// All routes are protected
router.use(protect);

// @desc    Upload single file
// @route   POST /api/upload/single
// @access  Private
router.post('/single', upload.single('file'), asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const fileData = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype,
    url: `${req.protocol}://${req.get('host')}/uploads/${req.file.path.split('/').slice(-2).join('/')}`
  };

  res.status(200).json({
    success: true,
    message: 'File uploaded successfully',
    data: fileData
  });
}));

// @desc    Upload multiple files
// @route   POST /api/upload/multiple
// @access  Private
router.post('/multiple', upload.array('files', 5), asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded'
    });
  }

  const filesData = req.files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    url: `${req.protocol}://${req.get('host')}/uploads/${file.path.split('/').slice(-2).join('/')}`
  }));

  res.status(200).json({
    success: true,
    message: `${req.files.length} files uploaded successfully`,
    data: filesData
  });
}));

// @desc    Upload course thumbnail
// @route   POST /api/upload/course-thumbnail
// @access  Private/Instructor
router.post('/course-thumbnail', 
  authorize('instructor', 'admin'), 
  upload.single('thumbnail'), 
  asyncHandler(async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No thumbnail uploaded'
      });
    }

    // Validate image file
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    const thumbnailData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      url: `${req.protocol}://${req.get('host')}/uploads/${req.file.path.split('/').slice(-2).join('/')}`
    };

    res.status(200).json({
      success: true,
      message: 'Course thumbnail uploaded successfully',
      data: thumbnailData
    });
  })
);

// @desc    Upload lesson video
// @route   POST /api/upload/lesson-video
// @access  Private/Instructor
router.post('/lesson-video', 
  authorize('instructor', 'admin'), 
  upload.single('video'), 
  asyncHandler(async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video uploaded'
      });
    }

    // Validate video file
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a video file'
      });
    }

    const videoData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      duration: 0, // This would need to be calculated using a video processing library
      url: `${req.protocol}://${req.get('host')}/uploads/${req.file.path.split('/').slice(-2).join('/')}`
    };

    res.status(200).json({
      success: true,
      message: 'Lesson video uploaded successfully',
      data: videoData
    });
  })
);

// @desc    Upload user avatar
// @route   POST /api/upload/avatar
// @access  Private
router.post('/avatar', 
  upload.single('avatar'), 
  asyncHandler(async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar uploaded'
      });
    }

    // Validate image file
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    const avatarData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      url: `${req.protocol}://${req.get('host')}/uploads/${req.file.path.split('/').slice(-2).join('/')}`
    };

    // Here you would update the user's avatar in the database
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, {
      'avatar.url': avatarData.url
    });

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: avatarData
    });
  })
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 100MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name for file upload.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: error.message || 'File upload failed'
  });
});

module.exports = router;