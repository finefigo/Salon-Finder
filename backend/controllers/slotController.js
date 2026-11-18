const { randomUUID: uuidv4 } = require('crypto');
const db = require('../config/db');
const { generateSlotsForRange } = require('../utils/slotGenerator');

/**
 * Slot Controller
 * Handles slot generation and management on TiDB MySQL
 */

/**
 * @desc    Generate slots for a date range
 * @route   POST /api/slots/generate
 * @access  Private (Salon Owner)
 */
exports.generateSlots = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.body;

        const salons = await db.query('SELECT * FROM salons WHERE ownerId = ?', [req.user.id]);
        if (salons.length === 0) {
            return res.status(404).json({ success: false, message: 'You must create a salon first' });
        }

        const salon = salons[0];
        let workingHours = salon.workingHours;
        if (typeof workingHours === 'string') {
            try { workingHours = JSON.parse(workingHours); } catch (e) {}
        }
        salon.workingHours = workingHours;
        salon._id = salon.id;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            return res.status(400).json({ success: false, message: 'Start date cannot be in the past' });
        }

        if (end < start) {
            return res.status(400).json({ success: false, message: 'End date must be after start date' });
        }

        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
            return res.status(400).json({ success: false, message: 'Cannot generate slots for more than 30 days at once' });
        }

        const slotsToCreate = generateSlotsForRange(salon, start, end);

        if (slotsToCreate.length === 0) {
            return res.status(400).json({ success: false, message: 'No slots to generate. Check your operating hours.' });
        }

        let insertedCount = 0;
        for (const slot of slotsToCreate) {
            const dateStr = slot.date.toISOString().split('T')[0];
            const slotId = uuidv4();
            const result = await db.query(`
                INSERT IGNORE INTO slots (id, salonId, date, startTime, endTime, isAvailable, isEnabled)
                VALUES (?, ?, ?, ?, ?, 1, 1)
            `, [slotId, salon.id, dateStr, slot.startTime, slot.endTime]);

            if (result.affectedRows > 0) {
                insertedCount++;
            }
        }

        res.status(201).json({
            success: true,
            message: `${insertedCount} new slots generated (${slotsToCreate.length} processed)`,
            data: {
                totalGenerated: slotsToCreate.length,
                inserted: insertedCount
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get available slots for a salon on a specific date
 * @route   GET /api/slots/salon/:salonId
 * @access  Public
 */
exports.getSalonSlots = async (req, res, next) => {
    try {
        const { salonId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        const queryDate = new Date(date).toISOString().split('T')[0];

        const slots = await db.query(`
            SELECT * FROM slots
            WHERE salonId = ? AND date = ? AND isEnabled = 1
            ORDER BY startTime ASC
        `, [salonId, queryDate]);

        res.status(200).json({
            success: true,
            count: slots.length,
            data: slots.map(s => ({
                ...s,
                _id: s.id,
                isAvailable: Boolean(s.isAvailable),
                isEnabled: Boolean(s.isEnabled)
            }))
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get my salon's slots (for salon owner)
 * @route   GET /api/slots/my
 * @access  Private (Salon Owner)
 */
exports.getMySlots = async (req, res, next) => {
    try {
        const { date, startDate, endDate } = req.query;

        const salons = await db.query('SELECT id FROM salons WHERE ownerId = ?', [req.user.id]);
        if (salons.length === 0) {
            return res.status(404).json({ success: false, message: 'You must create a salon first' });
        }

        const salonId = salons[0].id;
        let whereSQL = 'WHERE s.salonId = ?';
        let params = [salonId];

        if (date) {
            const queryDate = new Date(date).toISOString().split('T')[0];
            whereSQL += ' AND s.date = ?';
            params.push(queryDate);
        } else if (startDate && endDate) {
            const sDate = new Date(startDate).toISOString().split('T')[0];
            const eDate = new Date(endDate).toISOString().split('T')[0];
            whereSQL += ' AND s.date BETWEEN ? AND ?';
            params.push(sDate, eDate);
        }

        const slots = await db.query(`
            SELECT s.*, u.name as bookedByName, u.email as bookedByEmail, u.phone as bookedByPhone
            FROM slots s
            LEFT JOIN users u ON s.bookedById = u.id
            ${whereSQL}
            ORDER BY s.date ASC, s.startTime ASC
        `, params);

        res.status(200).json({
            success: true,
            count: slots.length,
            data: slots.map(s => ({
                ...s,
                _id: s.id,
                isAvailable: Boolean(s.isAvailable),
                isEnabled: Boolean(s.isEnabled),
                bookedBy: s.bookedById ? {
                    id: s.bookedById,
                    _id: s.bookedById,
                    name: s.bookedByName,
                    email: s.bookedByEmail,
                    phone: s.bookedByPhone
                } : null
            }))
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Enable/disable a slot
 * @route   PUT /api/slots/:id/toggle
 * @access  Private (Salon Owner)
 */
exports.toggleSlot = async (req, res, next) => {
    try {
        const slots = await db.query(`
            SELECT s.*, sal.ownerId
            FROM slots s
            JOIN salons sal ON s.salonId = sal.id
            WHERE s.id = ?
        `, [req.params.id]);

        if (slots.length === 0) {
            return res.status(404).json({ success: false, message: 'Slot not found' });
        }

        const slot = slots[0];
        if (slot.ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (!slot.isAvailable) {
            return res.status(400).json({ success: false, message: 'Cannot disable a booked slot' });
        }

        const newEnabled = slot.isEnabled ? 0 : 1;
        await db.query('UPDATE slots SET isEnabled = ? WHERE id = ?', [newEnabled, req.params.id]);

        res.status(200).json({
            success: true,
            message: `Slot ${newEnabled ? 'enabled' : 'disabled'}`,
            data: { ...slot, _id: slot.id, isEnabled: Boolean(newEnabled) }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Bulk enable/disable slots
 * @route   PUT /api/slots/bulk-toggle
 * @access  Private (Salon Owner)
 */
exports.bulkToggleSlots = async (req, res, next) => {
    try {
        const { slotIds = [], isEnabled } = req.body;

        const salons = await db.query('SELECT id FROM salons WHERE ownerId = ?', [req.user.id]);
        if (salons.length === 0) return res.status(404).json({ success: false, message: 'Salon not found' });

        if (slotIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No slot IDs provided' });
        }

        const placeholders = slotIds.map(() => '?').join(',');
        const result = await db.query(`
            UPDATE slots
            SET isEnabled = ?
            WHERE id IN (${placeholders}) AND salonId = ? AND isAvailable = 1
        `, [isEnabled ? 1 : 0, ...slotIds, salons[0].id]);

        res.status(200).json({
            success: true,
            message: `${result.affectedRows} slots updated`,
            data: { modifiedCount: result.affectedRows }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete future slots
 * @route   DELETE /api/slots/future
 * @access  Private (Salon Owner)
 */
exports.deleteFutureSlots = async (req, res, next) => {
    try {
        const salons = await db.query('SELECT id FROM salons WHERE ownerId = ?', [req.user.id]);
        if (salons.length === 0) return res.status(404).json({ success: false, message: 'Salon not found' });

        const today = new Date().toISOString().split('T')[0];

        const result = await db.query(`
            DELETE FROM slots
            WHERE salonId = ? AND date >= ? AND isAvailable = 1
        `, [salons[0].id, today]);

        res.status(200).json({
            success: true,
            message: `${result.affectedRows} future unbooked slots deleted`
        });
    } catch (error) {
        next(error);
    }
};
