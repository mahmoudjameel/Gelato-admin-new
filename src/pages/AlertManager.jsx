import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AlertTriangle, Send, StopCircle, CheckCircle, Bell } from 'lucide-react';
import './AlertManager.css';

const AlertManager = () => {
    const [loading, setLoading] = useState(false);
    const [activeAlert, setActiveAlert] = useState(null);
    const [formData, setFormData] = useState({
        titleAr: '',
        bodyAr: '',
        titleHe: '',
        bodyHe: ''
    });

    useEffect(() => {
        fetchActiveAlert();
    }, []);

    const fetchActiveAlert = async () => {
        try {
            const alertsRef = collection(db, 'system_alerts');
            const q = query(
                alertsRef,
                where('isActive', '==', true),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const docData = snapshot.docs[0];
                setActiveAlert({ id: docData.id, ...docData.data() });
            } else {
                setActiveAlert(null);
            }
        } catch (error) {
            console.error("Error fetching alerts:", error);
            // Fallback if index missing
        }
    };

    const handlePublish = async (e) => {
        e.preventDefault();
        if (!formData.titleAr || !formData.bodyAr) {
            alert('يرجى تعبئة الحقول العربية على الأقل');
            return;
        }

        if (confirm('هل أنت متأكد من نشر هذا التنبيه لجميع المستخدمين؟')) {
            setLoading(true);
            try {
                // 1. Deactivate current active alerts
                if (activeAlert) {
                    await updateDoc(doc(db, 'system_alerts', activeAlert.id), { isActive: false });
                }

                // 2. Create new alert
                const newAlert = {
                    title: {
                        ar: formData.titleAr,
                        he: formData.titleHe || formData.titleAr // Fallback
                    },
                    body: {
                        ar: formData.bodyAr,
                        he: formData.bodyHe || formData.bodyAr // Fallback
                    },
                    isActive: true,
                    createdAt: serverTimestamp(),
                    createdBy: 'admin' // You can add actual user ID here
                };

                const docRef = await addDoc(collection(db, 'system_alerts'), newAlert);

                setActiveAlert({ id: docRef.id, ...newAlert });
                setFormData({ titleAr: '', bodyAr: '', titleHe: '', bodyHe: '' });
                alert('تم نشر التنبيه بنجاح! سيظهر لجميع المستخدمين.');

            } catch (error) {
                console.error("Error publishing alert:", error);
                alert('فشل النشر: ' + error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleStopAlert = async () => {
        if (!activeAlert) return;
        if (confirm('هل تريد إيقاف هذا التنبيه؟ لن يظهر للمستخدمين الجدد.')) {
            setLoading(true);
            try {
                await updateDoc(doc(db, 'system_alerts', activeAlert.id), { isActive: false });
                setActiveAlert(null);
            } catch (error) {
                console.error("Error stopping alert:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="alert-manager-container">
            <div className="page-header">
                <div className="header-title">
                    <h1>إدارة التنبيهات العامة (Pop-ups) 📢</h1>
                    <p style={{ color: '#6b7280', marginTop: '4px' }}>
                        إرسال تنبيهات عاجلة تظهر لجميع مستخدمي التطبيق كنافذة منبثقة.
                    </p>
                </div>
            </div>

            {/* Creation Form */}
            <div className="alert-creation-card">
                <h2>إنشاء تنبيه جديد</h2>
                <form onSubmit={handlePublish}>
                    <div className="alert-form-grid">
                        {/* Arabic Section */}
                        <div className="language-section">
                            <h3>🇸🇦 العربية (أساسي)</h3>
                            <div className="form-group">
                                <label>عنوان التنبيه</label>
                                <input
                                    type="text"
                                    className="form-input rtl-input"
                                    placeholder="مثال: تنبيه هام، تأخير طلبات..."
                                    value={formData.titleAr}
                                    onChange={e => setFormData({ ...formData, titleAr: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>نص الرسالة</label>
                                <textarea
                                    className="form-textarea rtl-input"
                                    placeholder="اكتب تفاصيل التنبيه هنا..."
                                    value={formData.bodyAr}
                                    onChange={e => setFormData({ ...formData, bodyAr: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Hebrew Section */}
                        <div className="language-section">
                            <h3>🇮🇱 العبرية (اختياري)</h3>
                            <div className="form-group">
                                <label>כותרת (عنوان)</label>
                                <input
                                    type="text"
                                    className="form-input rtl-input"
                                    placeholder="כותרת ההודעה..."
                                    value={formData.titleHe}
                                    onChange={e => setFormData({ ...formData, titleHe: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>תוכן ההודעה (نص)</label>
                                <textarea
                                    className="form-textarea rtl-input"
                                    placeholder="תוכן ההודעה כאן..."
                                    value={formData.bodyHe}
                                    onChange={e => setFormData({ ...formData, bodyHe: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="submit-alert-btn"
                        disabled={loading}
                    >
                        {loading ? 'جاري النشر...' : (
                            <>
                                <Send size={18} />
                                نشر التنبيه للجميع
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Active Alert Status */}
            <div className="alerts-history">
                <h2>التنبيه النشط حالياً</h2>
                {activeAlert ? (
                    <div className="active-alert-banner">
                        <div className="alert-content">
                            <span className="alert-badge">نشط الآن 🔥</span>
                            <h3 style={{ margin: '8px 0' }}>{activeAlert.title.ar} / {activeAlert.title.he}</h3>
                            <p style={{ margin: 0, color: '#4b5563' }}>{activeAlert.body.ar}</p>
                            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{activeAlert.body.he}</p>
                        </div>
                        <button className="stop-alert-btn" onClick={handleStopAlert} disabled={loading}>
                            <StopCircle size={18} style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
                            إيقاف التنبيه
                        </button>
                    </div>
                ) : (
                    <div className="no-active-alert">
                        <CheckCircle size={48} style={{ marginBottom: '16px', color: '#10b981' }} />
                        <h3>لا يوجد تنبيه نشط حالياً</h3>
                        <p>التطبيق يعمل بشكل طبيعي دون نوافذ منبثقة.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlertManager;
