import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { LogIn, Lock, Mail, AlertCircle } from 'lucide-react';
import './Login.css';

const Login = () => {
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
            setError('خطأ في البريد الإلكتروني أو كلمة المرور. يرجى التأكد من البيانات والمحاولة مرة أخرى.');
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
                    <h1>تسجيل دخول المسؤول</h1>
                    <p>أدخل بياناتك للوصول إلى لوحة التحكم</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    {error && (
                        <div className="error-message">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label>البريد الإلكتروني</label>
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
                        <label>كلمة المرور</label>
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
                        {loading ? 'جاري التحقق...' : (
                            <>
                                <span>دخول</span>
                                <LogIn size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>&copy; 2026 Gelato Houset Hub. جميع الحقوق محفوظة.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
