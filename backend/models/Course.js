const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide course title'],
    trim: true,
    maxlength: [100, 'Course title cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Please provide course description'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  instructor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Course must have an instructor']
  },
  category: {
    type: String,
    required: [true, 'Please provide course category'],
    enum: [
      'Web Development',
      'Mobile Development',
      'Data Science',
      'Machine Learning',
      'Artificial Intelligence',
      'Cybersecurity',
      'Cloud Computing',
      'DevOps',
      'UI/UX Design',
      'Digital Marketing',
      'Business',
      'Photography',
      'Music',
      'Language',
      'Other'
    ]
  },
  level: {
    type: String,
    required: [true, 'Please specify course level'],
    enum: ['Beginner', 'Intermediate', 'Advanced']
  },
  language: {
    type: String,
    default: 'English'
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative']
  },
  discountPrice: {
    type: Number,
    min: [0, 'Discount price cannot be negative']
  },
  thumbnail: {
    public_id: String,
    url: String
  },
  previewVideo: {
    public_id: String,
    url: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  requirements: [{
    type: String,
    trim: true
  }],
  learningObjectives: [{
    type: String,
    required: [true, 'Please provide at least one learning objective'],
    trim: true
  }],
  targetAudience: [{
    type: String,
    trim: true
  }],
  duration: {
    hours: {
      type: Number,
      default: 0
    },
    minutes: {
      type: Number,
      default: 0
    }
  },
  totalLectures: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  publishedDate: Date,
  lastUpdated: Date,
  enrollmentCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5']
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  sections: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    order: {
      type: Number,
      required: true
    },
    lessons: [{
      type: mongoose.Schema.ObjectId,
      ref: 'Lesson'
    }]
  }],
  resources: [{
    title: String,
    description: String,
    type: {
      type: String,
      enum: ['document', 'link', 'video', 'audio', 'image']
    },
    url: String,
    fileId: String
  }],
  faq: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    }
  }],
  certificate: {
    enabled: {
      type: Boolean,
      default: true
    },
    template: String
  },
  settings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowReviews: {
      type: Boolean,
      default: true
    },
    allowDownloads: {
      type: Boolean,
      default: false
    },
    autoEnroll: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug from title
courseSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Update lastUpdated on save
courseSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }
  next();
});

// Virtual for total duration in minutes
courseSchema.virtual('totalDurationMinutes').get(function() {
  return (this.duration.hours * 60) + this.duration.minutes;
});

// Virtual for enrollment data
courseSchema.virtual('enrollments', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'course',
  justOne: false
});

// Virtual for lessons
courseSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'course',
  justOne: false
});

// Static method to calculate average rating
courseSchema.statics.getAverageRating = async function(courseId) {
  const obj = await this.aggregate([
    {
      $match: { _id: courseId }
    },
    {
      $unwind: '$reviews'
    },
    {
      $group: {
        _id: '$_id',
        averageRating: { $avg: '$reviews.rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  try {
    if (obj[0]) {
      await this.findByIdAndUpdate(courseId, {
        'rating.average': Math.ceil(obj[0].averageRating * 10) / 10,
        'rating.count': obj[0].reviewCount
      });
    } else {
      await this.findByIdAndUpdate(courseId, {
        'rating.average': 0,
        'rating.count': 0
      });
    }
  } catch (err) {
    console.error('Error calculating average rating:', err);
  }
};

// Method to check if user can access course
courseSchema.methods.canUserAccess = function(userId) {
  if (this.price === 0) return true;
  // This would be checked against enrollments in the controller
  return false;
};

module.exports = mongoose.model('Course', courseSchema);