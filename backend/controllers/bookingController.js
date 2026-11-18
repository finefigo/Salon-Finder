const { randomUUID: uuidv4 } = require('crypto');
const db = require('../config/db');

// Helper to normalize date to YYYY-MM-DD without UTC timezone skew
const normalizeDate = (d) => {
    if (!d) return null;
    if (typeof d === 'string') return d.split('T')[0];
    if (d instanceof Date) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return String(d).split('T')[0];
};

// Helper to format booking object
const formatBooking = (b) => {
    if (!b) return null;
    let services = b.services;
    if (typeof services === 'string') {
        try { services = JSON.parse(services); } catch (e) {}
    }

    return {
        ...b,
        _id: b.id,
        services: services || [],
        customer: b.customerId ? {
            id: b.customerId,
            _id: b.customerId,
            name: b.customerName,
            email: b.customerEmail,
            phone: b.customerPhone
        } : null,
        salon: b.salonId ? {
            id: b.salonId,
            _id: b.salonId,
            name: b.salonName,
            phone: b.salonPhone,
            coverImage: b.salonCoverImage,
            location: {
                formattedAddress: b.salonAddress,
                city: b.salonCity
            }
        } : null,
        slot: b.slotId ? {
            id: b.slotId,
            _id: b.slotId,
            date: b.slotDate || b.bookingDate,
            startTime: b.slotStartTime || b.bookingTime,
            endTime: b.slotEndTime
        } : null
    };
};

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 * @access  Private (Customer)
 */
exports.createBooking = async (req, res, next) => {
    try {
        const { slotId, serviceIds, customerNotes } = req.body;

        if (!slotId) {
            return res.status(400).json({ success: false, message: 'Slot ID is required' });
        }

        if (!serviceIds || !serviceIds.length) {
            return res.status(400).json({ success: false, message: 'At least one service is required' });
        }

        // Atomic slot reservation: update only if available
        const updateResult = await db.query(`
            UPDATE slots
            SET isAvailable = 0, bookedById = ?
            WHERE id = ? AND isAvailable = 1 AND isEnabled = 1
        `, [req.user.id, slotId]);

        if (updateResult.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: 'Slot is no longer available or already booked'
            });
        }

        // Get slot details
        const [slot] = await db.query('SELECT * FROM slots WHERE id = ?', [slotId]);

        // Get salon details
        const [salon] = await db.query('SELECT * FROM salons WHERE id = ?', [slot.salonId]);
        if (!salon || !salon.isActive || !salon.isVerified) {
            // Rollback slot
            await db.query('UPDATE slots SET isAvailable = 1, bookedById = NULL WHERE id = ?', [slotId]);
            return res.status(400).json({ success: false, message: 'Salon is not active or verified' });
        }

        // Fetch selected services
        const placeholders = serviceIds.map(() => '?').join(',');
        const services = await db.query(`
            SELECT id, name, price, duration
            FROM services
            WHERE id IN (${placeholders}) AND salonId = ? AND isActive = 1
        `, [...serviceIds, salon.id]);

        if (services.length === 0) {
            await db.query('UPDATE slots SET isAvailable = 1, bookedById = NULL WHERE id = ?', [slotId]);
            return res.status(400).json({ success: false, message: 'No valid services selected' });
        }

        const totalAmount = services.reduce((sum, s) => sum + s.price, 0);
        const bookingId = uuidv4();
        const dateStr = normalizeDate(slot.date);

        await db.query(`
            INSERT INTO bookings (
                id, customerId, salonId, slotId, services,
                bookingDate, bookingTime, totalAmount, customerNotes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
        `, [
            bookingId, req.user.id, salon.id, slot.id,
            JSON.stringify(services.map(s => ({ ...s, service: s.id }))),
            dateStr, slot.startTime, totalAmount, customerNotes || null
        ]);

        // Link slot to booking
        await db.query('UPDATE slots SET bookingId = ? WHERE id = ?', [bookingId, slotId]);

        // Fetch populated booking
        const [bookingRow] = await db.query(`
            SELECT b.*,
                   u.name as customerName, u.email as customerEmail, u.phone as customerPhone,
                   s.name as salonName, s.phone as salonPhone, s.coverImage as salonCoverImage,
                   s.formattedAddress as salonAddress, s.city as salonCity,
                   sl.date as slotDate, sl.startTime as slotStartTime, sl.endTime as slotEndTime
            FROM bookings b
            JOIN users u ON b.customerId = u.id
            JOIN salons s ON b.salonId = s.id
            JOIN slots sl ON b.slotId = sl.id
            WHERE b.id = ?
        `, [bookingId]);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: formatBooking(bookingRow)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get my bookings (customer)
 * @route   GET /api/bookings/my
 * @access  Private (Customer)
 */
exports.getMyBookings = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        let whereSQL = 'WHERE b.customerId = ?';
        let params = [req.user.id];

        if (status) {
            whereSQL += ' AND b.status = ?';
            params.push(status);
        }

        const rows = await db.query(`
            SELECT b.*,
                   s.name as salonName, s.phone as salonPhone, s.coverImage as salonCoverImage,
                   s.formattedAddress as salonAddress, s.city as salonCity,
                   sl.date as slotDate, sl.startTime as slotStartTime, sl.endTime as slotEndTime
            FROM bookings b
            JOIN salons s ON b.salonId = s.id
            JOIN slots sl ON b.slotId = sl.id
            ${whereSQL}
            ORDER BY b.bookingDate DESC, b.bookingTime DESC
            LIMIT ? OFFSET ?
        `, [...params, limitNum, offset]);

        const [countRow] = await db.query(`
            SELECT COUNT(*) as total FROM bookings b ${whereSQL}
        `, params);

        const total = countRow?.total || 0;

        res.status(200).json({
            success: true,
            count: rows.length,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum) || 1,
            data: rows.map(formatBooking)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get upcoming bookings (customer)
 * @route   GET /api/bookings/upcoming
 * @access  Private (Customer)
 */
exports.getUpcomingBookings = async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const rows = await db.query(`
            SELECT b.*,
                   s.name as salonName, s.phone as salonPhone, s.coverImage as salonCoverImage,
                   s.formattedAddress as salonAddress, s.city as salonCity,
                   sl.date as slotDate, sl.startTime as slotStartTime, sl.endTime as slotEndTime
            FROM bookings b
            JOIN salons s ON b.salonId = s.id
            JOIN slots sl ON b.slotId = sl.id
            WHERE b.customerId = ? AND b.bookingDate >= ? AND b.status IN ('pending', 'confirmed')
            ORDER BY b.bookingDate ASC, b.bookingTime ASC
        `, [req.user.id, today]);

        res.status(200).json({
            success: true,
            count: rows.length,
            data: rows.map(formatBooking)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single booking
 * @route   GET /api/bookings/:id
 * @access  Private
 */
exports.getBooking = async (req, res, next) => {
    try {
        const rows = await db.query(`
            SELECT b.*,
                   u.name as customerName, u.email as customerEmail, u.phone as customerPhone,
                   s.name as salonName, s.phone as salonPhone, s.coverImage as salonCoverImage,
                   s.formattedAddress as salonAddress, s.city as salonCity, s.ownerId as salonOwnerId,
                   sl.date as slotDate, sl.startTime as slotStartTime, sl.endTime as slotEndTime
            FROM bookings b
            JOIN users u ON b.customerId = u.id
            JOIN salons s ON b.salonId = s.id
            JOIN slots sl ON b.slotId = sl.id
            WHERE b.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const b = rows[0];
        const isOwner = b.salonOwnerId === req.user.id;
        const isCustomer = b.customerId === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isCustomer && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
        }

        res.status(200).json({
            success: true,
            data: formatBooking(b)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Cancel booking
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private
 */
exports.cancelBooking = async (req, res, next) => {
    try {
        const { reason } = req.body;

        const [booking] = await db.query(`
            SELECT b.*, s.ownerId as salonOwnerId
            FROM bookings b
            JOIN salons s ON b.salonId = s.id
            WHERE b.id = ?
        `, [req.params.id]);

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (['completed', 'cancelled'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: `Cannot cancel a ${booking.status} booking` });
        }

        const isOwner = booking.salonOwnerId === req.user.id;
        const isCustomer = booking.customerId === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isCustomer && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const cancelledBy = isAdmin ? 'admin' : isOwner ? 'salon' : 'customer';

        await db.query(`
            UPDATE bookings
            SET status = 'cancelled', cancelledBy = ?, cancellationReason = ?, cancelledAt = NOW()
            WHERE id = ?
        `, [cancelledBy, reason || null, req.params.id]);

        // Release slot
        await db.query(`
            UPDATE slots
            SET isAvailable = 1, bookedById = NULL, bookingId = NULL
            WHERE id = ?
        `, [booking.slotId]);

        const [updated] = await db.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);

        res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            data: formatBooking(updated)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get salon bookings (for salon owner)
 * @route   GET /api/bookings/salon/all
 * @access  Private (Salon Owner)
 */
exports.getSalonBookings = async (req, res, next) => {
    try {
        const { date, status, page = 1, limit = 10 } = req.query;

        const [salon] = await db.query('SELECT id FROM salons WHERE ownerId = ?', [req.user.id]);
        if (!salon) {
            return res.status(404).json({ success: false, message: 'You must create a salon first' });
        }

        let whereSQL = 'WHERE b.salonId = ?';
        let params = [salon.id];

        if (date) {
            const queryDate = normalizeDate(date);
            whereSQL += ' AND DATE(b.bookingDate) = ?';
            params.push(queryDate);
        }

        if (status) {
            whereSQL += ' AND b.status = ?';
            params.push(status);
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        const rows = await db.query(`
            SELECT b.*,
                   u.name as customerName, u.email as customerEmail, u.phone as customerPhone,
                   sl.date as slotDate, sl.startTime as slotStartTime, sl.endTime as slotEndTime
            FROM bookings b
            JOIN users u ON b.customerId = u.id
            JOIN slots sl ON b.slotId = sl.id
            ${whereSQL}
            ORDER BY b.bookingDate DESC, b.bookingTime DESC
            LIMIT ? OFFSET ?
        `, [...params, limitNum, offset]);

        const [countRow] = await db.query(`
            SELECT COUNT(*) as total FROM bookings b ${whereSQL}
        `, params);

        const total = countRow?.total || 0;

        res.status(200).json({
            success: true,
            count: rows.length,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum) || 1,
            data: rows.map(formatBooking)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update booking status (for salon owner)
 * @route   PUT /api/bookings/:id/status
 * @access  Private (Salon Owner)
 */
exports.updateBookingStatus = async (req, res, next) => {
    try {
        const { status, salonNotes } = req.body;

        const [booking] = await db.query(`
            SELECT b.*, s.ownerId as salonOwnerId
            FROM bookings b
            JOIN salons s ON b.salonId = s.id
            WHERE b.id = ?
        `, [req.params.id]);

        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        if (booking.salonOwnerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await db.query(`
            UPDATE bookings
            SET status = ?, salonNotes = COALESCE(?, salonNotes)
            WHERE id = ?
        `, [status, salonNotes || null, req.params.id]);

        if (status === 'cancelled') {
            await db.query('UPDATE slots SET isAvailable = 1, bookedById = NULL, bookingId = NULL WHERE id = ?', [booking.slotId]);
        }

        const [updated] = await db.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);

        res.status(200).json({
            success: true,
            message: `Booking ${status}`,
            data: formatBooking(updated)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get today's bookings for salon owner
 * @route   GET /api/bookings/salon/today
 * @access  Private (Salon Owner)
 */
exports.getTodayBookings = async (req, res, next) => {
    try {
        const [salon] = await db.query('SELECT id FROM salons WHERE ownerId = ?', [req.user.id]);
        if (!salon) return res.status(404).json({ success: false, message: 'You must create a salon first' });

        const today = new Date().toISOString().split('T')[0];

        const rows = await db.query(`
            SELECT b.*,
                   u.name as customerName, u.email as customerEmail, u.phone as customerPhone,
                   sl.date as slotDate, sl.startTime as slotStartTime, sl.endTime as slotEndTime
            FROM bookings b
            JOIN users u ON b.customerId = u.id
            JOIN slots sl ON b.slotId = sl.id
            WHERE b.salonId = ? AND b.bookingDate = ? AND b.status IN ('pending', 'confirmed')
            ORDER BY b.bookingTime ASC
        `, [salon.id, today]);

        res.status(200).json({
            success: true,
            count: rows.length,
            data: rows.map(formatBooking)
        });
    } catch (error) {
        next(error);
    }
};
