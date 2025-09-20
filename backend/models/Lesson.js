const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide lesson title'],
        trim: true,
        maxlength: [100, 'Lesson title cannot exceed 100 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    course: {
        type: mongoose.Schema.ObjectId,
        ref: 'Course',
        required: [true, 'Lesson must belong to a course']
    },
    section: {
        type: String,
        required: [true, 'Lesson must belong to a section']
    },
    order: {
        type: Number,
        required: [true, 'Lesson must have an order']
    },
    type: {
        type: String,
        required: [true, 'Please specify lesson type'],
        enum: ['video', 'text', 'quiz', 'assignment', 'live']
    },
    content: {
        // For video lessons
        video: {
            public_id: String,
            url: String,
            duration: Number, // in seconds
            thumbnail: {
                public_id: String,
                url: String
            }
        },
        // For text lessons
        text: {
            body: String,
            estimatedReadTime: Number // in minutes
        },
        // For quiz lessons
        quiz: {
            questions: [{
                question: {
                    type: String,
                    required: true
                },
                type: {
                    type: String,
                    enum: ['multiple-choice', 'true-false', 'short-answer'],
                    required: true
                },
                options: [String], // For multiple choice
                correctAnswer: mongoose.Schema.Types.Mixed, // Can be string, number, or array
                explanation: String,
                points: {
                    type: Number,
                    default: 1
                }
            }],
            timeLimit: Number, // in minutes
            passingScore: {
                type: Number,
                default: 70
            },
            attempts: {
                type: Number,
                default: 3
            },
            showResults: {
                type: Boolean,
                default: true
            }
        },
        // For assignment lessons
        assignment: {
            instructions: {
                type: String,
                required: function () {
                    return this.type === 'assignment';
                }
            },
            dueDate: Date,
            maxScore: {
                type: Number,
                default: 100
            },
            submissionFormat: {
                type: String,
                enum: ['text', 'file', 'both'],
                default: 'both'
            },
            allowedFileTypes: [String],
            maxFileSize: {
                type: Number,
                default: 10 // MB
            }
        }
    },
    resources: [{
        title: String,
        description: String,
        type: {
            type: String,
            enum: ['document', 'link', 'video', 'audio', 'image']
        },
        url: String,
        fileId: String,
        downloadable: {
            type: Boolean,
            default: false
        }
    }],
    duration: {
        type: Number, // in minutes
        default: 0
    },
    isPreview: {
        type: Boolean,
        default: false
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    settings: {
        allowComments: {
            type: Boolean,
            default: true
        },
        allowNotes: {
            type: Boolean,
            default: true
        },
        autoPlay: {
            type: Boolean,
            default: false
        },
        showTranscript: {
            type: Boolean,
            default: false
        }
    },
    transcript: String,
    notes: String, // Instructor notes
    completionCriteria: {
        type: String,
        enum: ['view', 'time-based', 'quiz-pass', 'assignment-submit'],
        default: 'view'
    },
    requiredWatchTime: {
        type: Number, // percentage of video that must be watched
        default: 80,
        min: 0,
        max: 100
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for efficient querying
lessonSchema.index({ course: 1, order: 1 });
lessonSchema.index({ course: 1, section: 1, order: 1 });

// Virtual for comments
lessonSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'lesson',
    justOne: false
});

// Virtual for progress tracking
lessonSchema.virtual('progress', {
    ref: 'Progress',
    localField: '_id',
    foreignField: 'lesson',
    justOne: false
});

// Method to check if lesson is accessible to user
lessonSchema.methods.isAccessibleTo = function (userId, userRole) {
    if (this.isPreview) return true;
    if (userRole === 'admin' || userRole === 'instructor') return true;
    // Would need to check enrollment status in controller
    return false;
};

// Method to get next lesson
lessonSchema.methods.getNextLesson = async function () {
    return await this.model('Lesson').findOne({
        course: this.course,
        order: { $gt: this.order }
    }).sort({ order: 1 });
};

// Method to get previous lesson
lessonSchema.methods.getPreviousLesson = async function () {
    return await this.model('Lesson').findOne({
        course: this.course,
        order: { $lt: this.order }
    }).sort({ order: -1 });
};

// Static method to reorder lessons
lessonSchema.statics.reorderLessons = async function (courseId, sectionName, lessonIds) {
    const bulkOps = lessonIds.map((lessonId, index) => ({
        updateOne: {
            filter: { _id: lessonId, course: courseId, section: sectionName },
            update: { order: index + 1 }
        }
    }));

    return await this.bulkWrite(bulkOps);
};

module.exports = mongoose.model('Lesson', lessonSchema);