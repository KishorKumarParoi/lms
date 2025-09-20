const { asyncHandler } = require('../middleware/error');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Lesson = require('../models/Lesson');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
exports.getCourses = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortDir = req.query.sortDir || 'desc';
    const search = req.query.search || '';
    const category = req.query.category || '';
    const level = req.query.level || '';
    const priceRange = req.query.priceRange || '';
    const instructor = req.query.instructor || '';

    // Build query - Remove the published/approved filter for development
    const query = {};

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
        ];
    }

    if (category) {
        query.category = category;
    }

    if (level) {
        query.level = level;
    }

    if (instructor) {
        query.instructor = instructor;
    }

    if (priceRange) {
        const [min, max] = priceRange.split('-').map(Number);
        if (max) {
            query.price = { $gte: min, $lte: max };
        } else {
            query.price = { $gte: min };
        }
    }

    const startIndex = (page - 1) * limit;
    const total = await Course.countDocuments(query);

    const courses = await Course.find(query)
        .populate('instructor', 'name email avatar') // Fixed: use 'name' instead of 'firstName lastName'
        .select('-sections -reviews -resources')
        .sort({ [sortBy]: sortDir === 'desc' ? -1 : 1 })
        .limit(limit)
        .skip(startIndex);

    // Add enrollment count for each course
    const coursesWithStats = await Promise.all(
        courses.map(async (course) => {
            const enrollmentCount = await Enrollment.countDocuments({
                course: course._id,
                status: { $in: ['active', 'completed'] }
            });
            return {
                ...course.toObject(),
                enrollmentCount
            };
        })
    );

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
        count: courses.length,
        pagination,
        data: coursesWithStats
    });
});

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
exports.getCourse = asyncHandler(async (req, res, next) => {
    let course = await Course.findById(req.params.id)
        .populate('instructor', 'name email avatar bio socialLinks') // Fixed: use 'name'
        .populate('sections.lessons', 'title duration type isPreview');

    if (!course) {
        return res.status(404).json({
            success: false,
            message: 'Course not found'
        });
    }

    // Get enrollment statistics
    const enrollmentCount = await Enrollment.countDocuments({
        course: course._id,
        status: { $in: ['active', 'completed'] }
    });

    // Check if user is enrolled (if authenticated)
    let isEnrolled = false;
    if (req.user) {
        const enrollment = await Enrollment.findOne({
            course: course._id,
            student: req.user._id,
            status: { $in: ['active', 'completed'] }
        });
        isEnrolled = !!enrollment;
    }

    res.status(200).json({
        success: true,
        data: {
            ...course.toObject(),
            enrollmentCount,
            isEnrolled
        }
    });
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Instructor
exports.createCourse = asyncHandler(async (req, res, next) => {
    // For development, allow creating without authentication
    if (req.user) {
        req.body.instructor = req.user.id;
    }

    const course = await Course.create(req.body);

    res.status(201).json({
        success: true,
        data: course
    });
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Instructor/Admin
exports.updateCourse = asyncHandler(async (req, res, next) => {
    let course = await Course.findById(req.params.id);

    if (!course) {
        return res.status(404).json({
            success: false,
            message: 'Course not found'
        });
    }

    // For development, skip authorization check
    // if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'User not authorized to update this course'
    //   });
    // }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: course
    });
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Instructor/Admin
exports.deleteCourse = asyncHandler(async (req, res, next) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
        return res.status(404).json({
            success: false,
            message: 'Course not found'
        });
    }

    // For development, skip authorization and do hard delete
    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        data: {},
        message: 'Course deleted successfully'
    });
});

// @desc    Get courses by instructor
// @route   GET /api/courses/instructor/:instructorId
// @access  Public
exports.getCoursesByInstructor = asyncHandler(async (req, res, next) => {
    const courses = await Course.find({
        instructor: req.params.instructorId,
        status: 'published',
        isApproved: true
    })
        .populate('instructor', 'firstName lastName avatar')
        .select('-sections -reviews -resources')
        .sort('-createdAt');

    res.status(200).json({
        success: true,
        count: courses.length,
        data: courses
    });
});

// @desc    Add course review
// @route   POST /api/courses/:id/reviews
// @access  Private
exports.addCourseReview = asyncHandler(async (req, res, next) => {
    const { rating, comment } = req.body;
    const courseId = req.params.id;
    const userId = req.user.id;

    const course = await Course.findById(courseId);

    if (!course) {
        return res.status(404).json({
            success: false,
            message: 'Course not found'
        });
    }

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
        course: courseId,
        student: userId,
        status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
        return res.status(400).json({
            success: false,
            message: 'You must be enrolled in this course to leave a review'
        });
    }

    // Check if user already reviewed
    const existingReview = course.reviews.find(
        review => review.user.toString() === userId
    );

    if (existingReview) {
        return res.status(400).json({
            success: false,
            message: 'You have already reviewed this course'
        });
    }

    // Add review
    course.reviews.push({
        user: userId,
        rating,
        comment
    });

    await course.save();

    // Recalculate average rating
    await Course.getAverageRating(courseId);

    res.status(201).json({
        success: true,
        message: 'Review added successfully'
    });
});

// @desc    Publish course
// @route   PUT /api/courses/:id/publish
// @access  Private/Instructor
exports.publishCourse = asyncHandler(async (req, res, next) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
        return res.status(404).json({
            success: false,
            message: 'Course not found'
        });
    }

    // Make sure user is course instructor
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({
            success: false,
            message: 'User not authorized to publish this course'
        });
    }

    // Check if course has required content
    const lessons = await Lesson.find({ course: course._id });

    if (lessons.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Course must have at least one lesson to be published'
        });
    }

    course.status = 'published';
    course.publishedDate = new Date();
    await course.save();

    res.status(200).json({
        success: true,
        message: 'Course published successfully',
        data: course
    });
});

// @desc    Get course analytics
// @route   GET /api/courses/:id/analytics
// @access  Private/Instructor/Admin
exports.getCourseAnalytics = asyncHandler(async (req, res, next) => {
    const courseId = req.params.id;

    const course = await Course.findById(courseId);

    if (!course) {
        return res.status(404).json({
            success: false,
            message: 'Course not found'
        });
    }

    // Make sure user is course instructor or admin
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({
            success: false,
            message: 'User not authorized to view this course analytics'
        });
    }

    // Get enrollment statistics
    const enrollmentStats = await Enrollment.aggregate([
        { $match: { course: mongoose.Types.ObjectId(courseId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                averageProgress: { $avg: '$progress.completionPercentage' }
            }
        }
    ]);

    // Get revenue data
    const revenueData = await Enrollment.aggregate([
        {
            $match: {
                course: mongoose.Types.ObjectId(courseId),
                'paymentDetails.amount': { $exists: true }
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$paymentDetails.amount' },
                totalEnrollments: { $sum: 1 }
            }
        }
    ]);

    // Get monthly enrollment trend (last 12 months)
    const monthlyTrend = await Enrollment.aggregate([
        {
            $match: {
                course: mongoose.Types.ObjectId(courseId),
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
                enrollments: { $sum: 1 },
                revenue: { $sum: '$paymentDetails.amount' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            enrollmentStats,
            revenue: revenueData[0] || { totalRevenue: 0, totalEnrollments: 0 },
            monthlyTrend,
            courseInfo: {
                title: course.title,
                rating: course.rating,
                totalLectures: course.totalLectures,
                createdAt: course.createdAt
            }
        }
    });
});

module.exports = exports;