import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebAuth } from '../../context/WebAuthContext';
import { X, User, Phone, Mail, Calendar, MapPin, LogOut, Loader2, Save } from 'lucide-react';
import './WebProfileModal.css';

const BRAND_MINT = '#9FD6C7';

const WebProfileModal = ({ isOpen, onClose }) => {
    const { t, i18n } = useTranslation();
    const { currentUser, userData, logout, updateUserProfile } = useWebAuth();

    const [name, setName] = useState(userData?.displayName || currentUser?.displayName || '');
    const [email, setEmail] = useState(userData?.email || currentUser?.email || '');
    const [age, setAge] = useState(userData?.age || '');
    const [city, setCity] = useState(userData?.city || '');

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const isRtl = i18n.language === 'ar' || i18n.language === 'he';

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        setError('');

        try {
            // If updateUserProfile exists in context, use it. 
            // Otherwise, we might need to add it or use updateDoc directly.
            // For now, let's assume we might need to implement this in context.
            if (updateUserProfile) {
                await updateUserProfile({
                    displayName: name,
                    email,
                    age,
                    city
                });
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                console.warn("updateUserProfile not found in context");
                setError(t('web.updateError'));
            }
        } catch (err) {
            console.error("Profile update error:", err);
            setError(t('web.updateError'));
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    return (
        <div className="web-profile-overlay" onClick={onClose} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="web-profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-header">
                    <h2>{t('web.profile')}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="profile-content">
                    {error && <div className="profile-alert error">{error}</div>}
                    {success && <div className="profile-alert success">{t('web.profileUpdated')}</div>}

                    <form onSubmit={handleSave} className="profile-form">
                        <div className="profile-input-group">
                            <label>{t('web.name')}</label>
                            <div className="input-with-icon">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder={t('web.fullNamePlaceholder')}
                                    required
                                />
                                <User size={18} color={BRAND_MINT} className="input-icon" />
                            </div>
                        </div>

                        <div className="profile-input-group">
                            <label>{t('web.phone')}</label>
                            <div className="input-with-icon disabled">
                                <input
                                    type="tel"
                                    value={currentUser?.phoneNumber || ''}
                                    disabled
                                />
                                <Phone size={18} color={BRAND_MINT} className="input-icon" />
                            </div>
                        </div>

                        <div className="profile-input-group">
                            <label>{t('web.email')}</label>
                            <div className="input-with-icon">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder={t('web.emailOptional')}
                                />
                                <Mail size={18} color={BRAND_MINT} className="input-icon" />
                            </div>
                        </div>

                        <div className="profile-row">
                            <div className="profile-input-group half">
                                <label>{t('web.age')}</label>
                                <div className="input-with-icon">
                                    <input
                                        type="number"
                                        value={age}
                                        onChange={e => setAge(e.target.value)}
                                        placeholder={t('web.age')}
                                    />
                                    <Calendar size={18} color={BRAND_MINT} className="input-icon" />
                                </div>
                            </div>
                            <div className="profile-input-group half">
                                <label>{t('web.city')}</label>
                                <div className="input-with-icon">
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={e => setCity(e.target.value)}
                                        placeholder={t('web.city')}
                                    />
                                    <MapPin size={18} color={BRAND_MINT} className="input-icon" />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="save-profile-btn" disabled={loading}>
                            {loading ? <Loader2 className="spinner" size={20} /> : (
                                <>
                                    <Save size={18} />
                                    <span>{t('web.saveChanges')}</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="profile-footer">
                        <button className="logout-btn" onClick={handleLogout}>
                            <LogOut size={18} />
                            <span>{t('web.logout')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebProfileModal;
