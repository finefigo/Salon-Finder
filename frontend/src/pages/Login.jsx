import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ScissorsIcon, ArrowRightIcon } from '../components/Icons';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await login(formData);
            toast.success(response.message || 'Signed in successfully');

            const user = response.data.user;
            if (user.role === 'admin') {
                navigate('/admin');
            } else if (user.role === 'salonOwner') {
                navigate('/owner');
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoFill = (email, password) => {
        setFormData({ email, password });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
                    <Link to="/" className="navbar-brand" style={{ justifyContent: 'center', display: 'inline-flex' }}>
                        <span className="brand-icon">
                            <ScissorsIcon size={19} />
                        </span>
                        <span>Salon<span style={{ color: 'var(--accent-primary)' }}>Finder</span></span>
                    </Link>
                </div>

                <h2 className="auth-title">Welcome Back</h2>
                <p className="auth-subtitle">
                    Enter your credentials to access your account
                </p>

                <form onSubmit={handleSubmit}>
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
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="form-input"
                            placeholder="Enter your account password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
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
                                <span>Authenticating...</span>
                            </>
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRightIcon size={15} />
                            </>
                        )}
                    </button>
                </form>

                {/* Quick Demo Credentials Helper */}
                <div style={{
                    marginTop: 'var(--spacing-xl)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--bg-canvas)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem'
                }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem', fontWeight: '600' }}>
                        Quick Demo Logins:
                    </span>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => handleDemoFill('admin@salonfinder.com', 'admin123')}
                        >
                            Admin
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => handleDemoFill('owner@salon.com', 'owner123')}
                        >
                            Salon Owner
                        </button>
                    </div>
                </div>

                <div style={{
                    textAlign: 'center',
                    marginTop: 'var(--spacing-lg)',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)'
                }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>
                        Sign Up
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
