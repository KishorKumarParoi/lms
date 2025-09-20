const { asyncHandler } = require('../middleware/error');
const Instructor = require('../models/Instructor');
const User = require('../models/User');
const Course = require('../models/Course');

// @desc    Get all instructors
// @route   GET /api/instructors
// @access  Public
exports.getInstructors = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const search = req.query.search || '';
    const expertise = req.query.expertise ? req.query.expertise.split(',') : null;
    const teachingAreas = req.query.teachingAreas ? req.query.teachingAreas.split(',') : null;
    const minRating = parseFloat(req.query.minRating) || 0;
    const minExperience = parseInt(req.query.minExperience) || 0;

    const options = {
        expertise,
        teachingAreas,
        minRating,
        minExperience,
        limit,
        page,
        sortBy: req.query.sortBy || 'stats.averageRating',
        sortDir: req.query.sortDir === 'asc' ? 1 : -1
    };

    const instructors = await Instructor.searchInstructors(search, options);
    const total = await Instructor.countDocuments({
        status: 'active',
        isVerified: true
    });

    // Pagination
    const pagination = {};
    const startIndex = (page - 1) * limit;

    if (startIndex > 0) {
        pagination.prev = { page: page - 1, limit };
    }

    if (startIndex + limit < total) {
        pagination.next = { page: page + 1, limit };
    }

    res.status(200).json({
        success: true,
        count: instructors.length,
        pagination,
        data: instructors
    });
});

// @desc    Get single instructor
// @route   GET /api/instructors/:id
// @access  Public
exports.getInstructor = asyncHandler(async (req, res, next) => {
    const instructor = await Instructor.findById(req.params.id)
        .populate('user', 'name email avatar createdAt')
        .populate('courses');

    if (!instructor) {
        return res.status(404).json({
            success: false,
            message: 'Instructor not found'
        });
    }

    res.status(200).json({
        success: true,
        data: instructor
    });
});

// @desc    Get instructor by user ID
// @route   GET /api/instructors/user/:userId
// @access  Public
exports.getInstructorByUser = asyncHandler(async (req, res, next) => {
    const instructor = await Instructor.findOne({ user: req.params.userId })
        .populate('user', 'name email avatar createdAt')
        .populate('courses');

    if (!instructor) {
        return res.status(404).json({
            success: false,
            message: 'Instructor profile not found'
        });
    }

    res.status(200).json({
        success: true,
        data: instructor
    });
});

// @desc    Create instructor profile
// @route   POST /api/instructors
// @access  Private
exports.createInstructor = asyncHandler(async (req, res, next) => {
    // Check if instructor profile already exists
    const existingInstructor = await Instructor.findOne({ user: req.body.user || req.user?.id });

    if (existingInstructor) {
        return res.status(400).json({
            success: false,
            message: 'Instructor profile already exists for this user'
        });
    }

    // Set user reference
    if (!req.body.user && req.user) {
        req.body.user = req.user.id;
    }

    // Verify the user exists and has instructor role
    const user = await User.findById(req.body.user);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Update user role to instructor if not already
    if (user.role !== 'instructor' && user.role !== 'admin') {
        user.role = 'instructor';
        await user.save();
    }

    const instructor = await Instructor.create(req.body);

    // Populate the user data in response
    await instructor.populate('user', 'name email avatar');

    res.status(201).json({
        success: true,
        data: instructor
    });
});

// @desc    Update instructor profile
// @route   PUT /api/instructors/:id
// @access  Private
exports.updateInstructor = asyncHandler(async (req, res, next) => {
    let instructor = await Instructor.findById(req.params.id);

    if (!instructor) {
        return res.status(404).json({
            success: false,
            message: 'Instructor not found'
        });
    }

    // Check ownership (unless admin)
    if (req.user && instructor.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to update this instructor profile'
        });
    }

    instructor = await Instructor.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate('user', 'name email avatar');

    res.status(200).json({
        success: true,
        data: instructor
    });
});

// @desc    Delete instructor profile
// @route   DELETE /api/instructors/:id
// @access  Private
exports.deleteInstructor = asyncHandler(async (req, res, next) => {
    const instructor = await Instructor.findById(req.params.id);

    if (!instructor) {
        return res.status(404).json({
            success: false,
            message: 'Instructor not found'
        });
    }

    // Check ownership (unless admin)
    if (req.user && instructor.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to delete this instructor profile'
        });
    }

    await Instructor.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        data: {},
        message: 'Instructor profile deleted successfully'
    });
});

// @desc    Get top instructors
// @route   GET /api/instructors/top/:limit
// @access  Public
exports.getTopInstructors = asyncHandler(async (req, res, next) => {
    const limit = parseInt(req.params.limit) || 10;

    const instructors = await Instructor.getTopInstructors(limit);

    res.status(200).json({
        success: true,
        count: instructors.length,
        data: instructors
    });
});

// @desc    Update instructor stats
// @route   PUT /api/instructors/:id/stats
// @access  Private
exports.updateInstructorStats = asyncHandler(async (req, res, next) => {
    const instructor = await Instructor.findById(req.params.id);

    if (!instructor) {
        return res.status(404).json({
            success: false,
            message: 'Instructor not found'
        });
    }

    const updatedStats = await instructor.updateStats();

    res.status(200).json({
        success: true,
        data: updatedStats
    });
});

module.exports = exports;