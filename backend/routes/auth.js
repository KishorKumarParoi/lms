const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  logout
} = require('../controllers/auth');

const { protect, rateLimitSensitive } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', rateLimitSensitive, forgotPassword);
router.put('/resetpassword/:resettoken', rateLimitSensitive, resetPassword);
router.get('/verifyemail/:token', verifyEmail);
router.get('/logout', logout);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, rateLimitSensitive, updatePassword);
router.post('/resendverification', protect, resendVerification);

module.exports = router;