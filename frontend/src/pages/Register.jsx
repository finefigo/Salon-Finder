import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ScissorsIcon, ArrowRightIcon, UserIcon, BuildingIcon } from '../components/Icons';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        role: 'customer'
    });
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleSelect = (role) => {
        setFormData({ ...formData, role });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const { confirmPassword, ...registerData } = formData;
            const response = await register(registerData);
            toast.success(response.message || 'Account registered successfully');

            if (formData.role === 'salonOwner') {
                navigate('/owner');
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card" style={{ maxWidth: '480px' }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
                    <Link to="/" className="navbar-brand" style={{ justifyContent: 'center', display: 'inline-flex' }}>
                        <span className="brand-icon">
                            <ScissorsIcon size={19} />
                        </span>
                        <span>Salon<span style={{ color: 'var(--accent-primary)' }}>Finder</span></span>
                    </Link>
                </div>

                <h2 className="auth-title">Create Account</h2>
                <p className="auth-subtitle">
                    Select your account type to get started
                </p>

                {/* Role Switcher */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.625rem',
                    marginBottom: 'var(--spacing-xl)'
                }}>
                    <button
                        type="button"
                        onClick={() => handleRoleSelect('customer')}
                        style={{
                            padding: '0.875rem',
                            borderRadius: 'var(--radius-lg)',
                            border: formData.role === 'customer' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            background: formData.role === 'customer' ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.375rem',
                            cursor: 'pointer',
                            textAlign: 'center'
                        }}
                    >
                        <UserIcon size={20} style={{ color: formData.role === 'customer' ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                        <span style={{ fontWeight: '700', fontSize: '0.875rem', color: formData.role === 'customer' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            Client
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            Book salon appointments
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleRoleSelect('salonOwner')}
                        style={{
                            padding: '0.875rem',
                            borderRadius: 'var(--radius-lg)',
                            border: formData.role === 'salonOwner' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            background: formData.role === 'salonOwner' ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.375rem',
                            cursor: 'pointer',
                            textAlign: 'center'
                        }}
                    >
                        <BuildingIcon size={20} style={{ color: formData.role === 'salonOwner' ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                        <span style={{ fontWeight: '700', fontSize: '0.875rem', color: formData.role === 'salonOwner' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            Studio Owner
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            Manage salon & slots
                        </span>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            placeholder="name@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input
                            type="tel"
                            name="phone"
                            className="form-input"
                            placeholder="+91 9876543210"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                placeholder="Min. 6 chars"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                className="form-input"
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.8125rem', marginTop: '0.5rem' }}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: '15px', height: '15px', borderWidth: '2px' }}></span>
                                <span>Creating Account...</span>
                            </>
                        ) : (
                            <>
                                <span>Register Account</span>
                                <ArrowRightIcon size={15} />
                            </>
                        )}
                    </button>
                </form>

                <div style={{
                    textAlign: 'center',
                    marginTop: 'var(--spacing-lg)',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)'
                }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
