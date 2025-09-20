# 🚀 Course CRUD Testing Interface

## Quick Start Guide

### 1. Start Your Backend Server

```bash
cd /Users/kishorkumarparoi/job-project/lms/backend
npm start
```

The backend should run on `http://localhost:5001`

### 2. Start the Testing Interface

```bash
cd /Users/kishorkumarparoi/job-project/lms
python3 -m http.server 8080
```

### 3. Open Testing Interface

Open your browser to: `http://localhost:8080/course-crud-test.html`

## ✅ What You Can Test

### Automatic Tests

- **Check API Status** - Verifies backend connection
- **Get All Courses** - Lists all courses in database
- **Create Test Course** - Adds a sample course
- **Run Full Workflow** - Complete CRUD test sequence

### Manual Tests

- **Get Course by ID** - Retrieve specific course details
- **Update Course** - Modify course title and price
- **Delete Course** - Remove course from database
- **Seed Database** - Add sample courses for testing

## 🔧 Features

### Real-time Logging

- All API calls are logged with timestamps
- Color-coded responses (success, error, warning)
- Scrollable log window

### Status Dashboard

- API connection status
- Total course count
- Last performed action

### Interactive Forms

- Course ID input for targeted operations
- Update fields for title and price
- Confirmation dialogs for destructive actions

## 🧪 Testing Workflow

1. **Click "Check API Status"** - Ensures backend is running
2. **Click "Get All Courses"** - See current database state
3. **Click "Seed Database"** - Add sample data if needed
4. **Click "Create Test Course"** - Test course creation
5. **Enter Course ID** - Test read/update/delete operations
6. **Click "Run Full Workflow"** - Complete automated test

## ❗ Troubleshooting

### Backend Not Responding

```bash
# Check if backend is running
curl http://localhost:5001/api/courses

# If not running, start it:
cd backend && npm start
```

### No Courses Found

- Click "Seed Database" to add sample data
- Or manually create courses through the interface

### CORS Issues

- Backend includes CORS headers for localhost
- Make sure you're accessing via http://localhost:8080

## 🎯 Success Indicators

✅ **API Status: Online** - Backend is running  
✅ **Course Count: > 0** - Database has data  
✅ **Green log messages** - Operations successful  
✅ **No red error messages** - No failures

## 🔍 API Endpoints Tested

- `GET /api/courses` - List all courses
- `POST /api/courses` - Create new course
- `GET /api/courses/:id` - Get course by ID
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course
- `GET /api/users` - Get instructors for course creation

Your Course CRUD operations are now fully testable through this interface! 🎉
