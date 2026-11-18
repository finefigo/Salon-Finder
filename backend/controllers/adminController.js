const db = require('../config/db');

/**
 * Admin Controller
 * Handles platform statistics, studio moderation, user and booking audits
 */

/**
 * @desc    Get dashboard stats
 * @route   GET /api/admin/stats
 * @access  Private (Admin)
 */
exports.getDashboardStats = async (req, res, next) => {
    try {
        const [customerRow] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'customer'");
        const [ownerRow] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'salonOwner'");
        const [totalSalonsRow] = await db.query("SELECT COUNT(*) as count FROM salons");
        const [pendingSalonsRow] = await db.query("SELECT COUNT(*) as count FROM salons WHERE isVerified = 0");
        const [totalBookingsRow] = await db.query("SELECT COUNT(*) as count FROM bookings");
        const [confirmedBookingsRow] = await db.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'");

        res.status(200).json({
            success: true,
            data: {
                users: {
                    customers: customerRow?.count || 0,
                    salonOwners: ownerRow?.count || 0
                },
                salons: {
                    total: totalSalonsRow?.count || 0,
                    pending: pendingSalonsRow?.count || 0
                },
                bookings: {
                    total: totalBookingsRow?.count || 0,
                    confirmed: confirmedBookingsRow?.count || 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all salons (with pagination & filters)
 * @route   GET /api/admin/salons
 * @access  Private (Admin)
 */
exports.getAllSalons = async (req, res, next) => {
    try {
        const { isVerified, isActive, page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;
        const offset = (pageNum - 1) * limitNum;

        let whereClauses = [];
        let params = [];

        if (isVerified !== undefined) {
            whereClauses.push('s.isVerified = ?');
            params.push(isVerified === 'true' ? 1 : 0);
        }

        if (isActive !== undefined) {
            whereClauses.push('s.isActive = ?');
            params.push(isActive === 'true' ? 1 : 0);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const rows = await db.query(`
            SELECT s.*, u.name as ownerName, u.email as ownerEmail, u.phone as ownerPhone
            FROM salons s
            JOIN users u ON s.ownerId = u.id
            ${whereSQL}
            ORDER BY s.createdAt DESC
            LIMIT ? OFFSET ?
        `, [...params, limitNum, offset]);

        const [countRow] = await db.query(`SELECT COUNT(*) as total FROM salons s ${whereSQL}`, params);
        const total = countRow?.total || 0;

        res.status(200).json({
            success: true,
            count: rows.length,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum) || 1,
            data: rows.map(r => ({
                ...r,
                _id: r.id,
                owner: {
                    id: r.ownerId,
                    _id: r.ownerId,
                    name: r.ownerName,
                    email: r.ownerEmail,
                    phone: r.ownerPhone
                },
                location: {
                    formattedAddress: r.formattedAddress,
                    city: r.city
                }
            }))
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Verify a salon
 * @route   PUT /api/admin/salons/:id/verify
 * @access  Private (Admin)
 */
exports.verifySalon = async (req, res, next) => {
    try {
        await db.query(`
            UPDATE salons
            SET isVerified = 1, verifiedAt = NOW(), verifiedBy = ?
            WHERE id = ?
        `, [req.user.id, req.params.id]);

        const [updated] = await db.query('SELECT * FROM salons WHERE id = ?', [req.params.id]);
        if (!updated) return res.status(404).json({ success: false, message: 'Salon not found' });

        res.status(200).json({
            success: true,
            message: 'Salon verified successfully',
            data: { ...updated, _id: updated.id }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Block a salon
 * @route   PUT /api/admin/salons/:id/block
 * @access  Private (Admin)
 */
exports.blockSalon = async (req, res, next) => {
    try {
        await db.query('UPDATE salons SET isActive = 0 WHERE id = ?', [req.params.id]);
        const [updated] = await db.query('SELECT * FROM salons WHERE id = ?', [req.params.id]);
        if (!updated) return res.status(404).json({ success: false, message: 'Salon not found' });

        res.status(200).json({
            success: true,
            message: 'Salon blocked successfully',
            data: { ...updated, _id: updated.id }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Unblock a salon
 * @route   PUT /api/admin/salons/:id/unblock
 * @access  Private (Admin)
 */
exports.unblockSalon = async (req, res, next) => {
    try {
        await db.query('UPDATE salons SET isActive = 1 WHERE id = ?', [req.params.id]);
        const [updated] = await db.query('SELECT * FROM salons WHERE id = ?', [req.params.id]);
        if (!updated) return res.status(404).json({ success: false, message: 'Salon not found' });

        res.status(200).json({
            success: true,
            message: 'Salon unblocked successfully',
            data: { ...updated, _id: updated.id }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
exports.getAllUsers = async (req, res, next) => {
    try {
        const { role, page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;
        const offset = (pageNum - 1) * limitNum;

        let whereSQL = '';
        let params = [];

        if (role) {
            whereSQL = 'WHERE role = ?';
            params.push(role);
        }

        const rows = await db.query(`
            SELECT id, name, email, phone, role, isActive, createdAt
            FROM users
            ${whereSQL}
            ORDER BY createdAt DESC
            LIMIT ? OFFSET ?
        `, [...params, limitNum, offset]);

        const [countRow] = await db.query(`SELECT COUNT(*) as total FROM users ${whereSQL}`, params);
        const total = countRow?.total || 0;

        res.status(200).json({
            success: true,
            count: rows.length,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum) || 1,
            data: rows.map(u => ({ ...u, _id: u.id, isActive: Boolean(u.isActive) }))
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Toggle user active status
 * @route   PUT /api/admin/users/:id/toggle-active
 * @access  Private (Admin)
 */
exports.toggleUserActive = async (req, res, next) => {
    try {
        const [user] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const newStatus = user.isActive ? 0 : 1;
        await db.query('UPDATE users SET isActive = ? WHERE id = ?', [newStatus, req.params.id]);

        res.status(200).json({
            success: true,
            message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
            data: { ...user, _id: user.id, isActive: Boolean(newStatus) }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all bookings (admin audit)
 * @route   GET /api/admin/bookings
 * @access  Private (Admin)
 */
exports.getAllBookings = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;
        const offset = (pageNum - 1) * limitNum;

        const rows = await db.query(`
            SELECT b.*,
                   u.name as customerName, u.email as customerEmail,
                   s.name as salonName
            FROM bookings b
            JOIN users u ON b.customerId = u.id
            JOIN salons s ON b.salonId = s.id
            ORDER BY b.bookingDate DESC, b.bookingTime DESC
            LIMIT ? OFFSET ?
        `, [limitNum, offset]);

        const [countRow] = await db.query('SELECT COUNT(*) as total FROM bookings');
        const total = countRow?.total || 0;

        res.status(200).json({
            success: true,
            count: rows.length,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum) || 1,
            data: rows.map(b => ({
                ...b,
                _id: b.id,
                customer: { name: b.customerName, email: b.customerEmail },
                salon: { name: b.salonName }
            }))
        });
    } catch (error) {
        next(error);
    }
};
