# 🗄️ LMS Database Schema Mindmap

```
                                    🎓 LMS DATABASE SCHEMA
                                            |
                    ┌─────────────────────────┴─────────────────────────┐
                    |                                                   |
                📊 CORE ENTITIES                                    🔗 RELATIONSHIP MODELS
                    |                                                   |
        ┌───────────┼───────────┐                                      |
        |           |           |                                      |
    👤 USER      📚 COURSE   📖 LESSON                         ┌───────┼───────┐
        |           |           |                             |       |       |
        |           |           |                        📝 ASSIGNMENT | 🎯 PROGRESS
        |           |           |                             |       |       |
        |           |           |                             |   📋 ENROLLMENT
        |           |           |                             |       |
        |           |           |                             └───────┼───────┘
        |           |           |                                     |
    ┌───┴───┐   ┌───┴───┐   ┌───┴───┐                              🔄 JOINS
    |       |   |       |   |       |
   FIELDS ROLES| CONTENT | CONTENT |
    |       |   | TYPES |   | TYPES |
    |       |   |       |   |       |
    |   ┌───┴───┴───┐   |   |   ┌───┴───────────┐
    |   |   ENUM    |   |   |   |    UNION      |
    |   |           |   |   |   |               |
    |   | • student |   |   |   | • video       |
    |   | • instructor |   |   | • text        |
    |   | • admin   |   |   |   | • quiz        |
    |   └───────────┘   |   |   | • assignment  |
    |                   |   |   | • live        |
    |                   |   |   └───────────────┘
    |                   |   |
┌───┴─────────────────┐ |   |
|   USER FIELDS       | |   |
|                     | |   |
| • firstName         | |   |
| • lastName          | |   |
| • email (unique)    | |   |
| • password          | |   |
| • role              | |   |
| • avatar            | |   |
| • bio               | |   |
| • phone             | |   |
| • dateOfBirth       | |   |
| • address           | |   |
| • socialLinks       | |   |
| • isVerified        | |   |
| • isActive          | |   |
| • preferences       | |   |
| • certifications   | |   |
| • skills            | |   |
| • experience        | |   |
└─────────────────────┘ |   |
                        |   |
                    ┌───┴───┴─────────────────┐
                    |   COURSE FIELDS         |
                    |                         |
                    | • title                 |
                    | • slug (unique)         |
                    | • description           |
                    | • shortDescription      |
                    | • instructor (ref:User) |
                    | • category (enum)       |
                    | • level (enum)          |
                    | • language              |
                    | • price                 |
                    | • discountPrice         |
                    | • currency              |
                    | • thumbnail             |
                    | • trailer               |
                    | • duration              |
                    | • totalLessons          |
                    | • requirements          |
                    | • objectives            |
                    | • targetAudience        |
                    | • sections              |
                    | • tags                  |
                    | • difficulty            |
                    | • certificate           |
                    | • isPublished           |
                    | • isFeatured            |
                    | • rating                |
                    | • enrollmentCount       |
                    | • maxStudents           |
                    | • startDate             |
                    | • endDate               |
                    | • timezone              |
                    └─────────────────────────┘
```

## 🔗 Database Relationships

```
USER (1) ←--→ (M) COURSE
    (instructor relationship)

USER (M) ←--→ (M) COURSE
    (through ENROLLMENT)

COURSE (1) ←--→ (M) LESSON
    (course lessons)

LESSON (1) ←--→ (M) ASSIGNMENT
    (lesson assignments)

USER (1) ←--→ (M) ASSIGNMENT
    (instructor assignments)

USER (M) ←--→ (M) LESSON
    (through PROGRESS)

USER (1) ←--→ (M) ENROLLMENT
    (student enrollments)

COURSE (1) ←--→ (M) ENROLLMENT
    (course enrollments)

USER (1) ←--→ (M) PROGRESS
    (user progress)

COURSE (1) ←--→ (M) PROGRESS
    (course progress)

LESSON (1) ←--→ (M) PROGRESS
    (lesson progress)
```

## 📊 Detailed Schema Breakdown

### 👤 USER Schema

```
USER {
  // Identity
  _id: ObjectId (auto)
  firstName: String (required, max:50)
  lastName: String (required, max:50)
  email: String (required, unique, validated)
  password: String (required, min:6, hashed)
  role: Enum ['student', 'instructor', 'admin']

  // Profile
  avatar: { public_id, url }
  bio: String (max:500)
  phone: String (validated)
  dateOfBirth: Date
  address: { street, city, state, country, zipCode }
  socialLinks: { website, linkedin, twitter, github }

  // Status & Verification
  isVerified: Boolean (default:false)
  isActive: Boolean (default:true)
  emailVerificationToken: String
  emailVerificationExpire: Date
  resetPasswordToken: String
  resetPasswordExpire: Date
  lastLogin: Date

  // Preferences
  preferences: {
    notifications: { email, push }
    language: String (default:'en')
    timezone: String (default:'UTC')
  }

  // Professional Info (Instructors)
  certifications: [{ name, organization, dateEarned, expiryDate, credentialId }]
  skills: [String]
  experience: String
  expertise: [String]
  hourlyRate: Number

  // Timestamps
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

### 📚 COURSE Schema

```
COURSE {
  // Basic Info
  _id: ObjectId (auto)
  title: String (required, max:100)
  slug: String (unique, lowercase)
  description: String (required, max:1000)
  shortDescription: String (max:200)

  // Relationships
  instructor: ObjectId → USER (required)

  // Classification
  category: Enum [15 categories] (required)
  level: Enum ['beginner', 'intermediate', 'advanced']
  language: String (default:'English')
  tags: [String]
  difficulty: Number (1-5)

  // Pricing
  price: Number (required, min:0)
  discountPrice: Number
  currency: String (default:'USD')

  // Media
  thumbnail: { public_id, url }
  trailer: { public_id, url, duration }

  // Content Structure
  sections: [{
    title: String (required)
    description: String
    order: Number (required)
    lessons: [ObjectId → LESSON]
  }]

  // Metadata
  duration: Number (total minutes)
  totalLessons: Number
  requirements: [String]
  objectives: [String]
  targetAudience: [String]

  // Settings
  certificate: {
    isEnabled: Boolean
    template: String
    passingScore: Number
  }
  isPublished: Boolean (default:false)
  isFeatured: Boolean (default:false)

  // Statistics
  rating: { average: Number, count: Number }
  enrollmentCount: Number (default:0)
  maxStudents: Number

  // Schedule (for live courses)
  startDate: Date
  endDate: Date
  timezone: String

  // Timestamps
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

### 📖 LESSON Schema

```
LESSON {
  // Basic Info
  _id: ObjectId (auto)
  title: String (required, max:100)
  description: String (max:500)

  // Relationships
  course: ObjectId → COURSE (required)
  section: String (required)
  order: Number (required)

  // Content Type
  type: Enum ['video', 'text', 'quiz', 'assignment', 'live']

  // Content Union (based on type)
  content: {
    // Video Content
    video: {
      public_id: String
      url: String
      duration: Number (seconds)
      thumbnail: { public_id, url }
    }

    // Text Content
    text: {
      body: String
      estimatedReadTime: Number (minutes)
    }

    // Quiz Content
    quiz: {
      questions: [{
        question: String (required)
        type: Enum ['multiple-choice', 'true-false', 'short-answer']
        options: [String] (for multiple-choice)
        correctAnswer: String/[String]
        explanation: String
        points: Number (default:1)
      }]
      timeLimit: Number (minutes)
      passingScore: Number (percentage)
      attempts: Number (max attempts, default:unlimited)
    }

    // Assignment Content
    assignment: {
      instructions: String (conditionally required)
      dueDate: Date
      submissionFormat: Enum ['text', 'file', 'both']
      maxScore: Number (default:100)
    }

    // Live Session Content
    live: {
      scheduledDate: Date (required)
      duration: Number (minutes, required)
      meetingUrl: String
      recordingUrl: String
      isRecorded: Boolean (default:false)
    }
  }

  // Settings
  isPreview: Boolean (default:false)
  isMandatory: Boolean (default:true)
  prerequisites: [ObjectId → LESSON]

  // Resources
  resources: [{
    title: String (required)
    type: Enum ['pdf', 'link', 'video', 'audio']
    url: String (required)
    description: String
  }]

  // Timestamps
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

### 📝 ASSIGNMENT Schema

```
ASSIGNMENT {
  // Basic Info
  _id: ObjectId (auto)
  title: String (required, max:100)
  description: String (required)
  instructions: String (required)

  // Relationships
  course: ObjectId → COURSE (required)
  lesson: ObjectId → LESSON
  instructor: ObjectId → USER (required)

  // Configuration
  type: Enum ['individual', 'group', 'peer-review']
  submissionFormat: Enum ['text', 'file', 'both', 'link']
  allowedFileTypes: [Enum] (pdf, doc, etc.)
  maxFileSize: Number (MB, default:10)
  maxFiles: Number (default:5)

  // Grading
  maxScore: Number (required, default:100)
  passingScore: Number (default:60)
  gradingRubric: [{
    criteria: String (required)
    description: String
    maxPoints: Number (required)
    levels: [{
      name: String
      points: Number
      description: String
    }]
  }]
  autoGrade: Boolean (default:false)

  // Timeline
  assignedDate: Date (default:now)
  dueDate: Date (required)
  lateSubmissionAllowed: Boolean (default:true)
  latePenalty: Number (percentage per day)

  // Group Settings (if type = 'group')
  groupSettings: {
    minGroupSize: Number (default:2)
    maxGroupSize: Number (default:5)
    allowStudentGroups: Boolean (default:true)
  }

  // Peer Review Settings (if type = 'peer-review')
  peerReviewSettings: {
    reviewsPerStudent: Number (default:3)
    reviewDueDate: Date
    anonymousReview: Boolean (default:true)
  }

  // Submissions (embedded)
  submissions: [{
    student: ObjectId → USER (required)
    submissionDate: Date (default:now)
    isLate: Boolean
    content: {
      text: String
      files: [{
        filename: String
        url: String
        size: Number
        uploadDate: Date
      }]
      links: [String]
    }
    grade: {
      score: Number
      feedback: String
      gradedBy: ObjectId → USER
      gradedAt: Date
      rubricScores: [{
        criteria: String
        score: Number
        feedback: String
      }]
    }
    status: Enum ['submitted', 'graded', 'returned', 'resubmit']
  }]

  // Settings
  isPublished: Boolean (default:false)

  // Timestamps
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

### 📋 ENROLLMENT Schema

```
ENROLLMENT {
  // Basic Info
  _id: ObjectId (auto)

  // Relationships
  student: ObjectId → USER (required)
  course: ObjectId → COURSE (required)

  // Status
  enrollmentDate: Date (default:now)
  status: Enum ['active', 'completed', 'dropped', 'suspended']

  // Progress Tracking
  progress: {
    completedLessons: [{
      lesson: ObjectId → LESSON
      completedAt: Date (default:now)
      watchTime: Number (seconds)
      score: Number (for quizzes/assignments)
    }]
    currentLesson: ObjectId → LESSON
    completionPercentage: Number (0-100, default:0)
    lastAccessedAt: Date (default:now)
  }

  // Payment Info
  payment: {
    amount: Number
    currency: String
    method: String
    transactionId: String
    paidAt: Date
    status: Enum ['pending', 'paid', 'refunded']
  }

  // Completion & Certification
  completedAt: Date
  certificateIssued: Boolean (default:false)
  certificateIssuedAt: Date
  finalGrade: Number (percentage)

  // Access Control
  accessExpiresAt: Date

  // Timestamps
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

### 🎯 PROGRESS Schema

```
PROGRESS {
  // Basic Info
  _id: ObjectId (auto)

  // Relationships
  user: ObjectId → USER (required)
  course: ObjectId → COURSE (required)
  lesson: ObjectId → LESSON (required)

  // Status
  status: Enum ['not-started', 'in-progress', 'completed']

  // Time Tracking
  watchTime: Number (seconds, default:0)
  totalWatchTime: Number (accumulated, default:0)
  completionPercentage: Number (0-100, default:0)
  completedAt: Date
  lastAccessedAt: Date (default:now)

  // Interactive Features
  bookmarks: [{
    timestamp: Number (seconds, required)
    note: String
    createdAt: Date (default:now)
  }]

  notes: [{
    timestamp: Number (seconds)
    content: String (required)
    isPublic: Boolean (default:false)
    createdAt: Date (default:now)
    updatedAt: Date
  }]

  // Quiz/Assignment Results
  quizResults: [{
    attemptNumber: Number (required)
    score: Number (required)
    maxScore: Number (required)
    answers: [{
      questionId: String
      answer: String/[String]
      isCorrect: Boolean
    }]
    completedAt: Date (default:now)
    timeSpent: Number (seconds)
  }]

  // Video-specific tracking
  videoProgress: {
    lastPosition: Number (seconds, default:0)
    playbackSpeed: Number (default:1.0)
    quality: String (default:'auto')
    watchedSegments: [{
      start: Number (seconds)
      end: Number (seconds)
    }]
  }

  // Learning Analytics
  analytics: {
    sessionCount: Number (default:0)
    avgSessionDuration: Number (seconds)
    longestSession: Number (seconds)
    pauseCount: Number (default:0)
    seekCount: Number (default:0)
    replayCount: Number (default:0)
  }

  // Timestamps
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

## 🔍 Key Relationships Summary

1. **USER → COURSE**: One-to-Many (Instructor creates multiple courses)
2. **USER ↔ COURSE**: Many-to-Many via ENROLLMENT (Students enroll in multiple courses)
3. **COURSE → LESSON**: One-to-Many (Course contains multiple lessons)
4. **LESSON ← ASSIGNMENT**: One-to-One/Many (Lesson may have assignments)
5. **USER → ASSIGNMENT**: One-to-Many (Instructor creates assignments)
6. **USER ↔ LESSON**: Many-to-Many via PROGRESS (Users progress through lessons)
7. **USER → ENROLLMENT**: One-to-Many (User can have multiple enrollments)
8. **COURSE → ENROLLMENT**: One-to-Many (Course can have multiple students)
9. **USER → PROGRESS**: One-to-Many (User has progress records)
10. **COURSE → PROGRESS**: One-to-Many (Course has student progress records)
11. **LESSON → PROGRESS**: One-to-Many (Lesson has student progress records)
