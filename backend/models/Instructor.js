const mongoose = require('mongoose');

const instructorSchema = new mongoose.Schema({
    // Reference to User account
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
        unique: true
    },

    // Professional Information
    title: {
        type: String,
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },

    bio: {
        type: String,
        maxlength: [2000, 'Bio cannot exceed 2000 characters']
    },

    shortBio: {
        type: String,
        maxlength: [500, 'Short bio cannot exceed 500 characters']
    },

    expertise: [{
        type: String,
        trim: true,
        maxlength: [100, 'Expertise area cannot exceed 100 characters']
    }],

    // Experience and Qualifications
    experience: {
        type: Number,
        min: [0, 'Experience cannot be negative'],
        default: 0 // Years of experience
    },

    qualifications: [{
        degree: {
            type: String,
            required: true,
            trim: true
        },
        institution: {
            type: String,
            required: true,
            trim: true
        },
        year: {
            type: Number,
            min: [1950, 'Year must be after 1950'],
            max: [new Date().getFullYear(), 'Year cannot be in the future']
        },
        field: {
            type: String,
            trim: true
        }
    }],

    // Professional Experience
    workExperience: [{
        position: {
            type: String,
            required: true,
            trim: true
        },
        company: {
            type: String,
            required: true,
            trim: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: Date,
        isCurrent: {
            type: Boolean,
            default: false
        },
        description: {
            type: String,
            maxlength: [1000, 'Description cannot exceed 1000 characters']
        }
    }],

    // Teaching Information
    teachingAreas: [{
        type: String,
        enum: [
            'Web Development',
            'Mobile Development',
            'Data Science',
            'Machine Learning',
            'AI',
            'DevOps',
            'Cloud Computing',
            'Cybersecurity',
            'UI/UX Design',
            'Database',
            'Programming Languages',
            'Software Engineering',
            'Project Management',
            'Digital Marketing',
            'Other'
        ]
    }],

    languages: [{
        language: {
            type: String,
            required: true,
            trim: true
        },
        proficiency: {
            type: String,
            enum: ['native', 'fluent', 'conversational', 'basic'],
            default: 'conversational'
        }
    }],

    // Contact and Social Information
    website: {
        type: String,
        match: [
            /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
            'Please provide a valid website URL'
        ]
    },

    socialLinks: {
        linkedin: {
            type: String,
            match: [
                /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/,
                'Please provide a valid LinkedIn URL'
            ]
        },
        twitter: {
            type: String,
            match: [
                /^https?:\/\/(www\.)?twitter\.com\/[a-zA-Z0-9_]+\/?$/,
                'Please provide a valid Twitter URL'
            ]
        },
        github: {
            type: String,
            match: [
                /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/?$/,
                'Please provide a valid GitHub URL'
            ]
        },
        youtube: {
            type: String,
            match: [
                /^https?:\/\/(www\.)?youtube\.com\/(channel\/|c\/|user\/)[a-zA-Z0-9-_]+\/?$/,
                'Please provide a valid YouTube URL'
            ]
        },
        portfolio: {
            type: String,
            match: [
                /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
                'Please provide a valid portfolio URL'
            ]
        }
    },

    // Teaching Statistics
    stats: {
        totalStudents: {
            type: Number,
            default: 0,
            min: [0, 'Total students cannot be negative']
        },
        totalCourses: {
            type: Number,
            default: 0,
            min: [0, 'Total courses cannot be negative']
        },
        totalHoursTeaching: {
            type: Number,
            default: 0,
            min: [0, 'Total hours cannot be negative']
        },
        averageRating: {
            type: Number,
            min: [0, 'Rating cannot be less than 0'],
            max: [5, 'Rating cannot be more than 5'],
            default: 0
        },
        totalReviews: {
            type: Number,
            default: 0,
            min: [0, 'Total reviews cannot be negative']
        }
    },

    // Instructor Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending', 'suspended'],
        default: 'pending'
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    verificationDate: Date,

    // Preferences
    preferences: {
        emailNotifications: {
            newEnrollment: { type: Boolean, default: true },
            courseCompletion: { type: Boolean, default: true },
            newReview: { type: Boolean, default: true },
            messageReceived: { type: Boolean, default: true }
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        currency: {
            type: String,
            enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'],
            default: 'USD'
        }
    },

    // Payment Information
    paymentInfo: {
        paypalEmail: String,
        stripeAccountId: String,
        bankDetails: {
            accountName: String,
            accountNumber: String,
            bankName: String,
            routingNumber: String
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
instructorSchema.index({ user: 1 });
instructorSchema.index({ status: 1 });
instructorSchema.index({ 'stats.averageRating': -1 });
instructorSchema.index({ expertise: 1 });
instructorSchema.index({ teachingAreas: 1 });

// Virtual populate courses
instructorSchema.virtual('courses', {
    ref: 'Course',
    localField: 'user',
    foreignField: 'instructor',
    justOne: false
});

// Virtual for full name (from user reference)
instructorSchema.virtual('fullName').get(function () {
    return this.user?.name || 'Unknown Instructor';
});

// Virtual for profile completion percentage
instructorSchema.virtual('profileCompletion').get(function () {
    let completion = 0;
    const totalFields = 10;

    if (this.bio) completion += 1;
    if (this.expertise && this.expertise.length > 0) completion += 1;
    if (this.qualifications && this.qualifications.length > 0) completion += 1;
    if (this.workExperience && this.workExperience.length > 0) completion += 1;
    if (this.teachingAreas && this.teachingAreas.length > 0) completion += 1;
    if (this.languages && this.languages.length > 0) completion += 1;
    if (this.socialLinks && Object.keys(this.socialLinks).length > 0) completion += 1;
    if (this.website) completion += 1;
    if (this.title) completion += 1;
    if (this.user?.avatar) completion += 1;

    return Math.round((completion / totalFields) * 100);
});

// Pre-save middleware to update stats
instructorSchema.pre('save', async function (next) {
    if (this.isModified('stats.totalStudents') || this.isModified('stats.totalCourses')) {
        // Recalculate stats if needed
        const Course = mongoose.model('Course');
        const Enrollment = mongoose.model('Enrollment');

        try {
            const courseCount = await Course.countDocuments({ instructor: this.user });
            const courses = await Course.find({ instructor: this.user }).select('_id');
            const courseIds = courses.map(course => course._id);

            const studentCount = await Enrollment.distinct('student', {
                course: { $in: courseIds },
                status: { $in: ['active', 'completed'] }
            });

            this.stats.totalCourses = courseCount;
            this.stats.totalStudents = studentCount.length;
        } catch (error) {
            console.error('Error updating instructor stats:', error);
        }
    }
    next();
});

// Instance method to update teaching stats
instructorSchema.methods.updateStats = async function () {
    const Course = mongoose.model('Course');
    const Enrollment = mongoose.model('Enrollment');

    try {
        // Get all courses by this instructor
        const courses = await Course.find({ instructor: this.user })
            .select('_id averageRating totalReviews');

        const courseIds = courses.map(course => course._id);

        // Count unique students
        const uniqueStudents = await Enrollment.distinct('student', {
            course: { $in: courseIds },
            status: { $in: ['active', 'completed'] }
        });

        // Calculate average rating across all courses
        let totalRating = 0;
        let totalReviews = 0;

        courses.forEach(course => {
            if (course.averageRating && course.totalReviews) {
                totalRating += course.averageRating * course.totalReviews;
                totalReviews += course.totalReviews;
            }
        });

        this.stats.totalCourses = courses.length;
        this.stats.totalStudents = uniqueStudents.length;
        this.stats.totalReviews = totalReviews;
        this.stats.averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

        await this.save();
        return this.stats;
    } catch (error) {
        throw new Error('Failed to update instructor stats: ' + error.message);
    }
};

// Static method to get top instructors
instructorSchema.statics.getTopInstructors = function (limit = 10) {
    return this.find({ status: 'active', isVerified: true })
        .populate('user', 'name email avatar')
        .sort({ 'stats.averageRating': -1, 'stats.totalStudents': -1 })
        .limit(limit);
};

// Static method to search instructors
instructorSchema.statics.searchInstructors = function (query, options = {}) {
    const {
        expertise,
        teachingAreas,
        minRating = 0,
        minExperience = 0,
        language,
        sortBy = 'stats.averageRating',
        sortDir = -1,
        limit = 20,
        page = 1
    } = options;

    const searchQuery = {
        status: 'active',
        isVerified: true,
        'stats.averageRating': { $gte: minRating },
        experience: { $gte: minExperience }
    };

    if (query) {
        searchQuery.$or = [
            { bio: { $regex: query, $options: 'i' } },
            { expertise: { $in: [new RegExp(query, 'i')] } },
            { teachingAreas: { $in: [new RegExp(query, 'i')] } }
        ];
    }

    if (expertise) {
        searchQuery.expertise = { $in: expertise };
    }

    if (teachingAreas) {
        searchQuery.teachingAreas = { $in: teachingAreas };
    }

    if (language) {
        searchQuery['languages.language'] = language;
    }

    const skip = (page - 1) * limit;

    return this.find(searchQuery)
        .populate('user', 'name email avatar')
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit);
};

module.exports = mongoose.model('Instructor', instructorSchema);