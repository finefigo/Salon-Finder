const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    createBooking,
    getMyBookings,
    getUpcomingBookings,
    getBooking,
    cancelBooking,
    getSalonBookings,
    updateBookingStatus,
    getTodayBookings
} = require('../controllers/bookingController');

// Customer routes (specific routes before /:id)
router.post('/', protect, authorize('customer'), createBooking);
router.get('/my', protect, getMyBookings);
router.get('/upcoming', protect, authorize('customer'), getUpcomingBookings);

// Salon owner routes (specific routes before /:id)
router.get('/salon/all', protect, authorize('salonOwner'), getSalonBookings);
router.get('/salon/today', protect, authorize('salonOwner'), getTodayBookings);
router.put('/:id/status', protect, authorize('salonOwner'), updateBookingStatus);

// Generic parameterized routes
router.get('/:id', protect, getBooking);
router.put('/:id/cancel', protect, cancelBooking);

module.exports = router;
