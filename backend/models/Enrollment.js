const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Enrollment must have a student']
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: [true, 'Enrollment must be for a course']
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'dropped', 'suspended'],
    default: 'active'
  },
  progress: {
    completedLessons: [{
      lesson: {
        type: mongoose.Schema.ObjectId,
        ref: 'Lesson'
      },
      completedAt: {
        type: Date,
        default: Date.now
      },
      watchTime: Number, // in seconds
      score: Number // for quizzes/assignments
    }],
    currentLesson: {
      type: mongoose.Schema.ObjectId,
      ref: 'Lesson'
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now
    }
  },
  completionDate: Date,
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateId: String,
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    reviewDate: Date
  },
  paymentDetails: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    paymentMethod: String,
    transactionId: String,
    paymentDate: Date,
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'approved', 'processed'],
      default: 'none'
    }
  },
  notes: String,
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure one enrollment per student per course
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Index for efficient queries
enrollmentSchema.index({ student: 1, status: 1 });
enrollmentSchema.index({ course: 1, status: 1 });
enrollmentSchema.index({ enrollmentDate: -1 });

// Virtual for total study time
enrollmentSchema.virtual('totalStudyTime').get(function() {
  return this.progress.completedLessons.reduce((total, lesson) => {
    return total + (lesson.watchTime || 0);
  }, 0);
});

// Method to update progress
enrollmentSchema.methods.updateProgress = async function() {
  const Course = mongoose.model('Course');
  const Lesson = mongoose.model('Lesson');

  try {
    // Get total lessons in the course
    const course = await Course.findById(this.course);
    const totalLessons = await Lesson.countDocuments({ 
      course: this.course, 
      isPublished: true 
    });

    if (totalLessons > 0) {
      const completedCount = this.progress.completedLessons.length;
      this.progress.completionPercentage = Math.round((completedCount / totalLessons) * 100);

      // Mark as completed if all lessons are done
      if (this.progress.completionPercentage >= 100 && this.status === 'active') {
        this.status = 'completed';
        this.completionDate = new Date();
      }

      // Update last accessed
      this.progress.lastAccessedAt = new Date();

      await this.save();
    }
  } catch (error) {
    console.error('Error updating progress:', error);
  }
};

// Method to mark lesson as completed
enrollmentSchema.methods.markLessonCompleted = async function(lessonId, watchTime = 0, score = null) {
  // Check if lesson is already completed
  const existingProgress = this.progress.completedLessons.find(
    cl => cl.lesson.toString() === lessonId.toString()
  );

  if (!existingProgress) {
    this.progress.completedLessons.push({
      lesson: lessonId,
      completedAt: new Date(),
      watchTime,
      score
    });

    // Update current lesson to next lesson
    const Lesson = mongoose.model('Lesson');
    const currentLesson = await Lesson.findById(lessonId);
    const nextLesson = await currentLesson.getNextLesson();
    
    if (nextLesson) {
      this.progress.currentLesson = nextLesson._id;
    }

    await this.updateProgress();
  }

  return this;
};

// Method to check if lesson is completed
enrollmentSchema.methods.isLessonCompleted = function(lessonId) {
  return this.progress.completedLessons.some(
    cl => cl.lesson.toString() === lessonId.toString()
  );
};

// Method to get completion statistics
enrollmentSchema.methods.getCompletionStats = async function() {
  const Lesson = mongoose.model('Lesson');
  
  const totalLessons = await Lesson.countDocuments({ 
    course: this.course, 
    isPublished: true 
  });
  
  const completedLessons = this.progress.completedLessons.length;
  
  return {
    totalLessons,
    completedLessons,
    completionPercentage: this.progress.completionPercentage,
    totalStudyTime: this.totalStudyTime,
    enrollmentDate: this.enrollmentDate,
    lastAccessed: this.progress.lastAccessedAt
  };
};

// Static method to get enrollment statistics for a course
enrollmentSchema.statics.getCourseStats = async function(courseId) {
  const stats = await this.aggregate([
    { $match: { course: mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        averageProgress: { $avg: '$progress.completionPercentage' }
      }
    }
  ]);

  return stats;
};

// Method to generate certificate
enrollmentSchema.methods.generateCertificate = async function() {
  if (this.status === 'completed' && !this.certificateIssued) {
    this.certificateId = `CERT-${Date.now()}-${this._id}`;
    this.certificateIssued = true;
    await this.save();
    return this.certificateId;
  }
  return null;
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);