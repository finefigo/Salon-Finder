import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { salonAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
    MapPinIcon,
    StarIcon,
    SearchIcon,
    SlidersIcon,
    RefreshCwIcon,
    ShieldCheckIcon,
    ArrowRightIcon
} from '../components/Icons';

const SalonList = () => {
    const [searchParams] = useSearchParams();
    const initialSearch = searchParams.get('search') || '';

    const [salons, setSalons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState({ lat: null, lng: null });
    const [locationStatus, setLocationStatus] = useState('detecting'); // detecting, success, fallback, error
    const [radius, setRadius] = useState(10);
    const [sortBy, setSortBy] = useState('distance');
    const [searchTerm, setSearchTerm] = useState(initialSearch);

    // Get user location
    const requestLocation = async () => {
        setLocationStatus('detecting');

        if (!navigator.geolocation) {
            setLocationStatus('error');
            setLocation({ lat: 28.6139, lng: 77.2090 });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setLocationStatus('success');
                toast.success('Location updated');
            },
            (error) => {
                console.warn('Geolocation notice:', error.message);
                // Fallback location: Delhi coordinates
                setLocation({ lat: 28.6139, lng: 77.2090 });
                setLocationStatus('fallback');
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 120000
            }
        );
    };

    useEffect(() => {
        requestLocation();
    }, []);

    // Fetch salons when location or filters change
    useEffect(() => {
        if (location.lat && location.lng) {
            fetchSalons();
        }
    }, [location, radius, sortBy]);

    const fetchSalons = async () => {
        setLoading(true);
        try {
            const response = await salonAPI.getNearby({
                lat: location.lat,
                lng: location.lng,
                radius,
                sortBy
            });
            setSalons(response.data.data || []);
        } catch (error) {
            console.error('Error fetching salons:', error);
            // Fallback to general salons API if geo fails
            try {
                const fallbackRes = await salonAPI.getAll({ search: searchTerm });
                setSalons(fallbackRes.data.data || []);
            } catch (e) {
                setSalons([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Filter by search query in memory for instant feedback
    const filteredSalons = salons.filter((salon) => {
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase();
        return (
            salon.name?.toLowerCase().includes(query) ||
            salon.location?.city?.toLowerCase().includes(query) ||
            salon.location?.formattedAddress?.toLowerCase().includes(query) ||
            salon.description?.toLowerCase().includes(query)
        );
    });

    const defaultImages = [
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80'
    ];

    return (
        <div className="container" style={{ padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.375rem' }}>Explore Studios & Salons</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                    Compare top-rated grooming studios and reserve real-time slots
                </p>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                {/* Search in list */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 220px', minWidth: '200px' }}>
                    <SearchIcon size={16} style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Filter by studio name, service..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.875rem' }}
                    />
                </div>

                {/* Radius filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        Radius:
                    </span>
                    <select
                        className="form-select"
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        style={{ width: 'auto', minWidth: '100px', padding: '0.45rem 2rem 0.45rem 0.75rem', fontSize: '0.875rem' }}
                    >
                        <option value={2}>2 km</option>
                        <option value={5}>5 km</option>
                        <option value={10}>10 km</option>
                        <option value={25}>25 km</option>
                    </select>
                </div>

                {/* Sort filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        Sort:
                    </span>
                    <select
                        className="form-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{ width: 'auto', minWidth: '120px', padding: '0.45rem 2rem 0.45rem 0.75rem', fontSize: '0.875rem' }}
                    >
                        <option value="distance">Nearest</option>
                        <option value="rating">Top Rated</option>
                    </select>
                </div>

                {/* Location Action Button */}
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={requestLocation}
                    disabled={locationStatus === 'detecting'}
                    title="Recalculate distance using live coordinates"
                >
                    {locationStatus === 'detecting' ? (
                        <>
                            <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span>
                            <span>Detecting...</span>
                        </>
                    ) : (
                        <>
                            <RefreshCwIcon size={14} />
                            <span>GPS Refresh</span>
                        </>
                    )}
                </button>
            </div>

            {/* Location Notice Pill */}
            {locationStatus !== 'detecting' && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.625rem 1rem',
                    background: locationStatus === 'success' ? 'var(--bg-card)' : 'rgba(251, 191, 36, 0.08)',
                    borderRadius: 'var(--radius-lg)',
                    border: `1px solid ${locationStatus === 'success' ? 'var(--border-subtle)' : 'rgba(251, 191, 36, 0.25)'}`,
                    marginBottom: 'var(--spacing-xl)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPinIcon size={15} style={{ color: locationStatus === 'success' ? 'var(--success)' : 'var(--warning)' }} />
                        <span>
                            {locationStatus === 'success' ? (
                                <>Using your live coordinates ({location.lat?.toFixed(3)}, {location.lng?.toFixed(3)})</>
                            ) : (
                                <>Location permission not granted. Showing featured studios in Delhi.</>
                            )}
                        </span>
                    </div>

                    <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>
                        {filteredSalons.length} {filteredSalons.length === 1 ? 'studio' : 'studios'} available
                    </span>
                </div>
            )}

            {/* Salon Grid */}
            {loading ? (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p style={{ fontSize: '0.875rem' }}>Locating verified studios in your area...</p>
                </div>
            ) : filteredSalons.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-state-icon">
                        <SearchIcon size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No studios found within {radius} km</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--spacing-lg)', maxWidth: '420px', margin: '0 auto var(--spacing-lg)' }}>
                        Try expanding your distance radius or search for another service category.
                    </p>
                    <button className="btn btn-primary" onClick={() => setRadius(25)}>
                        Expand Radius to 25 km
                    </button>
                </div>
            ) : (
                <div className="salon-grid">
                    {filteredSalons.map((salon, index) => {
                        const coverImg = (salon.coverImage && salon.coverImage.startsWith('http'))
                            ? salon.coverImage
                            : defaultImages[index % defaultImages.length];

                        const distanceDisplay = salon.distanceKm !== undefined
                            ? `${salon.distanceKm} km`
                            : salon.distance
                                ? `${(salon.distance / 1000).toFixed(1)} km`
                                : null;

                        return (
                            <Link
                                to={`/salons/${salon._id}`}
                                key={salon._id}
                                style={{ textDecoration: 'none' }}
                            >
                                <div className="salon-card">
                                    <div className="salon-image-wrapper">
                                        <img
                                            src={coverImg}
                                            alt={salon.name}
                                            className="salon-image"
                                            loading="lazy"
                                        />

                                        {distanceDisplay && (
                                            <span className="salon-distance-tag">
                                                <MapPinIcon size={12} />
                                                <span>{distanceDisplay}</span>
                                            </span>
                                        )}

                                        {salon.isVerified && (
                                            <span className="salon-verified-tag">
                                                <ShieldCheckIcon size={12} />
                                                <span>Verified</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="salon-content">
                                        <div className="salon-header-row">
                                            <h3 className="salon-name">{salon.name}</h3>
                                            <div className="salon-rating-pill">
                                                <StarIcon size={13} filled={true} />
                                                <span>{salon.averageRating ? salon.averageRating.toFixed(1) : '4.8'}</span>
                                            </div>
                                        </div>

                                        <div className="salon-location-text">
                                            <MapPinIcon size={13} style={{ flexShrink: 0 }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {salon.location?.city || salon.location?.formattedAddress || 'Location specified'}
                                            </span>
                                        </div>

                                        <p style={{
                                            color: 'var(--text-muted)',
                                            fontSize: '0.8125rem',
                                            lineHeight: '1.5',
                                            marginBottom: 'var(--spacing-md)',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {salon.description || 'Premium grooming & styling services with certified professionals.'}
                                        </p>

                                        <div className="salon-footer-row">
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                                                    Reviews
                                                </span>
                                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                    {salon.totalReviews || 12} customer reviews
                                                </span>
                                            </div>

                                            <span className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>
                                                <span>Book Slot</span>
                                                <ArrowRightIcon size={13} />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SalonList;
