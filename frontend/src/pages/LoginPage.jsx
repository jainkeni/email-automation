import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
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
        <div className="login-page">
            <div className="login-container fade-in">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-icon">⚡</div>
                        <h1 className="login-title">
                            {isRegister ? 'Create Account' : 'Welcome Back'}
                        </h1>
                        <p className="login-subtitle">
                            {isRegister
                                ? 'Set up your admin account'
                                : 'Sign in to your admin dashboard'}
                        </p>
                    </div>

                    {error && (
                        <div className="login-error">
                            <span>⚠️</span>
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
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={loading}
                        >
                            {loading
                                ? '⏳ Please wait...'
                                : isRegister
                                    ? '🚀 Create Account'
                                    : '🔐 Sign In'}
                        </button>
                    </form>

                    <div className="login-toggle">
                        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
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
