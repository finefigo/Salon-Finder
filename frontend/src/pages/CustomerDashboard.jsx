import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
    CalendarIcon,
    ClockIcon,
    MapPinIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    SearchIcon,
    ScissorsIcon
} from '../components/Icons';

const CustomerDashboard = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBookings();
    }, [activeTab]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            let response;
            if (activeTab === 'upcoming') {
                response = await bookingAPI.getUpcoming();
            } else {
                response = await bookingAPI.getMyBookings({
                    status: activeTab === 'past' ? 'completed' : undefined
                });
            }
            setBookings(response.data.data || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (bookingId) => {
        if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

        try {
            await bookingAPI.cancel(bookingId, 'Cancelled by customer');
            toast.success('Appointment cancelled');
            fetchBookings();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to cancel');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'confirmed':
                return <span className="badge badge-success">Confirmed</span>;
            case 'pending':
                return <span className="badge badge-warning">Pending</span>;
            case 'completed':
                return <span className="badge badge-info">Completed</span>;
            case 'cancelled':
                return <span className="badge badge-error">Cancelled</span>;
            default:
                return <span className="badge badge-subtle">{status}</span>;
        }
    };

    return (
        <div className="container" style={{ padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
            {/* User Header Profile */}
            <div className="card" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--spacing-lg)',
                marginBottom: 'var(--spacing-xl)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        color: 'var(--text-inverse)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: '800'
                    }}>
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <h1 style={{ fontSize: '1.5rem' }}>{user?.name}</h1>
                            <span className="badge badge-gold">Client Account</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                            {user?.email} • {user?.phone || 'No phone set'}
                        </p>
                    </div>
                </div>

                <Link to="/salons" className="btn btn-primary">
                    <SearchIcon size={15} />
                    <span>Book New Session</span>
                </Link>
            </div>

            {/* Quick Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{bookings.length}</div>
                    <div className="stat-label">Total Appointments</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">
                        {bookings.filter(b => b.status === 'confirmed').length}
                    </div>
                    <div className="stat-label">Confirmed Sessions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">
                        ₹{bookings.reduce((sum, b) => b.status !== 'cancelled' ? sum + (b.totalAmount || 0) : sum, 0)}
                    </div>
                    <div className="stat-label">Total Grooming Spend</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: 'var(--spacing-xl)'
            }}>
                {[
                    { id: 'upcoming', label: 'Upcoming', icon: CalendarIcon },
                    { id: 'all', label: 'All Appointments', icon: ClockIcon },
                    { id: 'past', label: 'Completed', icon: CheckCircleIcon }
                ].map(tab => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1.25rem',
                                borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontWeight: isActive ? '600' : '500',
                                fontSize: '0.875rem',
                                transition: 'all var(--transition-fast)'
                            }}
                        >
                            <IconComponent size={15} style={{ color: isActive ? 'var(--accent-primary)' : 'currentColor' }} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Bookings List */}
            {loading ? (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p style={{ fontSize: '0.875rem' }}>Fetching appointment schedule...</p>
                </div>
            ) : bookings.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-state-icon">
                        <CalendarIcon size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No {activeTab} appointments found</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--spacing-lg)' }}>
                        You don't have any appointments in this view. Browse nearby studios to book your next session.
                    </p>
                    <Link to="/salons" className="btn btn-primary">
                        <span>Find Studios Near Me</span>
                        <ArrowRightIcon size={14} />
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {bookings.map(booking => {
                        const bookingDateFormatted = booking.bookingDate
                            ? format(new Date(booking.bookingDate), 'EEE, MMM d, yyyy')
                            : 'Date scheduled';

                        const canCancel = ['pending', 'confirmed'].includes(booking.status);

                        return (
                            <div key={booking._id} className="card card-hover" style={{ padding: 'var(--spacing-lg)' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    flexWrap: 'wrap',
                                    gap: 'var(--spacing-md)'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                                            <h3 style={{ fontSize: '1.125rem' }}>
                                                {booking.salon?.name || 'Studio Appointment'}
                                            </h3>
                                            {getStatusBadge(booking.status)}
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            fontSize: '0.8125rem',
                                            color: 'var(--text-secondary)',
                                            marginBottom: '0.75rem',
                                            flexWrap: 'wrap'
                                        }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                                                <CalendarIcon size={14} style={{ color: 'var(--accent-primary)' }} />
                                                <strong>{bookingDateFormatted}</strong> at <strong>{booking.bookingTime}</strong>
                                            </span>

                                            {booking.salon?.location?.formattedAddress && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                                                    <MapPinIcon size={14} />
                                                    {booking.salon.location.formattedAddress}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            flexWrap: 'wrap',
                                            fontSize: '0.8125rem'
                                        }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Services:</span>
                                            {booking.services?.map((svc, i) => (
                                                <span key={i} className="badge badge-subtle">
                                                    {svc.name} (₹{svc.price})
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                        gap: '0.5rem'
                                    }}>
                                        <div style={{
                                            fontFamily: 'var(--font-heading)',
                                            fontSize: '1.25rem',
                                            fontWeight: '700',
                                            color: 'var(--accent-text)'
                                        }}>
                                            ₹{booking.totalAmount}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {canCancel && (
                                                <button
                                                    onClick={() => handleCancel(booking._id)}
                                                    className="btn btn-danger btn-sm"
                                                >
                                                    Cancel
                                                </button>
                                            )}

                                            {booking.salon?._id && (
                                                <Link
                                                    to={`/salons/${booking.salon._id}`}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    View Studio
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
