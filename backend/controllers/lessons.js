const { asyncHandler } = require('../middleware/error');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const Enrollment = require('../models/Enrollment');

// @desc    Get lessons for a course
// @route   GET /api/lessons/course/:courseId
// @access  Private (enrolled users)
exports.getLessonsByCourse = asyncHandler(async (req, res, next) => {
  const courseId = req.params.courseId;
  const userId = req.user.id;

  // Check if user has access to course
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check enrollment for paid courses
  if (course.price > 0 && req.user.role === 'student') {
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled to access course lessons'
      });
    }
  }

  const lessons = await Lesson.find({ course: courseId, isPublished: true })
    .sort('order')
    .select('-content.quiz.questions.correctAnswer -content.quiz.questions.explanation');

  // Get user progress for each lesson
  const lessonsWithProgress = await Promise.all(
    lessons.map(async (lesson) => {
      let progress = null;
      if (req.user) {
        progress = await Progress.findOne({
          user: userId,
          lesson: lesson._id
        });
      }
      return {
        ...lesson.toObject(),
        progress: progress || null
      };
    })
  );

  res.status(200).json({
    success: true,
    count: lessons.length,
    data: lessonsWithProgress
  });
});

// @desc    Get single lesson
// @route   GET /api/lessons/:id
// @access  Private (enrolled users)
exports.getLesson = asyncHandler(async (req, res, next) => {
  const lessonId = req.params.id;
  const userId = req.user.id;

  const lesson = await Lesson.findById(lessonId);

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Check if user has access
  const course = await Course.findById(lesson.course);
  
  // For preview lessons, allow access
  if (!lesson.isPreview) {
    if (course.price > 0 && req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        course: lesson.course,
        student: userId,
        status: 'active'
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled to access this lesson'
        });
      }
    }
  }

  // Get user progress
  let progress = await Progress.findOne({
    user: userId,
    lesson: lessonId
  });

  // Create progress record if it doesn't exist
  if (!progress && req.user.role === 'student') {
    progress = await Progress.create({
      user: userId,
      course: lesson.course,
      lesson: lessonId,
      status: 'not-started'
    });
  }

  // For quiz lessons, don't return correct answers unless completed
  let lessonData = lesson.toObject();
  if (lesson.type === 'quiz' && (!progress || progress.status !== 'completed')) {
    lessonData.content.quiz.questions = lessonData.content.quiz.questions.map(q => ({
      ...q,
      correctAnswer: undefined,
      explanation: undefined
    }));
  }

  res.status(200).json({
    success: true,
    data: {
      ...lessonData,
      progress: progress || null
    }
  });
});

// @desc    Create lesson
// @route   POST /api/lessons
// @access  Private/Instructor
exports.createLesson = asyncHandler(async (req, res, next) => {
  const { course: courseId } = req.body;

  // Check if user owns the course
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to add lessons to this course'
    });
  }

  const lesson = await Lesson.create(req.body);

  // Update course lecture count
  await Course.findByIdAndUpdate(courseId, {
    $inc: { totalLectures: 1 }
  });

  res.status(201).json({
    success: true,
    data: lesson
  });
});

// @desc    Update lesson
// @route   PUT /api/lessons/:id
// @access  Private/Instructor
exports.updateLesson = asyncHandler(async (req, res, next) => {
  let lesson = await Lesson.findById(req.params.id);

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Check if user owns the course
  const course = await Course.findById(lesson.course);
  if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to update this lesson'
    });
  }

  lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: lesson
  });
});

// @desc    Delete lesson
// @route   DELETE /api/lessons/:id
// @access  Private/Instructor
exports.deleteLesson = asyncHandler(async (req, res, next) => {
  const lesson = await Lesson.findById(req.params.id);

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Check if user owns the course
  const course = await Course.findById(lesson.course);
  if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to delete this lesson'
    });
  }

  await lesson.remove();

  // Update course lecture count
  await Course.findByIdAndUpdate(lesson.course, {
    $inc: { totalLectures: -1 }
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update lesson progress
// @route   POST /api/lessons/:id/progress
// @access  Private/Student
exports.updateLessonProgress = asyncHandler(async (req, res, next) => {
  const lessonId = req.params.id;
  const userId = req.user.id;
  const { watchTime, status, quizAnswers } = req.body;

  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Check enrollment
  const enrollment = await Enrollment.findOne({
    course: lesson.course,
    student: userId,
    status: 'active'
  });

  if (!enrollment && lesson.course.price > 0) {
    return res.status(403).json({
      success: false,
      message: 'You must be enrolled to update progress'
    });
  }

  // Find or create progress record
  let progress = await Progress.findOne({
    user: userId,
    lesson: lessonId
  });

  if (!progress) {
    progress = new Progress({
      user: userId,
      course: lesson.course,
      lesson: lessonId,
      status: 'not-started'
    });
  }

  // Update progress based on lesson type
  if (lesson.type === 'video' && watchTime !== undefined) {
    await progress.updateWatchTime(watchTime);
  } else if (lesson.type === 'quiz' && quizAnswers) {
    // Calculate quiz score
    let score = 0;
    const answers = quizAnswers.map((answer, index) => {
      const question = lesson.content.quiz.questions[index];
      const isCorrect = JSON.stringify(answer.answer) === JSON.stringify(question.correctAnswer);
      if (isCorrect) score += question.points || 1;
      
      return {
        questionId: question._id,
        answer: answer.answer,
        isCorrect,
        points: isCorrect ? (question.points || 1) : 0
      };
    });

    const timeSpent = req.body.timeSpent || 0;
    await progress.recordQuizAttempt(answers, score, timeSpent);
  } else if (status) {
    progress.status = status;
    if (status === 'completed') {
      progress.completedAt = new Date();
      progress.completionPercentage = 100;
    }
    await progress.save();
  }

  // Update enrollment progress
  if (enrollment && progress.status === 'completed') {
    await enrollment.markLessonCompleted(lessonId, watchTime);
  }

  res.status(200).json({
    success: true,
    data: progress
  });
});

// @desc    Add lesson bookmark
// @route   POST /api/lessons/:id/bookmarks
// @access  Private
exports.addBookmark = asyncHandler(async (req, res, next) => {
  const lessonId = req.params.id;
  const userId = req.user.id;
  const { timestamp, note } = req.body;

  let progress = await Progress.findOne({
    user: userId,
    lesson: lessonId
  });

  if (!progress) {
    return res.status(404).json({
      success: false,
      message: 'Progress record not found'
    });
  }

  await progress.addBookmark(timestamp, note);

  res.status(201).json({
    success: true,
    message: 'Bookmark added successfully'
  });
});

// @desc    Add lesson note
// @route   POST /api/lessons/:id/notes
// @access  Private
exports.addNote = asyncHandler(async (req, res, next) => {
  const lessonId = req.params.id;
  const userId = req.user.id;
  const { content, timestamp, isPrivate } = req.body;

  let progress = await Progress.findOne({
    user: userId,
    lesson: lessonId
  });

  if (!progress) {
    return res.status(404).json({
      success: false,
      message: 'Progress record not found'
    });
  }

  await progress.addNote(content, timestamp, isPrivate);

  res.status(201).json({
    success: true,
    message: 'Note added successfully'
  });
});

module.exports = exports;