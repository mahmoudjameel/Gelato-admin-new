import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Trash2, X, Phone, User, Plus, Bike, Mail, Lock, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { httpsCallable, getFunctions } from 'firebase/functions';
import './DriverManager.css';

const DriverManager = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [newDriver, setNewDriver] = useState({
        name: '',
        email: '',
        password: '',
        phone: ''
    });

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const driversRef = collection(db, 'drivers');
            const snapshot = await getDocs(query(driversRef));
            const driversList = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            // Sort by createdAt desc
            driversList.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            setDrivers(driversList);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatPhoneNumber = (value) => {
        // Remove all non-numeric characters
        const cleaned = value.replace(/\D/g, '');

        // Handle input starting with 0 (Israel local format)
        if (cleaned.startsWith('0')) {
            return '+972' + cleaned.substring(1);
        }

        // If it starts with 972 but without +, add +
        if (cleaned.startsWith('972') && !value.startsWith('+')) {
            return '+' + cleaned;
        }

        // If it's already +972, return cleaned with +
        if (value.startsWith('+972')) {
            return '+972' + cleaned.substring(3);
        }

        return cleaned;
    };

    const handleAddDriver = async (e) => {
        e.preventDefault();
        setIsAdding(true);

        try {
            const functions = getFunctions();
            // Use us-central1 explicitly if needed
            const createDriverAccount = httpsCallable(functions, 'createDriverAccount');

            const result = await createDriverAccount({
                name: newDriver.name,
                email: newDriver.email,
                password: newDriver.password,
                phone: newDriver.phone ? formatPhoneNumber(newDriver.phone) : ''
            });

            if (result.data.success) {
                alert(i18n.language === 'ar' ? 'تم إضافة السائق بنجاح' : 'הנהג נוסף בהצלחה');
                setIsAddModalOpen(false);
                setNewDriver({ name: '', email: '', password: '', phone: '' });
                fetchDrivers();
            }
        } catch (error) {
            console.error('Error adding driver:', error);
            let errorMessage = i18n.language === 'ar' ? 'حدث خطأ أثناء إضافة السائق' : 'אירעה שגיאה בעת הוספת הנהג';

            if (error.code === 'functions/already-exists') {
                errorMessage = i18n.language === 'ar' ? 'البريد الإلكتروني مستخدم مسبقاً' : 'האימייל כבר קיים במערכת';
            } else if (error.code === 'functions/unauthenticated') {
                errorMessage = i18n.language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'נדרשת התחברות למערכת';
            } else if (error.message && error.message.includes('CORS')) {
                errorMessage = i18n.language === 'ar' ? 'خطأ في الاتصال بالسيرفر. تأكد من رفع الـ Functions.' : 'שגיאת חיבור לשרת. וודא שהפונקציות הועלו בהצלחה.';
            }

            alert(errorMessage);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteDriver = async (driverId) => {
        const confirmMsg = i18n.language === 'ar' ? 'هل أنت متأكد من حذف هذا السائق؟' : 'האם אתה בטוח שברצונך למחוק נהג זה?';
        if (!window.confirm(confirmMsg)) return;

        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'drivers', driverId));
            setDrivers(current => current.filter(d => d.id !== driverId));
        } catch (error) {
            console.error('Error deleting driver:', error);
            alert(i18n.language === 'ar' ? 'حدث خطأ أثناء حذف السائق' : 'אירעה שגיאה בעת מחיקת הנהג');
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return <div className="loading-container">{i18n.language === 'ar' ? 'جاري تحميل السائقين...' : 'טוען נהגים...'}</div>;
    }

    return (
        <div className="driver-manager-container">
            <div className="page-header">
                <div className="header-title">
                    <h1>{i18n.language === 'ar' ? `السائقين (${drivers.length})` : `נהגים (${drivers.length})`}</h1>
                </div>
                <button className="add-driver-btn" onClick={() => setIsAddModalOpen(true)}>
                    <Plus size={20} />
                    <span>{i18n.language === 'ar' ? 'إضافة سائق' : 'הוסף נהג'}</span>
                </button>
            </div>

            <div className="drivers-table-container">
                <table className="drivers-table">
                    <thead>
                        <tr>
                            <th>{i18n.language === 'ar' ? 'السائق' : 'נהג'}</th>
                            <th>{i18n.language === 'ar' ? 'رقم الهاتف' : 'מספר טלפון'}</th>
                            <th>{i18n.language === 'ar' ? 'تاريخ الإضافة' : 'תאריך הוספה'}</th>
                            <th>{i18n.language === 'ar' ? 'الإجراءات' : 'פעולות'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {drivers.length > 0 ? (
                            drivers.map((driver) => (
                                <tr key={driver.id}>
                                    <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="driver-avatar">
                                            <Bike size={20} />
                                        </div>
                                        <span>{driver.name}</span>
                                    </td>
                                    <td style={{ direction: 'ltr', textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>
                                        {driver.phone}
                                    </td>
                                    <td>
                                        {driver.createdAt?.toDate ? driver.createdAt.toDate().toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'he-IL') : '-'}
                                    </td>
                                    <td>
                                        <div className="driver-actions-cell">
                                            <button
                                                type="button"
                                                className="icon-btn view-btn"
                                                onClick={() => navigate(`/dashboard/drivers/${driver.id}`)}
                                                title={i18n.language === 'ar' ? 'تفاصيل وطلبات الدلفري' : 'פרטי נהג והזמנות'}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                className="icon-btn delete-btn"
                                                onClick={() => handleDeleteDriver(driver.id)}
                                                disabled={isDeleting}
                                                title={t('common.delete')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="no-drivers">
                                    {i18n.language === 'ar' ? 'لا يوجد سائقين حالياً' : 'אין נהגים כרגע'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && (
                <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={() => setIsAddModalOpen(false)}>
                            <X size={20} />
                        </button>

                        <div className="modal-header">
                            <h2>{i18n.language === 'ar' ? 'إضافة سائق جديد' : 'הוספת נהג חדש'}</h2>
                        </div>

                        <form onSubmit={handleAddDriver}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>{i18n.language === 'ar' ? 'الاسم الكامل' : 'שם מלא'}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newDriver.name}
                                        onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                                        required
                                        placeholder={i18n.language === 'ar' ? 'أدخل اسم السائق' : 'הכנס שם נהג'}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>{i18n.language === 'ar' ? 'البريد الإلكتروني' : 'אימייל'}</label>
                                    <div className="input-with-icon">
                                        <Mail size={18} />
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={newDriver.email}
                                            onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                                            required
                                            placeholder="driver@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{i18n.language === 'ar' ? 'كلمة المرور' : 'סיסמה'}</label>
                                    <div className="input-with-icon">
                                        <Lock size={18} />
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={newDriver.password}
                                            onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                                            required
                                            minLength={6}
                                            placeholder="******"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{i18n.language === 'ar' ? 'رقم الهاتف (اختياري)' : 'מספר טלפון (אופציונלי)'}</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={newDriver.phone}
                                        onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                                        placeholder="05x-xxx-xxxx"
                                    />
                                    <small className="form-help">
                                        {i18n.language === 'ar' ? 'سيتم استخدام البريد الإلكتروني لتسجيل الدخول' : 'האימייל ישמש לצורך התחברות'}
                                    </small>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="submit"
                                    className="add-driver-submit-btn"
                                    disabled={isAdding}
                                >
                                    {isAdding ? (i18n.language === 'ar' ? 'جاري الإضافة...' : 'מוסיף...') : (i18n.language === 'ar' ? 'حفظ وإضافة' : 'שמור והוסף')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverManager;
