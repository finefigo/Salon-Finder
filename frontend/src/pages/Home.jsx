import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    SearchIcon,
    MapPinIcon,
    ClockIcon,
    ShieldCheckIcon,
    ScissorsIcon,
    SparklesIcon,
    ArrowRightIcon,
    StarIcon
} from '../components/Icons';

const Home = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        navigate(`/salons?search=${encodeURIComponent(searchQuery)}`);
    };

    const categories = [
        { label: 'Hair Styling', icon: ScissorsIcon },
        { label: 'Beard & Shave', icon: SparklesIcon },
        { label: 'Color & Highlights', icon: ScissorsIcon },
        { label: 'Facial & Skincare', icon: SparklesIcon },
        { label: 'Spa & Wellness', icon: ClockIcon },
        { label: 'Nails & Pedicure', icon: StarIcon },
    ];

    return (
        <div>
            {/* Hero Section */}
            <section className="hero-section">
                <div className="container">
                    <div style={{ maxWidth: '820px' }}>
                        <div className="hero-pill">
                            <ShieldCheckIcon size={14} />
                            <span>Curated Grooming & Wellness Network</span>
                        </div>

                        <h1 className="hero-title">
                            Elevate your grooming ritual with <span className="hero-title-accent">instant bookings</span>
                        </h1>

                        <p className="hero-subtitle">
                            Discover premier salons, spas, and barber studios near you.
                            Check live slot availability, review transparent menus, and book your appointment with zero waiting.
                        </p>

                        {/* Interactive Search Bar */}
                        <form onSubmit={handleSearchSubmit} className="hero-search-box">
                            <div className="hero-search-input-wrap">
                                <SearchIcon size={18} style={{ color: 'var(--accent-primary)' }} />
                                <input
                                    type="text"
                                    className="hero-search-input"
                                    placeholder="Search by salon name, service, or city..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg">
                                <span>Find Salons</span>
                                <ArrowRightIcon size={16} />
                            </button>
                        </form>

                        {/* Category Filter Chips */}
                        <div className="category-strip">
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600', marginRight: '0.25rem' }}>
                                Popular:
                            </span>
                            {categories.map((cat) => {
                                const IconComponent = cat.icon;
                                return (
                                    <Link
                                        key={cat.label}
                                        to={`/salons?search=${encodeURIComponent(cat.label)}`}
                                        className="category-chip"
                                    >
                                        <IconComponent size={14} style={{ color: 'var(--accent-primary)' }} />
                                        <span>{cat.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <MapPinIcon size={22} />
                            </div>
                            <h3>Precise Local Proximity</h3>
                            <p>
                                Locate studios within 2 to 25 km of your coordinates with accurate distance calculation and verified addresses.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <ClockIcon size={22} />
                            </div>
                            <h3>Live Real-Time Slots</h3>
                            <p>
                                Real-time slot management directly connected to salon schedules. Reserve your preferred time without phone calls.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <ShieldCheckIcon size={22} />
                            </div>
                            <h3>Transparent Menus</h3>
                            <p>
                                View clear service durations, transparent upfront prices, and customer reviews before booking your session.
                            </p>
                        </div>
                    </div>

                    {/* Editorial Metrics Banner */}
                    <div style={{
                        marginTop: 'var(--spacing-3xl)',
                        padding: 'var(--spacing-2xl)',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-2xl)',
                        border: '1px solid var(--border-subtle)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: 'var(--spacing-xl)',
                        textAlign: 'center'
                    }}>
                        <div>
                            <div style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: '2.25rem',
                                fontWeight: '800',
                                color: 'var(--accent-primary)'
                            }}>500+</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                Verified Studios
                            </div>
                        </div>

                        <div>
                            <div style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: '2.25rem',
                                fontWeight: '800',
                                color: 'var(--accent-primary)'
                            }}>25K+</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                Bookings Completed
                            </div>
                        </div>

                        <div>
                            <div style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: '2.25rem',
                                fontWeight: '800',
                                color: 'var(--accent-primary)'
                            }}>4.9 / 5</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                Customer Rating
                            </div>
                        </div>

                        <div>
                            <div style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: '2.25rem',
                                fontWeight: '800',
                                color: 'var(--accent-primary)'
                            }}>100%</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                Guaranteed Slots
                            </div>
                        </div>
                    </div>

                    {/* Salon Owner Callout Banner */}
                    <div style={{
                        marginTop: 'var(--spacing-2xl)',
                        marginBottom: 'var(--spacing-3xl)',
                        padding: 'var(--spacing-xl) var(--spacing-2xl)',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--border-gold)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 'var(--spacing-lg)'
                    }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                                Own a salon, barber shop, or spa?
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                                Join our network to manage appointments, eliminate no-shows, and grow your local client base.
                            </p>
                        </div>
                        <Link to="/register" className="btn btn-outline">
                            <span>Register Your Studio</span>
                            <ArrowRightIcon size={14} />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
