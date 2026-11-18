import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
    SlidersIcon,
    BuildingIcon,
    UserIcon,
    ClockIcon,
    LogOutIcon,
    ShieldCheckIcon,
    ScissorsIcon,
    CheckCircleIcon,
    AlertCircleIcon
} from '../components/Icons';

// Sidebar
const AdminSidebar = () => {
    const location = useLocation();
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const links = [
        { path: '/admin', label: 'Platform Stats', icon: SlidersIcon, exact: true },
        { path: '/admin/salons', label: 'Studios Moderation', icon: BuildingIcon },
        { path: '/admin/users', label: 'User Directory', icon: UserIcon },
        { path: '/admin/bookings', label: 'Global Bookings', icon: ClockIcon }
    ];

    return (
        <aside className="dashboard-sidebar">
            <Link to="/" className="navbar-brand" style={{ marginBottom: '0.25rem' }}>
                <span className="brand-icon">
                    <ShieldCheckIcon size={18} />
                </span>
                <span>Admin<span style={{ color: 'var(--accent-primary)' }}>Control</span></span>
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
                    Super Administrator
                </div>
            </div>

            <ul className="sidebar-nav">
                {links.map(link => {
                    const IconComponent = link.icon;
                    const isActive = link.exact
                        ? location.pathname === link.path
                        : location.pathname.startsWith(link.path) && link.path !== '/admin';

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

// Admin Stats
const AdminDashboardHome = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await adminAPI.getStats();
            setStats(response.data.data);
        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Platform Metrics</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    System-wide activity, partner verification counts, and reservation volumes
                </p>
            </div>

            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{stats.users?.customers || 0}</div>
                        <div className="stat-label">Clients Registered</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.users?.salonOwners || 0}</div>
                        <div className="stat-label">Studio Partners</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.salons?.total || 0}</div>
                        <div className="stat-label">Total Studios</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: stats.salons?.pending > 0 ? 'var(--warning)' : 'inherit' }}>
                            {stats.salons?.pending || 0}
                        </div>
                        <div className="stat-label">Pending Verification</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.bookings?.total || 0}</div>
                        <div className="stat-label">All Time Bookings</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--success)' }}>
                            {stats.bookings?.confirmed || 0}
                        </div>
                        <div className="stat-label">Confirmed Sessions</div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Salon Moderation
const SalonModeration = () => {
    const [salons, setSalons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSalons();
    }, []);

    const fetchSalons = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getSalons();
            setSalons(response.data.data || []);
        } catch (error) {
            setSalons([]);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (id) => {
        try {
            await adminAPI.verifySalon(id);
            toast.success('Studio verified & published');
            fetchSalons();
        } catch (error) {
            toast.error('Failed to verify');
        }
    };

    const handleToggleBlock = async (id, isBlocked) => {
        try {
            if (isBlocked) {
                await adminAPI.unblockSalon(id);
                toast.success('Studio unblocked');
            } else {
                await adminAPI.blockSalon(id);
                toast.success('Studio blocked');
            }
            fetchSalons();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Studios Moderation</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Review new studio submissions, verify locations, and manage platform listings
                </p>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Studio Name</th>
                            <th>Owner / Contact</th>
                            <th>City</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salons.map(s => (
                            <tr key={s._id}>
                                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{s.name}</td>
                                <td>{s.owner?.name || s.phone || 'Partner'}</td>
                                <td>{s.location?.city || 'Delhi'}</td>
                                <td>
                                    {s.isVerified ? (
                                        <span className="badge badge-success">Verified</span>
                                    ) : (
                                        <span className="badge badge-warning">Pending Review</span>
                                    )}
                                    {!s.isActive && (
                                        <span className="badge badge-error" style={{ marginLeft: '0.375rem' }}>Blocked</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                                        {!s.isVerified && (
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={() => handleVerify(s._id)}
                                            >
                                                Approve
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleToggleBlock(s._id, !s.isActive)}
                                        >
                                            {s.isActive ? 'Block' : 'Unblock'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Users Directory
const UsersDirectory = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getUsers();
            setUsers(response.data.data || []);
        } catch (error) {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (id) => {
        try {
            await adminAPI.toggleUserActive(id);
            toast.success('User status toggled');
            fetchUsers();
        } catch (error) {
            toast.error('Failed to update user');
        }
    };

    if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>User Directory</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Manage customer accounts and registered studio owners
                </p>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>User Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{u.name}</td>
                                <td>{u.email}</td>
                                <td>
                                    <span className={`badge ${u.role === 'admin' ? 'badge-gold' : u.role === 'salonOwner' ? 'badge-info' : 'badge-subtle'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge badge-${u.isActive ? 'success' : 'error'}`}>
                                        {u.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleToggleActive(u._id)}
                                    >
                                        {u.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Global Bookings
const GlobalBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getBookings();
            setBookings(response.data.data || []);
        } catch (error) {
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Global Bookings Ledger</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Audit appointments across all active studio partners
                </p>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Studio</th>
                            <th>Date / Time</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map(b => (
                            <tr key={b._id}>
                                <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{b.customer?.name}</td>
                                <td>{b.salon?.name}</td>
                                <td>{b.bookingTime} ({b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : ''})</td>
                                <td style={{ color: 'var(--accent-text)', fontWeight: '600' }}>₹{b.totalAmount}</td>
                                <td>
                                    <span className={`badge badge-${b.status === 'confirmed' ? 'success' : b.status === 'completed' ? 'info' : 'warning'}`}>
                                        {b.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Main Admin Panel Component
const AdminPanel = () => {
    return (
        <div className="dashboard-layout">
            <AdminSidebar />
            <main className="dashboard-content">
                <Routes>
                    <Route path="/" element={<AdminDashboardHome />} />
                    <Route path="/salons" element={<SalonModeration />} />
                    <Route path="/users" element={<UsersDirectory />} />
                    <Route path="/bookings" element={<GlobalBookings />} />
                </Routes>
            </main>
        </div>
    );
};

export default AdminPanel;
