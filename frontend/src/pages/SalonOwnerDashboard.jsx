import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { salonAPI, slotAPI, bookingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import {
    ScissorsIcon,
    BuildingIcon,
    CalendarIcon,
    ClockIcon,
    SlidersIcon,
    LogOutIcon,
    MapPinIcon,
    PlusIcon,
    TrashIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    RefreshCwIcon
} from '../components/Icons';

// Sidebar
const Sidebar = () => {
    const location = useLocation();
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const links = [
        { path: '/owner', label: 'Overview', icon: SlidersIcon, exact: true },
        { path: '/owner/salon', label: 'Studio Profile', icon: BuildingIcon },
        { path: '/owner/services', label: 'Services Menu', icon: ScissorsIcon },
        { path: '/owner/slots', label: 'Slot Generator', icon: CalendarIcon },
        { path: '/owner/bookings', label: 'Appointments', icon: ClockIcon }
    ];

    return (
        <aside className="dashboard-sidebar">
            <Link to="/" className="navbar-brand" style={{ marginBottom: '0.25rem' }}>
                <span className="brand-icon">
                    <ScissorsIcon size={18} />
                </span>
                <span>Salon<span style={{ color: 'var(--accent-primary)' }}>Finder</span></span>
            </Link>

            <div style={{
                padding: '0.75rem',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                marginTop: '1rem',
                border: '1px solid var(--border-subtle)'
            }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {user?.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>
                    Studio Partner Portal
                </div>
            </div>

            <ul className="sidebar-nav">
                {links.map(link => {
                    const IconComponent = link.icon;
                    const isActive = link.exact
                        ? location.pathname === link.path
                        : location.pathname.startsWith(link.path) && link.path !== '/owner';

                    return (
                        <li key={link.path}>
                            <Link
                                to={link.path}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                            >
                                <IconComponent size={16} />
                                <span>{link.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>

            <div style={{ marginTop: 'auto', paddingTop: 'var(--spacing-xl)' }}>
                <button
                    onClick={handleLogout}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                    <LogOutIcon size={15} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

// Dashboard Overview
const DashboardHome = () => {
    const [stats, setStats] = useState({ today: 0, confirmed: 0, pending: 0 });
    const [todayBookings, setTodayBookings] = useState([]);
    const [hasSalon, setHasSalon] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initDashboard();
    }, []);

    const initDashboard = async () => {
        setLoading(true);
        try {
            await salonAPI.getMySalon();
            const response = await bookingAPI.getTodayBookings();
            const bookings = response.data.data || [];
            setTodayBookings(bookings);
            setStats({
                today: bookings.length,
                confirmed: bookings.filter(b => b.status === 'confirmed').length,
                pending: bookings.filter(b => b.status === 'pending').length
            });
        } catch (error) {
            if (error.response?.status === 404) {
                setHasSalon(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await bookingAPI.updateStatus(id, { status });
            toast.success(`Booking status: ${status}`);
            initDashboard();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update');
        }
    };

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner"></div>
                <p style={{ fontSize: '0.875rem' }}>Loading studio dashboard...</p>
            </div>
        );
    }

    if (!hasSalon) {
        return (
            <div className="card empty-state" style={{ maxWidth: '580px', margin: '2rem auto' }}>
                <div className="empty-state-icon">
                    <BuildingIcon size={24} />
                </div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Welcome to Partner Portal</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--spacing-xl)' }}>
                    You haven't set up your studio profile yet. Register your studio details and address to start taking client bookings.
                </p>
                <Link to="/owner/salon" className="btn btn-primary btn-lg">
                    <span>Create Studio Profile</span>
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Studio Overview</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Live appointment queue for today ({format(new Date(), 'EEEE, MMM d')})
                </p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.today}</div>
                    <div className="stat-label">Appointments Today</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.confirmed}</div>
                    <div className="stat-label">Confirmed Clients</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.pending}</div>
                    <div className="stat-label">Pending Action</div>
                </div>
            </div>

            <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--spacing-md)' }}>
                Today's Appointments Queue
            </h3>

            {todayBookings.length === 0 ? (
                <div className="card empty-state">
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                        No appointments booked for today yet. Make sure your slots are generated in the Slot Generator!
                    </p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Slot Time</th>
                                <th>Client Name</th>
                                <th>Contact</th>
                                <th>Services</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {todayBookings.map(b => (
                                <tr key={b._id}>
                                    <td style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
                                        {b.bookingTime}
                                    </td>
                                    <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                        {b.customer?.name}
                                    </td>
                                    <td>
                                        {b.customer?.phone || b.customer?.email}
                                    </td>
                                    <td>
                                        {b.services.map(s => s.name).join(', ')}
                                    </td>
                                    <td>
                                        <span className={`badge badge-${b.status === 'confirmed' ? 'success' : 'warning'}`}>
                                            {b.status}
                                        </span>
                                    </td>
                                    <td>
                                        {b.status === 'confirmed' && (
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={() => updateStatus(b._id, 'completed')}
                                            >
                                                Mark Completed
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Studio Management
const SalonManagement = () => {
    const [salon, setSalon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [formData, setFormData] = useState({
        name: '', description: '', phone: '', email: '',
        latitude: '', longitude: '', address: '', city: '',
        slotDuration: 30
    });

    const getCurrentLocation = async () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation not supported by browser');
            return;
        }

        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setFormData(prev => ({
                    ...prev,
                    latitude: latitude.toFixed(6),
                    longitude: longitude.toFixed(6)
                }));

                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await response.json();
                    if (data?.address) {
                        setFormData(prev => ({
                            ...prev,
                            address: data.display_name || prev.address,
                            city: data.address.city || data.address.town || data.address.village || prev.city
                        }));
                    }
                } catch (e) {
                    // Fallback ok
                }

                toast.success('Location pinpointed');
                setGettingLocation(false);
            },
            (err) => {
                setGettingLocation(false);
                toast.error('Could not detect location. Please enter coordinates manually.');
            },
            { enableHighAccuracy: false, timeout: 10000 }
        );
    };

    useEffect(() => {
        fetchSalon();
    }, []);

    const fetchSalon = async () => {
        try {
            const response = await salonAPI.getMySalon();
            const s = response.data.data.salon;
            setSalon(s);
            setFormData({
                name: s.name || '',
                description: s.description || '',
                phone: s.phone || '',
                email: s.email || '',
                latitude: s.location?.coordinates?.[1] || '',
                longitude: s.location?.coordinates?.[0] || '',
                address: s.location?.formattedAddress || '',
                city: s.location?.city || '',
                slotDuration: s.slotDuration || 30
            });
        } catch {
            setSalon(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (salon) {
                await salonAPI.update(salon._id, formData);
                toast.success('Studio profile updated');
            } else {
                await salonAPI.create(formData);
                toast.success('Studio registered successfully');
            }
            fetchSalon();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save studio profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
                    {salon ? 'Edit Studio Profile' : 'Register New Studio'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Set up your business address, contact information, and appointment duration
                </p>
            </div>

            {salon && !salon.isVerified && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 1.25rem',
                    background: 'var(--warning-bg)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--warning)',
                    fontSize: '0.875rem',
                    marginBottom: 'var(--spacing-xl)'
                }}>
                    <AlertCircleIcon size={18} />
                    <span>Your studio is pending admin verification. It will appear in nearby searches once approved.</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '800px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-md)' }}>
                    <div className="form-group">
                        <label className="form-label">Studio Name *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Phone Contact *</label>
                        <input
                            type="tel"
                            className="form-input"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Public Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Default Slot Duration</label>
                        <select
                            className="form-select"
                            value={formData.slotDuration}
                            onChange={e => setFormData({ ...formData, slotDuration: Number(e.target.value) })}
                        >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>60 minutes</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Description & Amenities</label>
                        <textarea
                            className="form-input"
                            rows={3}
                            placeholder="Tell clients about your stylists, specialties, and atmosphere..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    {/* Geolocation Section */}
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                            <label className="form-label" style={{ margin: 0 }}>
                                Studio GPS Coordinates & Map Pin *
                            </label>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={getCurrentLocation}
                                disabled={gettingLocation}
                            >
                                <MapPinIcon size={14} />
                                <span>{gettingLocation ? 'Detecting...' : 'Pin Current GPS'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Latitude *</label>
                        <input
                            type="number"
                            step="any"
                            className="form-input"
                            placeholder="e.g. 28.6139"
                            value={formData.latitude}
                            onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Longitude *</label>
                        <input
                            type="number"
                            step="any"
                            className="form-input"
                            placeholder="e.g. 77.2090"
                            value={formData.longitude}
                            onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Street Address</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. 42 Main Blvd"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">City</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Delhi"
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={saving}
                    style={{ marginTop: 'var(--spacing-md)' }}
                >
                    {saving ? 'Saving...' : (salon ? 'Save Studio Profile' : 'Create Studio Profile')}
                </button>
            </form>
        </div>
    );
};

// Services Management
const ServicesManagement = () => {
    const [salon, setSalon] = useState(null);
    const [services, setServices] = useState([]);
    const [newService, setNewService] = useState({ name: '', category: 'haircut', price: '', duration: 30 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await salonAPI.getMySalon();
            setSalon(response.data.data.salon);
            setServices(response.data.data.services || []);
        } catch {
            setSalon(null);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await salonAPI.addService(salon._id, newService);
            toast.success('Service added to menu');
            setNewService({ name: '', category: 'haircut', price: '', duration: 30 });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add service');
        }
    };

    const handleDelete = async (serviceId) => {
        if (!window.confirm('Delete this service from your public menu?')) return;
        try {
            await salonAPI.deleteService(salon._id, serviceId);
            toast.success('Service removed');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete service');
        }
    };

    if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

    if (!salon) {
        return (
            <div className="card empty-state">
                <h3>Please create your studio profile first</h3>
                <Link to="/owner/salon" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    Create Profile
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Services & Pricing Menu</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Clients choose these services when reserving time slots
                </p>
            </div>

            {/* Add Service Card */}
            <form onSubmit={handleAdd} className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PlusIcon size={16} style={{ color: 'var(--accent-primary)' }} />
                    <span>Add New Service</span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-md)', alignItems: 'flex-end' }}>
                    <div>
                        <label className="form-label">Service Title *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Precision Haircut & Styling"
                            value={newService.name}
                            onChange={e => setNewService({ ...newService, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="form-label">Category</label>
                        <select
                            className="form-select"
                            value={newService.category}
                            onChange={e => setNewService({ ...newService, category: e.target.value })}
                        >
                            {['haircut', 'beard', 'shave', 'facial', 'spa', 'massage', 'hair-color', 'manicure', 'pedicure', 'other'].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="form-label">Price (₹) *</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="500"
                            value={newService.price}
                            onChange={e => setNewService({ ...newService, price: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="form-label">Duration (Mins) *</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="30"
                            value={newService.duration}
                            onChange={e => setNewService({ ...newService, duration: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                            <span>Add Service</span>
                        </button>
                    </div>
                </div>
            </form>

            {/* Existing Services Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Duration</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No services added yet. Use the form above to add your first menu item.
                                </td>
                            </tr>
                        ) : (
                            services.map(s => (
                                <tr key={s._id}>
                                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{s.name}</td>
                                    <td><span className="badge badge-subtle">{s.category}</span></td>
                                    <td style={{ color: 'var(--accent-text)', fontWeight: '600' }}>₹{s.price}</td>
                                    <td>{s.duration} mins</td>
                                    <td>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDelete(s._id)}
                                        >
                                            <TrashIcon size={13} />
                                            <span>Delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Slots Management
const SlotsManagement = () => {
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const response = await slotAPI.generate({ startDate, endDate });
            toast.success(response.data.message || 'Slots generated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to generate slots');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Batch Slot Generator</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Generate available booking slots for upcoming dates based on your operating hours
                </p>
            </div>

            <div className="card" style={{ maxWidth: '680px' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Generate Slot Inventory</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--spacing-lg)' }}>
                    Slots are automatically created from your working hours schedule with your configured slot duration. Duplicate dates are safely skipped.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                    <div>
                        <label className="form-label">Start Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="form-label">End Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleGenerate}
                    disabled={generating}
                >
                    {generating ? (
                        <>
                            <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span>
                            <span>Generating Time Slots...</span>
                        </>
                    ) : (
                        <>
                            <CalendarIcon size={15} />
                            <span>Generate Slots</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

// Bookings Schedule
const BookingsManagement = () => {
    const [bookings, setBookings] = useState([]);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBookings();
    }, [date]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const response = await bookingAPI.getSalonBookings({ date });
            setBookings(response.data.data || []);
        } catch (error) {
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await bookingAPI.updateStatus(id, { status });
            toast.success(`Booking ${status}`);
            fetchBookings();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update');
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Appointments Schedule</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Browse client reservations by appointment date
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        Select Date:
                    </span>
                    <input
                        type="date"
                        className="form-input"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        style={{ width: 'auto' }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Client</th>
                                <th>Phone / Email</th>
                                <th>Services</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No bookings scheduled for {date}.
                                    </td>
                                </tr>
                            ) : (
                                bookings.map(b => (
                                    <tr key={b._id}>
                                        <td style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>{b.bookingTime}</td>
                                        <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{b.customer?.name}</td>
                                        <td>{b.customer?.phone || b.customer?.email}</td>
                                        <td>{b.services?.map(s => s.name).join(', ')}</td>
                                        <td style={{ color: 'var(--accent-text)', fontWeight: '600' }}>₹{b.totalAmount}</td>
                                        <td>
                                            <span className={`badge badge-${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'error' : 'warning'}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td>
                                            {b.status === 'confirmed' && (
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => updateStatus(b._id, 'completed')}
                                                >
                                                    Complete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Main Salon Owner Dashboard Layout
const SalonOwnerDashboard = () => {
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="dashboard-content">
                <Routes>
                    <Route path="/" element={<DashboardHome />} />
                    <Route path="/salon" element={<SalonManagement />} />
                    <Route path="/services" element={<ServicesManagement />} />
                    <Route path="/slots" element={<SlotsManagement />} />
                    <Route path="/bookings" element={<BookingsManagement />} />
                </Routes>
            </main>
        </div>
    );
};

export default SalonOwnerDashboard;
