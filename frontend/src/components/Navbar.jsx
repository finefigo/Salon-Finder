import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ScissorsIcon, UserIcon, LogOutIcon, SlidersIcon } from './Icons';

const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 15);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const getDashboardLink = () => {
        if (!user) return '/login';
        switch (user.role) {
            case 'admin':
                return '/admin';
            case 'salonOwner':
                return '/owner';
            default:
                return '/dashboard';
        }
    };

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="container navbar-content">
                <Link to="/" className="navbar-brand">
                    <span className="brand-icon">
                        <ScissorsIcon size={19} />
                    </span>
                    <span>Salon<span style={{ color: 'var(--accent-primary)' }}>Finder</span></span>
                </Link>

                <button
                    className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle navigation menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <ul className={`navbar-nav ${mobileMenuOpen ? 'open' : ''}`}>
                    <li>
                        <Link
                            to="/salons"
                            className={`nav-link ${location.pathname === '/salons' ? 'active' : ''}`}
                        >
                            Find Salons
                        </Link>
                    </li>

                    {isAuthenticated ? (
                        <>
                            <li>
                                <Link
                                    to={getDashboardLink()}
                                    className={`nav-link ${location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/owner') || location.pathname.startsWith('/admin') ? 'active' : ''}`}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                                >
                                    <SlidersIcon size={15} />
                                    <span>
                                        {user?.role === 'salonOwner' ? 'Owner Portal' : user?.role === 'admin' ? 'Admin Portal' : 'My Bookings'}
                                    </span>
                                </Link>
                            </li>
                            <li className="nav-user">
                                <div className="nav-user-avatar">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                                    {user?.name?.split(' ')[0]}
                                </span>
                            </li>
                            <li>
                                <button
                                    onClick={handleLogout}
                                    className="btn btn-secondary btn-sm"
                                    title="Sign out"
                                >
                                    <LogOutIcon size={14} />
                                    <span>Sign Out</span>
                                </button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li>
                                <Link to="/login" className="nav-link">
                                    Sign In
                                </Link>
                            </li>
                            <li>
                                <Link to="/register" className="btn btn-primary btn-sm">
                                    Get Started
                                </Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
