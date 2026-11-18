const { body } = require('express-validator');
const { randomUUID: uuidv4 } = require('crypto');
const db = require('../config/db');

// Validation rules
exports.createSalonValidation = [
    body('name').trim().notEmpty().withMessage('Salon name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required')
];

// Helper to format salon object for frontend compatibility
const formatSalon = (row) => {
    if (!row) return null;
    let workingHours = row.workingHours;
    if (typeof workingHours === 'string') {
        try { workingHours = JSON.parse(workingHours); } catch (e) {}
    }
    let amenities = row.amenities;
    if (typeof amenities === 'string') {
        try { amenities = JSON.parse(amenities); } catch (e) {}
    }
    let images = row.images;
    if (typeof images === 'string') {
        try { images = JSON.parse(images); } catch (e) {}
    }

    return {
        ...row,
        _id: row.id,
        location: {
            type: 'Point',
            coordinates: [row.longitude, row.latitude],
            formattedAddress: row.formattedAddress || `${row.street || ''}, ${row.city || ''}`,
            street: row.street,
            city: row.city,
            state: row.state,
            zipcode: row.zipcode,
            country: row.country
        },
        workingHours: workingHours || {},
        amenities: amenities || [],
        images: images || [],
        distanceKm: row.distanceKm !== undefined ? parseFloat(row.distanceKm) : undefined,
        distance: row.distanceKm !== undefined ? parseFloat(row.distanceKm) * 1000 : undefined
    };
};

/**
 * @desc    Create a new salon
 * @route   POST /api/salons
 * @access  Private (Salon Owner)
 */
exports.createSalon = async (req, res, next) => {
    try {
        const {
            name,
            description,
            phone,
            email,
            latitude,
            longitude,
            address,
            city,
            state,
            zipcode,
            country,
            workingHours,
            slotDuration = 30,
            amenities = []
        } = req.body;

        // Check if owner already has a salon
        const existing = await db.query('SELECT id FROM salons WHERE ownerId = ?', [req.user.id]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have a registered salon. Please edit your existing studio.'
            });
        }

        const id = uuidv4();
        const defaultHours = workingHours || {
            monday: { open: '09:00', close: '20:00', isClosed: false },
            tuesday: { open: '09:00', close: '20:00', isClosed: false },
            wednesday: { open: '09:00', close: '20:00', isClosed: false },
            thursday: { open: '09:00', close: '20:00', isClosed: false },
            friday: { open: '09:00', close: '20:00', isClosed: false },
            saturday: { open: '09:00', close: '20:00', isClosed: false },
            sunday: { open: '10:00', close: '18:00', isClosed: true }
        };

        await db.query(`
            INSERT INTO salons (
                id, name, description, ownerId, phone, email,
                latitude, longitude, formattedAddress, city, state, zipcode, country,
                workingHours, slotDuration, amenities, isVerified, isActive
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, name, description || '', req.user.id, phone, email || null,
            parseFloat(latitude), parseFloat(longitude), address || '', city || '', state || '', zipcode || '', country || 'India',
            JSON.stringify(defaultHours), parseInt(slotDuration), JSON.stringify(amenities),
            false, true
        ]);

        const [created] = await db.query('SELECT * FROM salons WHERE id = ?', [id]);

        res.status(201).json({
            success: true,
            message: 'Studio registered successfully. Awaiting verification.',
            data: formatSalon(created)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get nearby salons
 * @route   GET /api/salons/nearby
 * @access  Public
 */
exports.getNearbySalons = async (req, res, next) => {
    try {
        const { lat, lng, radius = 10, page = 1, limit = 10, sortBy = 'distance' } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radiusKm = parseFloat(radius);
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        const orderClause = sortBy === 'rating'
            ? 'ORDER BY averageRating DESC, distanceKm ASC'
            : 'ORDER BY distanceKm ASC';

        // Haversine query on TiDB
        const rows = await db.query(`
            SELECT s.*,
                ROUND(6371 * acos(
                    cos(radians(?)) * cos(radians(s.latitude)) *
                    cos(radians(s.longitude) - radians(?)) +
                    sin(radians(?)) * sin(radians(s.latitude))
                ), 2) AS distanceKm
            FROM salons s
            WHERE s.isVerified = 1 AND s.isActive = 1
            HAVING distanceKm <= ?
            ${orderClause}
            LIMIT ? OFFSET ?
        `, [latitude, longitude, latitude, radiusKm, limitNum, offset]);

        const countResult = await db.query(`
            SELECT COUNT(*) as total FROM (
                SELECT s.id,
                    ROUND(6371 * acos(
                        cos(radians(?)) * cos(radians(s.latitude)) *
                        cos(radians(s.longitude) - radians(?)) +
                        sin(radians(?)) * sin(radians(s.latitude))
                    ), 2) AS distanceKm
                FROM salons s
                WHERE s.isVerified = 1 AND s.isActive = 1
                HAVING distanceKm <= ?
            ) sub
        `, [latitude, longitude, latitude, radiusKm]);

        const total = countResult[0]?.total || 0;

        res.status(200).json({
            success: true,
            count: rows.length,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum) || 1,
            data: rows.map(formatSalon)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all salons (with filters)
 * @route   GET /api/salons
 * @access  Public
 */
exports.getSalons = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search, city } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        let whereClauses = ['isVerified = 1', 'isActive = 1'];
        let params = [];

        if (search && search.trim()) {
            whereClauses.push('(name LIKE ? OR description LIKE ? OR city LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s);
        }

        if (city && city.trim()) {
            whereClauses.push('city LIKE ?');
            params.push(`%${city.trim()}%`);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const rows = await db.query(`
            SELECT * FROM salons
            ${whereSQL}
            ORDER BY averageRating DESC, createdAt DESC
            LIMIT ? OFFSET ?
        `, [...params, limitNum, offset]);

        const [countRow] = await db.query(`
            SELECT COUNT(*) as total FROM salons ${whereSQL}
        `, params);

        const total = countRow?.total || 0;

        res.status(200).json({
            success: true,
            count: rows.length,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum) || 1,
            data: rows.map(formatSalon)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single salon
 * @route   GET /api/salons/:id
 * @access  Public
 */
exports.getSalon = async (req, res, next) => {
    try {
        const salons = await db.query('SELECT * FROM salons WHERE id = ?', [req.params.id]);

        if (salons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Salon not found'
            });
        }

        const salon = formatSalon(salons[0]);
        const services = await db.query('SELECT * FROM services WHERE salonId = ? AND isActive = 1', [req.params.id]);

        res.status(200).json({
            success: true,
            data: {
                salon,
                services: services.map(s => ({ ...s, _id: s.id }))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get my salon (for salon owner)
 * @route   GET /api/salons/owner/my
 * @access  Private (Salon Owner)
 */
exports.getMySalon = async (req, res, next) => {
    try {
        const salons = await db.query('SELECT * FROM salons WHERE ownerId = ?', [req.user.id]);

        if (salons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'You have not registered a salon yet'
            });
        }

        const salon = formatSalon(salons[0]);
        const services = await db.query('SELECT * FROM services WHERE salonId = ?', [salon.id]);

        res.status(200).json({
            success: true,
            data: {
                salon,
                services: services.map(s => ({ ...s, _id: s.id }))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update salon
 * @route   PUT /api/salons/:id
 * @access  Private (Salon Owner)
 */
exports.updateSalon = async (req, res, next) => {
    try {
        const salons = await db.query('SELECT * FROM salons WHERE id = ?', [req.params.id]);

        if (salons.length === 0) {
            return res.status(404).json({ success: false, message: 'Salon not found' });
        }

        const salon = salons[0];
        if (salon.ownerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update this salon' });
        }

        const {
            name, description, phone, email,
            latitude, longitude, address, city, state, zipcode,
            slotDuration, workingHours, amenities, coverImage
        } = req.body;

        await db.query(`
            UPDATE salons SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email),
                latitude = COALESCE(?, latitude),
                longitude = COALESCE(?, longitude),
                formattedAddress = COALESCE(?, formattedAddress),
                city = COALESCE(?, city),
                state = COALESCE(?, state),
                zipcode = COALESCE(?, zipcode),
                slotDuration = COALESCE(?, slotDuration),
                workingHours = COALESCE(?, workingHours),
                amenities = COALESCE(?, amenities),
                coverImage = COALESCE(?, coverImage)
            WHERE id = ?
        `, [
            name || null, description || null, phone || null, email || null,
            latitude ? parseFloat(latitude) : null,
            longitude ? parseFloat(longitude) : null,
            address || null, city || null, state || null, zipcode || null,
            slotDuration ? parseInt(slotDuration) : null,
            workingHours ? JSON.stringify(workingHours) : null,
            amenities ? JSON.stringify(amenities) : null,
            coverImage || null,
            req.params.id
        ]);

        const [updated] = await db.query('SELECT * FROM salons WHERE id = ?', [req.params.id]);

        res.status(200).json({
            success: true,
            message: 'Studio profile updated',
            data: formatSalon(updated)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Add service to salon
 * @route   POST /api/salons/:id/services
 * @access  Private (Salon Owner)
 */
exports.addService = async (req, res, next) => {
    try {
        const salons = await db.query('SELECT * FROM salons WHERE id = ?', [req.params.id]);
        if (salons.length === 0) return res.status(404).json({ success: false, message: 'Salon not found' });

        const salon = salons[0];
        if (salon.ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { name, description, category = 'haircut', price, duration = 30, gender = 'unisex' } = req.body;
        const id = uuidv4();

        await db.query(`
            INSERT INTO services (id, salonId, name, description, category, price, duration, gender)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, salon.id, name, description || '', category, parseFloat(price), parseInt(duration), gender]);

        const [service] = await db.query('SELECT * FROM services WHERE id = ?', [id]);

        res.status(201).json({
            success: true,
            message: 'Service added successfully',
            data: { ...service, _id: service.id }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update service
 * @route   PUT /api/salons/:salonId/services/:serviceId
 * @access  Private (Salon Owner)
 */
exports.updateService = async (req, res, next) => {
    try {
        const salons = await db.query('SELECT * FROM salons WHERE id = ?', [req.params.salonId]);
        if (salons.length === 0) return res.status(404).json({ success: false, message: 'Salon not found' });

        if (salons[0].ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { name, category, price, duration } = req.body;

        await db.query(`
            UPDATE services SET
                name = COALESCE(?, name),
                category = COALESCE(?, category),
                price = COALESCE(?, price),
                duration = COALESCE(?, duration)
            WHERE id = ? AND salonId = ?
        `, [
            name || null, category || null,
            price ? parseFloat(price) : null,
            duration ? parseInt(duration) : null,
            req.params.serviceId, req.params.salonId
        ]);

        const [service] = await db.query('SELECT * FROM services WHERE id = ?', [req.params.serviceId]);

        res.status(200).json({
            success: true,
            data: { ...service, _id: service.id }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete service
 * @route   DELETE /api/salons/:salonId/services/:serviceId
 * @access  Private (Salon Owner)
 */
exports.deleteService = async (req, res, next) => {
    try {
        const salons = await db.query('SELECT * FROM salons WHERE id = ?', [req.params.salonId]);
        if (salons.length === 0) return res.status(404).json({ success: false, message: 'Salon not found' });

        if (salons[0].ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await db.query('DELETE FROM services WHERE id = ? AND salonId = ?', [req.params.serviceId, req.params.salonId]);

        res.status(200).json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
