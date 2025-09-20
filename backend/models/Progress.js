const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Progress must belong to a user']
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: [true, 'Progress must be for a course']
  },
  lesson: {
    type: mongoose.Schema.ObjectId,
    ref: 'Lesson',
    required: [true, 'Progress must be for a lesson']
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  watchTime: {
    type: Number,
    default: 0 // in seconds
  },
  totalWatchTime: {
    type: Number,
    default: 0 // total accumulated watch time
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  completedAt: Date,
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  bookmarks: [{
    timestamp: {
      type: Number,
      required: true // in seconds
    },
    note: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: [{
    content: {
      type: String,
      required: true
    },
    timestamp: Number, // for video lessons
    isPrivate: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date
  }],
  quiz: {
    attempts: [{
      attemptNumber: Number,
      answers: [{
        questionId: String,
        answer: mongoose.Schema.Types.Mixed,
        isCorrect: Boolean,
        points: Number
      }],
      score: Number,
      percentage: Number,
      startedAt: {
        type: Date,
        default: Date.now
      },
      completedAt: Date,
      timeSpent: Number // in seconds
    }],
    highestScore: {
      type: Number,
      default: 0
    },
    bestAttempt: Number,
    passed: {
      type: Boolean,
      default: false
    }
  },
  interactions: [{
    type: {
      type: String,
      enum: ['play', 'pause', 'seek', 'speed-change', 'quality-change', 'fullscreen'],
      required: true
    },
    timestamp: Number, // video timestamp
    value: String, // additional data (speed, quality, etc.)
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    playbackSpeed: {
      type: Number,
      default: 1.0
    },
    volume: {
      type: Number,
      default: 1.0
    },
    quality: {
      type: String,
      default: 'auto'
    },
    subtitles: {
      enabled: {
        type: Boolean,
        default: false
      },
      language: {
        type: String,
        default: 'en'
      }
    }
  }
}, {
  timestamps: true
});

// Compound index for unique progress per user per lesson
progressSchema.index({ user: 1, lesson: 1 }, { unique: true });

// Indexes for efficient queries
progressSchema.index({ user: 1, course: 1 });
progressSchema.index({ course: 1, status: 1 });
progressSchema.index({ user: 1, status: 1 });
progressSchema.index({ lastAccessedAt: -1 });

// Update last accessed time on save
progressSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastAccessedAt = new Date();
  }
  next();
});

// Method to update watch time
progressSchema.methods.updateWatchTime = function(seconds) {
  this.watchTime = Math.max(this.watchTime, seconds);
  this.totalWatchTime += seconds;
  
  // Update completion percentage for video lessons
  if (this.lesson.type === 'video' && this.lesson.content.video.duration) {
    const percentage = Math.min(
      Math.round((this.watchTime / this.lesson.content.video.duration) * 100),
      100
    );
    this.completionPercentage = percentage;
    
    // Mark as completed if watched enough
    if (percentage >= (this.lesson.requiredWatchTime || 80) && this.status !== 'completed') {
      this.status = 'completed';
      this.completedAt = new Date();
    } else if (percentage > 0 && this.status === 'not-started') {
      this.status = 'in-progress';
    }
  }
  
  return this.save();
};

// Method to add bookmark
progressSchema.methods.addBookmark = function(timestamp, note = '') {
  this.bookmarks.push({
    timestamp,
    note
  });
  return this.save();
};

// Method to remove bookmark
progressSchema.methods.removeBookmark = function(bookmarkId) {
  this.bookmarks.id(bookmarkId).remove();
  return this.save();
};

// Method to add note
progressSchema.methods.addNote = function(content, timestamp = null, isPrivate = true) {
  this.notes.push({
    content,
    timestamp,
    isPrivate
  });
  return this.save();
};

// Method to update note
progressSchema.methods.updateNote = function(noteId, content) {
  const note = this.notes.id(noteId);
  if (note) {
    note.content = content;
    note.updatedAt = new Date();
    return this.save();
  }
  return null;
};

// Method to record quiz attempt
progressSchema.methods.recordQuizAttempt = function(answers, score, timeSpent) {
  const attemptNumber = this.quiz.attempts.length + 1;
  const totalPossibleScore = this.lesson.content.quiz.questions.reduce(
    (total, q) => total + (q.points || 1), 
    0
  );
  const percentage = Math.round((score / totalPossibleScore) * 100);
  
  const attempt = {
    attemptNumber,
    answers,
    score,
    percentage,
    completedAt: new Date(),
    timeSpent
  };
  
  this.quiz.attempts.push(attempt);
  
  // Update highest score and best attempt
  if (score > this.quiz.highestScore) {
    this.quiz.highestScore = score;
    this.quiz.bestAttempt = attemptNumber;
  }
  
  // Check if passed
  const passingScore = this.lesson.content.quiz.passingScore || 70;
  this.quiz.passed = percentage >= passingScore;
  
  // Update lesson progress
  if (this.quiz.passed) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.completionPercentage = 100;
  } else if (this.status === 'not-started') {
    this.status = 'in-progress';
    this.completionPercentage = Math.min(percentage, 99);
  }
  
  return this.save();
};

// Method to record interaction
progressSchema.methods.recordInteraction = function(type, timestamp, value) {
  this.interactions.push({
    type,
    timestamp,
    value
  });
  
  // Limit interactions to last 100 to prevent document bloat
  if (this.interactions.length > 100) {
    this.interactions = this.interactions.slice(-100);
  }
  
  return this.save();
};

// Static method to get user progress for a course
progressSchema.statics.getUserCourseProgress = async function(userId, courseId) {
  const Lesson = mongoose.model('Lesson');
  
  // Get all lessons in the course
  const lessons = await Lesson.find({ course: courseId, isPublished: true })
    .sort({ order: 1 });
  
  // Get user progress for all lessons
  const progressData = await this.find({
    user: userId,
    course: courseId
  }).populate('lesson', 'title type order');
  
  // Calculate overall progress
  const totalLessons = lessons.length;
  const completedLessons = progressData.filter(p => p.status === 'completed').length;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  return {
    totalLessons,
    completedLessons,
    overallProgress,
    progressData,
    lastAccessedAt: Math.max(...progressData.map(p => p.lastAccessedAt.getTime()))
  };
};

// Static method to get learning analytics
progressSchema.statics.getLearningAnalytics = async function(userId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$lastAccessedAt" }
        },
        totalWatchTime: { $sum: "$totalWatchTime" },
        lessonsAccessed: { $sum: 1 },
        lessonsCompleted: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ];
  
  return await this.aggregate(pipeline);
};

module.exports = mongoose.model('Progress', progressSchema);