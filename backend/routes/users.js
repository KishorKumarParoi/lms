const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  updateAvatar,
  getUserProgress,
  getUserCertificates
} = require('../controllers/users');

const { protect, authorize, checkOwnership } = require('../middleware/auth');

const router = express.Router();

// Admin only routes
router.use(protect);
router.get('/stats', authorize('admin'), getUserStats);
router.route('/')
  .get(authorize('admin'), getUsers)
  .post(authorize('admin'), createUser);

// Routes that allow access to own profile or admin
router.route('/:id')
  .get(getUser) // Will check permissions in controller
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

// Profile specific routes
router.put('/:id/avatar', updateAvatar); // Will check permissions in controller
router.get('/:id/progress', getUserProgress); // Will check permissions in controller
router.get('/:id/certificates', getUserCertificates); // Will check permissions in controller

module.exports = router;