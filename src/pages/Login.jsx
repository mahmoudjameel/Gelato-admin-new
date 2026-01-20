import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { LogIn, Lock, Mail, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Login.css';

const Login = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err) {
            setError(t('login.error'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card glass">
                <div className="login-header">
                    <div className="login-logo">
                        <LogIn size={32} color="var(--primary)" />
                    </div>
                    <h1>{t('login.title')}</h1>
                    <p>{t('login.subtitle')}</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    {error && (
                        <div className="error-message">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label>{t('login.email')}</label>
                        <div className="input-wrapper">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@cooltreat.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{t('login.password')}</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? t('login.verifying') : (
                            <>
                                <span>{t('login.login')}</span>
                                <LogIn size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>{t('login.footer')}</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
