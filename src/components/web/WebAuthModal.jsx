import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { webAuth, db } from '../../firebase/config';
import { useWebAuth } from '../../context/WebAuthContext';
import { X, Phone, User, Mail, Calendar, MapPin, Loader2 } from 'lucide-react';
import './WebAuthModal.css';

const BRAND_MINT = '#9FD6C7';

const WebAuthModal = () => {
    const { t, i18n } = useTranslation();
    const { isLoginModalOpen, closeLogin, setIsOtpSuccess, refreshUserData, requestOTP, verifyOTP } = useWebAuth();

    const [step, setStep] = useState('phone'); // 'phone', 'otp', 'register'
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpCode, setOtpCode] = useState('');

    // Registration State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState('');
    const [city, setCity] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reset when opened
    useEffect(() => {
        if (isLoginModalOpen) {
            setStep('phone');
            setPhoneNumber('');
            setOtpCode('');
            setError('');
        }
    }, [isLoginModalOpen]);

    const handleSendOtp = async (e) => {
        e?.preventDefault();
        setError('');
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        if (cleanNumber.length !== 10) {
            setError(t('web.invalidPhoneError'));
            return;
        }

        let formattedPhone = cleanNumber;
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '+972' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('5')) {
            formattedPhone = '+972' + formattedPhone;
        }

        setLoading(true);
        try {
            await requestOTP(formattedPhone);
            setStep('otp');
        } catch (err) {
            console.error("SMS Error:", err);
            setError(err.message || 'Error sending SMS. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e?.preventDefault();
        if (otpCode.length < 4) return;

        setError('');
        setLoading(true);
        try {
            let formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '+972' + formattedPhone.substring(1);
            } else if (formattedPhone.startsWith('5')) {
                formattedPhone = '+972' + formattedPhone;
            }

            const result = await verifyOTP(formattedPhone, otpCode);
            const user = result.user;

            // Check if user has a display name. If not, they are new.
            if (!user.displayName) {
                setStep('register');
            } else {
                await refreshUserData();
                setIsOtpSuccess(true);
                closeLogin();
            }
        } catch (err) {
            console.error("OTP Error:", err);
            setError(t('web.invalidOtpError'));
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e?.preventDefault();
        if (!name.trim()) {
            setError(t('web.nameRequiredError'));
            return;
        }

        setLoading(true);
        setError('');
        try {
            const user = auth.currentUser;
            if (user) {
                await updateProfile(user, { displayName: name });

                await setDoc(doc(db, 'users', user.uid), {
                    displayName: name,
                    email: email || null,
                    age: age || null,
                    city: city || null,
                    phoneNumber: user.phoneNumber,
                    role: 'customer',
                    registrationCompleted: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    points: 0,
                    membershipLevel: 'Bronze'
                });

                await refreshUserData();
                setIsOtpSuccess(true);
                closeLogin();
            }
        } catch (err) {
            console.error("Register Error:", err);
            setError('Error saving profile.');
        } finally {
            setLoading(false);
        }
    };

    if (!isLoginModalOpen) return null;

    const isRtl = i18n.language === 'ar' || i18n.language === 'he';

    return (
        <div className="web-auth-overlay" onClick={closeLogin} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="web-auth-modal" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={closeLogin}>
                    <X size={24} />
                </button>

                <div className="auth-header">
                    <h2>
                        {step === 'phone' ? t('web.login') :
                            step === 'otp' ? t('web.verifyCode') :
                                t('web.completeProfile')}
                    </h2>
                    <p>
                        {step === 'phone' ? t('web.phoneLoginSub') :
                            step === 'otp' ? t('web.otpSentTo', { phone: phoneNumber }) :
                                t('web.tellUsMore')}
                    </p>
                </div>

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                {step === 'phone' && (
                    <form onSubmit={handleSendOtp} className="auth-form">
                        <div className="input-group">
                            <span className="input-prefix" style={{ color: BRAND_MINT, padding: '0 10px', fontWeight: 'bold' }}>+972</span>
                            <div className="input-divider"></div>
                            <input
                                type="tel"
                                placeholder="502345678"
                                value={phoneNumber}
                                onChange={e => setPhoneNumber(e.target.value)}
                                maxLength={10}
                                required
                                style={{ direction: 'ltr', textAlign: 'left' }}
                            />
                            <Phone size={20} color={BRAND_MINT} className="input-icon" />
                        </div>

                        <button
                            type="submit"
                            className="primary-btn"
                            disabled={loading || phoneNumber.replace(/[^0-9]/g, '').length !== 10}
                            style={{ backgroundColor: phoneNumber.replace(/[^0-9]/g, '').length === 10 ? BRAND_MINT : '#ccc' }}
                        >
                            {loading ? <Loader2 className="spinner" size={20} /> : t('web.continue')}
                        </button>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={handleVerifyOtp} className="auth-form">
                        <div className="input-group otp-group">
                            <input
                                type="text"
                                placeholder="123456"
                                value={otpCode}
                                onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                maxLength={6}
                                required
                                autoFocus
                                style={{ direction: 'ltr', textAlign: 'center', letterSpacing: '8px', fontSize: '24px' }}
                            />
                        </div>

                        <div className="otp-actions">
                            <button type="button" className="text-btn" onClick={() => setStep('phone')}>
                                {t('web.changeNumber')}
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="primary-btn"
                            disabled={loading || otpCode.length < 4}
                            style={{ backgroundColor: otpCode.length >= 4 ? BRAND_MINT : '#ccc' }}
                        >
                            {loading ? <Loader2 className="spinner" size={20} /> : t('web.verify')}
                        </button>
                    </form>
                )}

                {step === 'register' && (
                    <form onSubmit={handleRegister} className="auth-form register-form">
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder={t('web.fullNamePlaceholder')}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                            <User size={20} color={BRAND_MINT} className="input-icon" />
                        </div>

                        <div className="input-group">
                            <input
                                type="email"
                                placeholder={t('web.emailOptional')}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                            <Mail size={20} color={BRAND_MINT} className="input-icon" />
                        </div>

                        <div className="row-inputs">
                            <div className="input-group half">
                                <input
                                    type="number"
                                    placeholder={t('web.age')}
                                    value={age}
                                    onChange={e => setAge(e.target.value)}
                                />
                                <Calendar size={20} color={BRAND_MINT} className="input-icon" />
                            </div>
                            <div className="input-group half">
                                <input
                                    type="text"
                                    placeholder={t('web.city')}
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                />
                                <MapPin size={20} color={BRAND_MINT} className="input-icon" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="primary-btn"
                            disabled={loading || !name.trim()}
                            style={{ backgroundColor: name.trim() ? BRAND_MINT : '#ccc' }}
                        >
                            {loading ? <Loader2 className="spinner" size={20} /> : t('web.completeRegistration')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default WebAuthModal;
