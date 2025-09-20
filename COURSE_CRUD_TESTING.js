// Course CRUD API Testing Guide

// API Base URL
const API_BASE = 'http://localhost:5001/api';

// Test Course Data
const testCourse = {
    title: 'Advanced React Development',
    description: 'Learn advanced React concepts including hooks, context, performance optimization, and testing.',
    shortDescription: 'Master advanced React concepts and patterns',
    instructor: '673e0dcd71c89c0a5cb1e582', // Replace with actual instructor ID from your database
    category: 'Web Development',
    level: 'advanced',
    language: 'English',
    price: 99.99,
    discountPrice: 79.99,
    currency: 'USD',
    tags: ['react', 'javascript', 'frontend', 'hooks'],
    isPublished: true,
    isFeatured: false
};

// 1. CREATE - Add a new course
const createCourse = async () => {
    try {
        const response = await fetch(`${API_BASE}/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testCourse)
        });

        const result = await response.json();
        console.log('✅ Course Created:', result);
        return result.data;
    } catch (error) {
        console.error('❌ Error creating course:', error);
    }
};

// 2. READ - Get all courses
const getAllCourses = async () => {
    try {
        const response = await fetch(`${API_BASE}/courses`);
        const result = await response.json();
        console.log('📚 All Courses:', result);
        return result.data;
    } catch (error) {
        console.error('❌ Error fetching courses:', error);
    }
};

// 3. READ - Get single course by ID
const getCourseById = async (courseId) => {
    try {
        const response = await fetch(`${API_BASE}/courses/${courseId}`);
        const result = await response.json();
        console.log('📖 Course Details:', result);
        return result.data;
    } catch (error) {
        console.error('❌ Error fetching course:', error);
    }
};

// 4. UPDATE - Update existing course
const updateCourse = async (courseId, updateData) => {
    try {
        const response = await fetch(`${API_BASE}/courses/${courseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        console.log('✏️ Course Updated:', result);
        return result.data;
    } catch (error) {
        console.error('❌ Error updating course:', error);
    }
};

// 5. DELETE - Remove course
const deleteCourse = async (courseId) => {
    try {
        const response = await fetch(`${API_BASE}/courses/${courseId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        console.log('🗑️ Course Deleted:', result);
        return result;
    } catch (error) {
        console.error('❌ Error deleting course:', error);
    }
};

// Example usage workflow:
const testCourseWorkflow = async () => {
    console.log('🧪 Starting Course CRUD Testing...\n');

    // Step 1: Get all existing courses
    console.log('1️⃣ Fetching all courses...');
    await getAllCourses();

    // Step 2: Create a new course
    console.log('\n2️⃣ Creating new course...');
    const newCourse = await createCourse();

    if (newCourse && newCourse._id) {
        const courseId = newCourse._id;

        // Step 3: Get the created course
        console.log('\n3️⃣ Fetching created course...');
        await getCourseById(courseId);

        // Step 4: Update the course
        console.log('\n4️⃣ Updating course...');
        const updateData = {
            title: 'Advanced React & Next.js Development',
            price: 89.99,
            tags: ['react', 'nextjs', 'javascript', 'ssr']
        };
        await updateCourse(courseId, updateData);

        // Step 5: Get updated course
        console.log('\n5️⃣ Fetching updated course...');
        await getCourseById(courseId);

        // Step 6: Delete the course (optional - uncomment to test)
        // console.log('\n6️⃣ Deleting course...');
        // await deleteCourse(courseId);
    }

    console.log('\n🎉 CRUD Testing Complete!');
};

// Instructions for testing:
console.log(`
🚀 Course CRUD API Testing Instructions:

1. Make sure your backend server is running on http://localhost:5001
2. Make sure you have instructor users in your database
3. Update the instructor ID in testCourse object with a real ID from your database
4. Open browser console and run: testCourseWorkflow()

Available Functions:
- createCourse() - Creates a new course
- getAllCourses() - Gets all courses
- getCourseById(id) - Gets specific course
- updateCourse(id, data) - Updates course
- deleteCourse(id) - Deletes course
- testCourseWorkflow() - Runs complete test workflow

Example individual calls:
- getAllCourses()
- createCourse()
- getCourseById('YOUR_COURSE_ID_HERE')
- updateCourse('YOUR_COURSE_ID_HERE', {title: 'New Title', price: 199})
- deleteCourse('YOUR_COURSE_ID_HERE')
`);

// Export functions for use in browser console
window.courseAPI = {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    testCourseWorkflow,
    testCourse
};