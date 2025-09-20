const fs = require('fs');
const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Load models
const User = require('./models/User');
const Course = require('./models/Course');
const Lesson = require('./models/Lesson');
const Assignment = require('./models/Assignment');
const Enrollment = require('./models/Enrollment');
const Progress = require('./models/Progress');

// Connect to DB
mongoose.connect(process.env.MONGODB_URI);

// Read JSON files
const users = JSON.parse(
    fs.readFileSync(`${__dirname}/_data/users.json`, 'utf-8')
);

const courses = JSON.parse(
    fs.readFileSync(`${__dirname}/_data/courses.json`, 'utf-8')
);

const lessons = JSON.parse(
    fs.readFileSync(`${__dirname}/_data/lessons.json`, 'utf-8')
);

const assignments = JSON.parse(
    fs.readFileSync(`${__dirname}/_data/assignments.json`, 'utf-8')
);

const enrollments = JSON.parse(
    fs.readFileSync(`${__dirname}/_data/enrollments.json`, 'utf-8')
);

// Import into DB
const importData = async () => {
    try {
        console.log('🚀 Starting data import...'.green.inverse);

        // Clear existing data
        await User.deleteMany();
        await Course.deleteMany();
        await Lesson.deleteMany();
        // Skip assignments and enrollments for now
        // await Assignment.deleteMany();
        // await Enrollment.deleteMany();
        await Progress.deleteMany();

        console.log('🗑️  Cleared existing data...'.yellow);

        // Import users first (they're referenced by other collections)
        const createdUsers = await User.create(users);
        console.log('✅ Users imported...'.green);

        // Import courses
        const createdCourses = await Course.create(courses);
        console.log('✅ Courses imported...'.green);

        // Import lessons
        const createdLessons = await Lesson.create(lessons);
        console.log('✅ Lessons imported...'.green);

        // Skip assignments and enrollments for now
        // const createdAssignments = await Assignment.create(assignments);
        // console.log('✅ Assignments imported...'.green);

        // const createdEnrollments = await Enrollment.create(enrollments);
        // console.log('✅ Enrollments imported...'.green);

        console.log('🎉 Data imported successfully!'.green.inverse);
        console.log(`📊 Summary:`.cyan.bold);
        console.log(`   Users: ${createdUsers.length}`.cyan);
        console.log(`   Courses: ${createdCourses.length}`.cyan);
        console.log(`   Lessons: ${createdLessons.length}`.cyan);
        // console.log(`   Assignments: ${createdAssignments.length}`.cyan);
        // console.log(`   Enrollments: ${createdEnrollments.length}`.cyan);

        process.exit();
    } catch (err) {
        console.error('❌ Error importing data:'.red.inverse, err);
        process.exit(1);
    }
};// Delete data
const deleteData = async () => {
    try {
        console.log('🗑️  Deleting all data...'.red.inverse);

        await User.deleteMany();
        await Course.deleteMany();
        await Lesson.deleteMany();
        await Assignment.deleteMany();
        await Enrollment.deleteMany();
        await Progress.deleteMany();

        console.log('✅ Data deleted successfully!'.green.inverse);
        process.exit();
    } catch (err) {
        console.error('❌ Error deleting data:'.red.inverse, err);
        process.exit(1);
    }
};

// Check command line arguments
if (process.argv[2] === '-i') {
    importData();
} else if (process.argv[2] === '-d') {
    deleteData();
} else {
    console.log('Usage:'.cyan.bold);
    console.log('  node seeder -i    Import sample data'.green);
    console.log('  node seeder -d    Delete all data'.red);
    process.exit();
}