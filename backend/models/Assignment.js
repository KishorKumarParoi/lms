const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide assignment title'],
    trim: true,
    maxlength: [100, 'Assignment title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide assignment description']
  },
  instructions: {
    type: String,
    required: [true, 'Please provide assignment instructions']
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: [true, 'Assignment must belong to a course']
  },
  lesson: {
    type: mongoose.Schema.ObjectId,
    ref: 'Lesson'
  },
  instructor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Assignment must have an instructor']
  },
  type: {
    type: String,
    enum: ['individual', 'group', 'peer-review'],
    default: 'individual'
  },
  submissionFormat: {
    type: String,
    enum: ['text', 'file', 'both', 'link'],
    default: 'both'
  },
  allowedFileTypes: [{
    type: String,
    enum: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'zip', 'mp4', 'mp3']
  }],
  maxFileSize: {
    type: Number,
    default: 10 // MB
  },
  maxFiles: {
    type: Number,
    default: 5
  },
  dueDate: {
    type: Date,
    required: [true, 'Please provide due date']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  maxScore: {
    type: Number,
    required: [true, 'Please provide maximum score'],
    min: [1, 'Maximum score must be at least 1']
  },
  passingScore: {
    type: Number,
    required: [true, 'Please provide passing score']
  },
  attempts: {
    allowed: {
      type: Number,
      default: 1,
      min: [1, 'At least one attempt must be allowed']
    },
    gradeHighest: {
      type: Boolean,
      default: true
    }
  },
  rubric: [{
    criteria: {
      type: String,
      required: true
    },
    description: String,
    points: {
      type: Number,
      required: true
    },
    levels: [{
      name: String,
      description: String,
      points: Number
    }]
  }],
  resources: [{
    title: String,
    description: String,
    type: {
      type: String,
      enum: ['document', 'link', 'video', 'image']
    },
    url: String,
    fileId: String
  }],
  settings: {
    allowLateSubmission: {
      type: Boolean,
      default: false
    },
    lateSubmissionPenalty: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    showGradeImmediately: {
      type: Boolean,
      default: false
    },
    allowResubmission: {
      type: Boolean,
      default: false
    },
    requireComment: {
      type: Boolean,
      default: false
    }
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishDate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for submissions
assignmentSchema.virtual('submissions', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'assignment',
  justOne: false
});

// Index for efficient queries
assignmentSchema.index({ course: 1, dueDate: 1 });
assignmentSchema.index({ instructor: 1, dueDate: 1 });
assignmentSchema.index({ dueDate: 1, isPublished: 1 });

// Check if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate;
});

// Check if assignment is active
assignmentSchema.virtual('isActive').get(function() {
  const now = new Date();
  return now >= this.startDate && now <= this.dueDate && this.isPublished;
});

// Method to check if file type is allowed
assignmentSchema.methods.isFileTypeAllowed = function(fileType) {
  return this.allowedFileTypes.length === 0 || this.allowedFileTypes.includes(fileType);
};

// Static method to get assignment statistics
assignmentSchema.statics.getAssignmentStats = async function(assignmentId) {
  const Submission = mongoose.model('Submission');
  
  const stats = await Submission.aggregate([
    { $match: { assignment: mongoose.Types.ObjectId(assignmentId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        averageScore: { $avg: '$grade.score' }
      }
    }
  ]);

  const totalSubmissions = await Submission.countDocuments({ assignment: assignmentId });
  const gradedSubmissions = await Submission.countDocuments({ 
    assignment: assignmentId, 
    'grade.isGraded': true 
  });

  return {
    statusBreakdown: stats,
    totalSubmissions,
    gradedSubmissions,
    pendingGrading: totalSubmissions - gradedSubmissions
  };
};

module.exports = mongoose.model('Assignment', assignmentSchema);


// Submission Schema
const submissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Assignment',
    required: [true, 'Submission must belong to an assignment']
  },
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Submission must have a student']
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  content: {
    text: String,
    files: [{
      originalName: String,
      filename: String,
      path: String,
      size: Number,
      mimeType: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    links: [String]
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned', 'late'],
    default: 'submitted'
  },
  isLate: {
    type: Boolean,
    default: false
  },
  grade: {
    score: {
      type: Number,
      min: 0
    },
    percentage: Number,
    letterGrade: String,
    feedback: String,
    rubricScores: [{
      criteria: String,
      score: Number,
      feedback: String
    }],
    gradedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    gradedAt: Date,
    isGraded: {
      type: Boolean,
      default: false
    }
  },
  feedback: [{
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  revision: {
    isRequested: {
      type: Boolean,
      default: false
    },
    requestedAt: Date,
    requestedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    comments: String
  }
}, {
  timestamps: true
});

// Compound index to ensure unique submission per attempt
submissionSchema.index({ assignment: 1, student: 1, attemptNumber: 1 }, { unique: true });

// Check if submission was late
submissionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Assignment = mongoose.model('Assignment');
    const assignment = await Assignment.findById(this.assignment);
    
    if (assignment && this.submittedAt > assignment.dueDate) {
      this.isLate = true;
      this.status = 'late';
    }
  }
  next();
});

// Calculate percentage and letter grade when score is set
submissionSchema.pre('save', async function(next) {
  if (this.isModified('grade.score')) {
    const Assignment = mongoose.model('Assignment');
    const assignment = await Assignment.findById(this.assignment);
    
    if (assignment && this.grade.score !== undefined) {
      this.grade.percentage = Math.round((this.grade.score / assignment.maxScore) * 100);
      
      // Calculate letter grade
      if (this.grade.percentage >= 90) this.grade.letterGrade = 'A';
      else if (this.grade.percentage >= 80) this.grade.letterGrade = 'B';
      else if (this.grade.percentage >= 70) this.grade.letterGrade = 'C';
      else if (this.grade.percentage >= 60) this.grade.letterGrade = 'D';
      else this.grade.letterGrade = 'F';
      
      this.grade.isGraded = true;
      this.grade.gradedAt = new Date();
      this.status = 'graded';
    }
  }
  next();
});

module.exports.Submission = mongoose.model('Submission', submissionSchema);