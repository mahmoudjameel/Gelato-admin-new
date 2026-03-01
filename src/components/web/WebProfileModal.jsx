import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { webDb } from '../../firebase/config';
import { useWebAuth } from '../../context/WebAuthContext';
import { X, User, Phone, Mail, Calendar, MapPin, LogOut, Loader2, Save } from 'lucide-react';
import './WebProfileModal.css';

const BRAND_MINT = '#9FD6C7';

function parseBirthDate(val) {
    if (!val) return '';
    if (typeof val === 'string') return val.slice(0, 10);
    if (val && typeof val.toDate === 'function') return val.toDate().toISOString().slice(0, 10);
    return '';
}

function calculateAge(birthDateStr) {
    if (!birthDateStr || typeof birthDateStr !== 'string') return null;
    const birth = new Date(birthDateStr);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
}

const WebProfileModal = ({ isOpen, onClose }) => {
    const { t, i18n } = useTranslation();
    const { currentUser, userData, logout, updateUserProfile } = useWebAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [city, setCity] = useState('');
    const [cities, setCities] = useState([]);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const isRtl = i18n.language === 'ar' || i18n.language === 'he';
    const computedAge = useMemo(() => calculateAge(birthDate), [birthDate]);

    // Sync from userData when modal opens or userData changes
    useEffect(() => {
        if (!isOpen) return;
        setName(userData?.displayName || currentUser?.displayName || '');
        setEmail(userData?.email || currentUser?.email || '');
        setBirthDate(parseBirthDate(userData?.birthDate));
        setCity(userData?.city || '');
    }, [isOpen, userData, currentUser]);

    // Fetch cities from Firestore (نفس مصدر تطبيق العميل)
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        (async () => {
            try {
                const q = query(collection(webDb, 'cities'), orderBy('order', 'asc'));
                const snapshot = await getDocs(q);
                if (cancelled) return;
                const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setCities(list);
            } catch (err) {
                console.error('Error fetching cities:', err);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        setError('');

        try {
            const birthDateStr = birthDate && typeof birthDate === 'string' ? birthDate.trim().slice(0, 10) : '';
            const ageToSave = birthDateStr ? calculateAge(birthDateStr) : null;
            if (updateUserProfile) {
                await updateUserProfile({
                    displayName: name,
                    email: email || null,
                    birthDate: birthDateStr || null,
                    age: ageToSave,
                    city: city || null
                });
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
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

    const cityLabel = (c) => isRtl ? (c.ar || c.nameAr || c.he || c.nameHe || '') : (c.he || c.nameHe || c.ar || c.nameAr || '');

    return (
        <div className="web-profile-overlay" onClick={onClose} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="web-profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-header">
                    <h2>{t('web.profile')}</h2>
                    <button type="button" className="close-btn" onClick={onClose}>
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
                                    readOnly
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
                                <label>{t('web.dateOfBirth')}</label>
                                <div className="input-with-icon">
                                    <input
                                        type="date"
                                        value={birthDate}
                                        onChange={e => setBirthDate(e.target.value)}
                                        max={new Date().toISOString().slice(0, 10)}
                                    />
                                    <Calendar size={18} color={BRAND_MINT} className="input-icon" />
                                </div>
                                {birthDate && computedAge != null && (
                                    <p className="profile-age-display">{t('web.age')}: <strong>{computedAge}</strong> {t('web.ageYears')}</p>
                                )}
                            </div>
                            <div className="profile-input-group half">
                                <label>{t('web.city')}</label>
                                <div className="input-with-icon">
                                    <select
                                        className="profile-city-select"
                                        value={city}
                                        onChange={e => setCity(e.target.value)}
                                    >
                                        <option value="">{t('web.selectCity')}</option>
                                        {cities.map(c => (
                                            <option key={c.id} value={c.id}>{cityLabel(c)}</option>
                                        ))}
                                    </select>
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
                        <button type="button" className="logout-btn" onClick={handleLogout}>
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
