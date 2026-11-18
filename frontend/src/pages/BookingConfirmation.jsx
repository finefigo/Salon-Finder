import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingAPI } from '../services/api';
import { format } from 'date-fns';
import {
    CheckCircleIcon,
    CalendarIcon,
    ClockIcon,
    MapPinIcon,
    PhoneIcon,
    ScissorsIcon,
    ArrowRightIcon
} from '../components/Icons';

const BookingConfirmation = () => {
    const { id } = useParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBooking();
    }, [id]);

    const fetchBooking = async () => {
        try {
            const response = await bookingAPI.getById(id);
            setBooking(response.data.data);
        } catch (error) {
            console.error('Error fetching booking:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner"></div>
                <p style={{ fontSize: '0.875rem' }}>Retrieving your booking confirmation...</p>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="container" style={{ padding: 'var(--spacing-3xl) var(--spacing-lg)', textAlign: 'center' }}>
                <div className="card empty-state" style={{ maxWidth: '500px', margin: '0 auto' }}>
                    <h2>Appointment Not Found</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                        We could not retrieve this reservation record.
                    </p>
                    <Link to="/dashboard" className="btn btn-primary">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const bookingDateFormatted = booking.bookingDate
        ? format(new Date(booking.bookingDate), 'EEEE, MMMM d, yyyy')
        : 'Confirmed Date';

    return (
        <div className="container" style={{ padding: 'var(--spacing-3xl) var(--spacing-lg)', maxWidth: '680px' }}>
            <div className="card" style={{ padding: 'var(--spacing-2xl)' }}>
                {/* Checkmark Badge */}
                <div className="success-checkmark">
                    <CheckCircleIcon size={32} />
                </div>

                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                    <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>
                        Reservation Guaranteed
                    </span>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.375rem' }}>Appointment Confirmed</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Reference Code: <strong style={{ color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>#{booking._id?.slice(-8).toUpperCase()}</strong>
                    </p>
                </div>

                {/* Studio & Time Summary Card */}
                <div style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--spacing-lg)',
                    marginBottom: 'var(--spacing-xl)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--spacing-md)' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--accent-soft)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ScissorsIcon size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem' }}>{booking.salon?.name || 'Studio'}</h3>
                            {booking.salon?.phone && (
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                    Tel: {booking.salon.phone}
                                </span>
                            )}
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 'var(--spacing-md)',
                        paddingTop: 'var(--spacing-md)',
                        borderTop: '1px solid var(--border-subtle)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <CalendarIcon size={16} style={{ color: 'var(--accent-primary)' }} />
                            <span>{bookingDateFormatted}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <ClockIcon size={16} style={{ color: 'var(--accent-primary)' }} />
                            <span>Time: {booking.bookingTime}</span>
                        </div>

                        {booking.salon?.location?.formattedAddress && (
                            <div style={{
                                gridColumn: '1 / -1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.8125rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <MapPinIcon size={15} style={{ flexShrink: 0 }} />
                                <span>{booking.salon.location.formattedAddress}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Services Ledger */}
                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <h4 style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        Reserved Services
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {booking.services?.map((svc, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.625rem 0.875rem',
                                    background: 'var(--bg-canvas)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.875rem'
                                }}
                            >
                                <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                                    {svc.name}
                                </span>
                                <span style={{ color: 'var(--accent-text)', fontWeight: '600' }}>
                                    ₹{svc.price}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 'var(--spacing-md)',
                        paddingTop: 'var(--spacing-md)',
                        borderTop: '1px solid var(--border-subtle)'
                    }}>
                        <span style={{ fontSize: '1rem', fontWeight: '700' }}>Total Amount</span>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-text)' }}>
                            ₹{booking.totalAmount}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link to="/dashboard" className="btn btn-primary" style={{ flex: 1 }}>
                        <span>View My Appointments</span>
                        <ArrowRightIcon size={15} />
                    </Link>
                    <Link to="/salons" className="btn btn-secondary">
                        Browse More Studios
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default BookingConfirmation;
