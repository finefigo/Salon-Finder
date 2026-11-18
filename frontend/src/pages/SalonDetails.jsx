import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salonAPI, slotAPI, bookingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import {
    MapPinIcon,
    StarIcon,
    ClockIcon,
    PhoneIcon,
    ShieldCheckIcon,
    CheckIcon,
    CalendarIcon,
    ScissorsIcon,
    ArrowRightIcon
} from '../components/Icons';

const SalonDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();

    const [salon, setSalon] = useState(null);
    const [services, setServices] = useState([]);
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [booking, setBooking] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');

    useEffect(() => {
        fetchSalonDetails();
    }, [id]);

    useEffect(() => {
        if (salon) {
            fetchSlots();
        }
    }, [selectedDate, salon]);

    const fetchSalonDetails = async () => {
        try {
            const response = await salonAPI.getById(id);
            setSalon(response.data.data.salon);
            setServices(response.data.data.services || []);
        } catch (error) {
            toast.error('Could not load salon details');
            navigate('/salons');
        } finally {
            setLoading(false);
        }
    };

    const fetchSlots = async () => {
        try {
            const response = await slotAPI.getSalonSlots(id, selectedDate);
            setSlots(response.data.data || []);
        } catch (error) {
            console.error('Error fetching slots:', error);
            setSlots([]);
        }
    };

    const toggleService = (serviceId) => {
        setSelectedServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(sId => sId !== serviceId)
                : [...prev, serviceId]
        );
    };

    const getTotalPrice = () => {
        return services
            .filter(s => selectedServices.includes(s._id))
            .reduce((sum, s) => sum + s.price, 0);
    };

    const getTotalDuration = () => {
        return services
            .filter(s => selectedServices.includes(s._id))
            .reduce((sum, s) => sum + (s.duration || 30), 0);
    };

    const handleBooking = async () => {
        if (!isAuthenticated) {
            toast.error('Please sign in to complete your booking');
            navigate('/login');
            return;
        }

        if (user.role !== 'customer') {
            toast.error('Salon owners cannot book customer appointments');
            return;
        }

        if (selectedServices.length === 0) {
            toast.error('Please select at least one service');
            return;
        }

        if (!selectedSlot) {
            toast.error('Please choose an available time slot');
            return;
        }

        setBooking(true);
        try {
            const response = await bookingAPI.create({
                slotId: selectedSlot,
                serviceIds: selectedServices
            });
            toast.success('Appointment confirmed!');
            navigate(`/booking/confirmation/${response.data.data._id}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Booking failed');
        } finally {
            setBooking(false);
        }
    };

    // 7 Days Date options
    const dateOptions = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(new Date(), i);
        return {
            value: format(date, 'yyyy-MM-dd'),
            dayName: format(date, 'EEE'),
            dayNum: format(date, 'd'),
            month: format(date, 'MMM')
        };
    });

    // Categories available in services
    const categories = ['all', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))];

    const filteredServices = activeCategory === 'all'
        ? services
        : services.filter(s => s.category === activeCategory);

    const selectedSlotObj = slots.find(s => s._id === selectedSlot);

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner"></div>
                <p style={{ fontSize: '0.875rem' }}>Loading salon profile...</p>
            </div>
        );
    }

    if (!salon) return null;

    const coverImg = (salon.coverImage && salon.coverImage.startsWith('http'))
        ? salon.coverImage
        : 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80';

    return (
        <div className="container" style={{
            padding: 'var(--spacing-2xl) var(--spacing-lg)',
            paddingBottom: (selectedServices.length > 0 || selectedSlot) ? '120px' : 'var(--spacing-2xl)'
        }}>
            {/* Salon Profile Header */}
            <div className="salon-hero-banner">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-xl)', alignItems: 'center' }}>
                    <div style={{
                        position: 'relative',
                        borderRadius: 'var(--radius-xl)',
                        overflow: 'hidden',
                        aspectRatio: '16 / 10',
                        maxHeight: '260px'
                    }}>
                        <img
                            src={coverImg}
                            alt={salon.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {salon.isVerified && (
                            <span className="salon-verified-tag">
                                <ShieldCheckIcon size={12} />
                                <span>Verified Studio</span>
                            </span>
                        )}
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <div className="salon-rating-pill">
                                <StarIcon size={14} filled={true} />
                                <span>{salon.averageRating ? salon.averageRating.toFixed(1) : '4.8'}</span>
                            </div>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                ({salon.totalReviews || 18} client reviews)
                            </span>
                            <span className="badge badge-gold">
                                Slot Duration: {salon.slotDuration || 30}m
                            </span>
                        </div>

                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{salon.name}</h1>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            marginBottom: 'var(--spacing-md)'
                        }}>
                            <MapPinIcon size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            <span>{salon.location?.formattedAddress || salon.location?.city || 'Location provided'}</span>
                        </div>

                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            lineHeight: '1.6',
                            marginBottom: 'var(--spacing-lg)'
                        }}>
                            {salon.description || 'Dedicated to offering premium styling, personalized care, and top-tier grooming services in an ambient and relaxed environment.'}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            {salon.phone && (
                                <a
                                    href={`tel:${salon.phone}`}
                                    className="btn btn-secondary btn-sm"
                                    style={{ gap: '0.375rem' }}
                                >
                                    <PhoneIcon size={14} />
                                    <span>{salon.phone}</span>
                                </a>
                            )}
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                Instant reservation with real-time seat lock
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Two-Column Booking Layout */}
            <div className="details-layout-grid">
                {/* Left Column: Services Selection */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ScissorsIcon size={18} style={{ color: 'var(--accent-primary)' }} />
                            <span>1. Choose Services</span>
                        </h2>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {selectedServices.length} selected
                        </span>
                    </div>

                    {/* Category Filter Pills */}
                    {categories.length > 2 && (
                        <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: 'var(--spacing-md)' }}>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(cat)}
                                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', textTransform: 'capitalize' }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredServices.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                No services found under this category.
                            </p>
                        </div>
                    ) : (
                        <div className="service-list">
                            {filteredServices.map(service => {
                                const isSelected = selectedServices.includes(service._id);
                                return (
                                    <div
                                        key={service._id}
                                        className={`service-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleService(service._id)}
                                    >
                                        <div>
                                            <div className="service-name">{service.name}</div>
                                            <div className="service-meta">
                                                <ClockIcon size={13} />
                                                <span>{service.duration || 30} mins</span>
                                                {service.category && (
                                                    <span>• {service.category}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                            <div className="service-price">₹{service.price}</div>
                                            <div style={{
                                                width: '22px',
                                                height: '22px',
                                                borderRadius: '50%',
                                                border: isSelected ? 'none' : '1.5px solid var(--border-card)',
                                                background: isSelected ? 'var(--accent-primary)' : 'transparent',
                                                color: 'var(--text-inverse)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all var(--transition-fast)'
                                            }}>
                                                {isSelected && <CheckIcon size={14} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Column: Date & Slot Selection */}
                <div>
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <CalendarIcon size={18} style={{ color: 'var(--accent-primary)' }} />
                            <span>2. Select Date & Slot</span>
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                            Choose your preferred appointment day
                        </p>
                    </div>

                    {/* Date Carousel Strip */}
                    <div className="date-strip">
                        {dateOptions.map(({ value, dayName, dayNum, month }) => (
                            <button
                                key={value}
                                className={`date-btn ${selectedDate === value ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelectedDate(value);
                                    setSelectedSlot(null);
                                }}
                            >
                                <span className="date-btn-day">{dayName}</span>
                                <span className="date-btn-num">{dayNum}</span>
                                <span className="date-btn-month">{month}</span>
                            </button>
                        ))}
                    </div>

                    {/* Slots Grid */}
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                Available Timeslots ({format(new Date(selectedDate), 'MMM d')})
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {slots.filter(s => s.isAvailable).length} slots free
                            </span>
                        </div>

                        {slots.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-lg)', fontSize: '0.875rem' }}>
                                No slots configured for this date yet. Check back soon.
                            </p>
                        ) : (
                            <div className="slots-container">
                                {slots.map(slot => (
                                    <button
                                        key={slot._id}
                                        className={`slot-btn ${selectedSlot === slot._id ? 'selected' : ''}`}
                                        onClick={() => setSelectedSlot(slot._id)}
                                        disabled={!slot.isAvailable}
                                    >
                                        {slot.startTime}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Floating Booking Bar */}
            {(selectedServices.length > 0 || selectedSlot) && (
                <div className="booking-summary-bar">
                    <div className="summary-content">
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    {selectedServices.length} {selectedServices.length === 1 ? 'service' : 'services'} ({getTotalDuration()} mins)
                                </span>
                                {selectedSlotObj && (
                                    <>
                                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', fontWeight: '600' }}>
                                            {format(new Date(selectedDate), 'MMM d')} @ {selectedSlotObj.startTime}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-text)' }}>
                                ₹{getTotalPrice()}
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleBooking}
                            disabled={booking || selectedServices.length === 0 || !selectedSlot}
                        >
                            {booking ? (
                                <>
                                    <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                                    <span>Confirming Appointment...</span>
                                </>
                            ) : (
                                <>
                                    <span>Confirm Appointment</span>
                                    <ArrowRightIcon size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalonDetails;
