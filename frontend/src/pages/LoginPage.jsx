import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css'; // Let's create a dedicated CSS file to compartmentalize these animations

const LoginPage = ({ theme, setTheme }) => {
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                if (!name.trim()) {
                    setError('Name is required.');
                    setLoading(false);
                    return;
                }
                await register(name, email, password);
            } else {
                await login(email, password);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-modern">
            {/* Theme Toggle */}
            <button
                className="btn btn-ghost"
                style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 100, padding: '8px', borderRadius: '50%' }}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
                {theme === 'dark' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="4.22" x2="19.78" y2="5.64" /></svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                )}
            </button>

            {/* Left Info Panel */}
            <div className="login-info-panel">
                <div className="info-content">
                    <div className="info-badge slide-up-1">MailPilot v2.0</div>
                    <h1 className="info-title slide-up-2">
                        B2B Email Automation<br />Powered by AI.
                    </h1>
                    <p className="info-desc slide-up-3">
                        Transform your inbox into an automated quoting engine. MailPilot reads inquiries, extracts customer needs, matches your product catalog, and generates verified PDF quotations in seconds.
                    </p>

                    <div className="feature-list slide-up-4">
                        <div className="feature-item">
                            <span className="feature-icon">✨</span>
                            <div>
                                <h3>Smart Inbox Triage</h3>
                                <p>Filters out spam and automatically routes genuine RFQs.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">⚡</span>
                            <div>
                                <h3>Instant Quotations</h3>
                                <p>Generates exact PDF estimates with real-time catalog pricing.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">🛡️</span>
                            <div>
                                <h3>Admin Verified</h3>
                                <p>One-click approval workflow before anything reaches the client.</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Background Decor */}
                <div className="glow-orb top-right"></div>
                <div className="glow-orb bottom-left"></div>
            </div>

            {/* Right Form Panel */}
            <div className="login-form-panel">
                <div className="login-card-modern fade-in-delay">
                    <div className="login-header">
                        <div className="login-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                        </div>
                        <h2 className="login-title">
                            {isRegister ? 'Create Account' : 'Welcome Back'}
                        </h2>
                        <p className="login-subtitle">
                            {isRegister
                                ? 'Set up your admin account'
                                : 'Sign in to your admin dashboard'}
                        </p>
                    </div>

                    {error && (
                        <div className="login-error">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form className="login-form" onSubmit={handleSubmit}>
                        {isRegister && (
                            <div className="form-group">
                                <label className="form-label" htmlFor="name">Full Name</label>
                                <input
                                    id="name"
                                    className="form-input"
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    autoComplete="name"
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label" htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                className="form-input"
                                type="email"
                                placeholder="admin@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <div className="password-wrapper">
                                <input
                                    id="password"
                                    className="form-input"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={loading}
                            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                                    Authenticating...
                                </>
                            ) : isRegister ? (
                                'Create Admin Account'
                            ) : (
                                'Secure Sign In'
                            )}
                        </button>
                    </form>

                    <div className="login-toggle">
                        {isRegister ? 'Already an administrator?' : "Need an admin account?"}{' '}
                        <button
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setError('');
                            }}
                        >
                            {isRegister ? 'Sign In' : 'Create Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
