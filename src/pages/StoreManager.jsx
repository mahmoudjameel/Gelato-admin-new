import React, { useState, useEffect } from 'react';
import {
    Store,
    MapPin,
    Clock,
    Phone,
    Globe,
    Instagram,
    Video,
    MessageCircle,
    Upload,
    Save,
    Loader,
    BadgeDollarSign
} from 'lucide-react';
import { db, storage } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './StoreManager.css';

const StoreManager = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [storeData, setStoreData] = useState({
        name: '',
        description: '',
        address: '',
        phone: '',
        workingHours: '',
        deliveryTime: '',
        deliveryFee: '',
        minOrder: '',
        social: {
            instagram: '',
            tiktok: '',
            whatsapp: ''
        },
        logo: '',
        cover: '',
        locationUrl: '',
        workingHoursWeekly: {
            monday: { open: '10:00', close: '22:00', closed: false },
            tuesday: { open: '10:00', close: '22:00', closed: false },
            wednesday: { open: '10:00', close: '22:00', closed: false },
            thursday: { open: '10:00', close: '22:00', closed: false },
            friday: { open: '10:00', close: '22:00', closed: false },
            saturday: { open: '10:00', close: '22:00', closed: false },
            sunday: { open: '10:00', close: '22:00', closed: false },
        },
        location: { lat: 0, lng: 0 },
        deliveryZones: [] // Array of { name, radiusKm, fee, isActive }
    });

    const dayLabels = {
        monday: 'الاثنين',
        tuesday: 'الثلاثاء',
        wednesday: 'الأربعاء',
        thursday: 'الخميس',
        friday: 'الجمعة',
        saturday: 'السبت',
        sunday: 'الأحد'
    };

    useEffect(() => {
        fetchStoreData();
    }, []);

    const fetchStoreData = async () => {
        try {
            const docRef = doc(db, 'store', 'profile');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setStoreData(prev => ({ ...prev, ...docSnap.data() }));
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching store profile:", error);
            setLoading(false);
        }
    };

    const handleInputChange = (e, section = null) => {
        const { name, value } = e.target;
        if (section) {
            setStoreData(prev => ({
                ...prev,
                [section]: { ...prev[section], [name]: value }
            }));
        } else {
            setStoreData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleWeeklyHoursChange = (day, field, value) => {
        setStoreData(prev => ({
            ...prev,
            workingHoursWeekly: {
                ...prev.workingHoursWeekly,
                [day]: { ...prev.workingHoursWeekly[day], [field]: value }
            }
        }));
    };

    const addDeliveryRate = () => {
        setStoreData(prev => ({
            ...prev,
            deliveryRates: [...(prev.deliveryRates || []), { city: '', fee: '', time: '' }]
        }));
    };

    const updateDeliveryRate = (index, field, value) => {
        const newRates = [...(storeData.deliveryRates || [])];
        newRates[index][field] = value;
        setStoreData(prev => ({ ...prev, deliveryRates: newRates }));
    };

    const removeDeliveryRate = (index) => {
        setStoreData(prev => ({
            ...prev,
            deliveryRates: prev.deliveryRates.filter((_, i) => i !== index)
        }));
    };

    const handleImageUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setSaving(true);
            const storageRef = ref(storage, `store/${type}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            setStoreData(prev => ({ ...prev, [type]: url }));
            setSaving(false);
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            setSaving(false);
            alert("فشل رفع الصورة");
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await setDoc(doc(db, 'store', 'profile'), {
                ...storeData,
                updatedAt: new Date()
            }, { merge: true });
            setSaving(false);
            alert("تم حفظ البيانات بنجاح ✅");
        } catch (error) {
            console.error("Error saving profile:", error);
            setSaving(false);
            alert("حدث خطأ أثناء الحفظ");
        }
    };

    if (loading) return <div className="loading-screen">جاري التحميل...</div>;

    return (
        <div className="store-manager">
            <div className="page-header">
                <div className="header-left">
                    <h1>إدارة بروفايل المتجر</h1>
                    <p>تحكم في بيانات المطعم، الصور، وساعات العمل</p>
                </div>
            </div>

            <div className="store-form">
                {/* Left Column: Basic Info */}
                <div className="form-column">
                    <div className="form-section glass">
                        <h2><Store size={20} /> المعلومات الأساسية</h2>
                        <div className="form-group">
                            <label>اسم المتجر</label>
                            <input
                                type="text"
                                name="name"
                                value={storeData.name}
                                onChange={handleInputChange}
                                placeholder="مثال: جيلاتو هاوس"
                            />
                        </div>
                        <div className="form-group">
                            <label>وصف المتجر</label>
                            <textarea
                                name="description"
                                value={storeData.description}
                                onChange={handleInputChange}
                                placeholder="وصف قصير يظهر تحت الاسم..."
                            />
                        </div>
                    </div>

                    <div className="form-section glass">
                        <h2><MapPin size={20} /> العنوان والتواصل</h2>
                        <div className="form-group">
                            <label>العنوان الكامل</label>
                            <input
                                type="text"
                                name="address"
                                value={storeData.address}
                                onChange={handleInputChange}
                                placeholder="الرياض، حي..."
                            />
                        </div>
                        <div className="form-group">
                            <label>رقم الهاتف</label>
                            <input
                                type="text"
                                name="phone"
                                value={storeData.phone}
                                onChange={handleInputChange}
                                placeholder="+966..."
                            />
                        </div>
                        <div className="form-group">
                            <label>رابط الموقع الجغرافي (Google Maps URL)</label>
                            <input
                                type="text"
                                name="locationUrl"
                                value={storeData.locationUrl}
                                onChange={handleInputChange}
                                placeholder="https://maps.app.goo.gl/..."
                            />
                        </div>
                    </div>

                    <div className="form-section glass">
                        <h2><Clock size={20} /> أوقات العمل والتوصيل</h2>
                        <div className="form-group">
                            <label>ساعات العمل</label>
                            <input
                                type="text"
                                name="workingHours"
                                value={storeData.workingHours}
                                onChange={handleInputChange}
                                placeholder="10:00 ص - 12:00 م"
                            />
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>وقت التوصيل التقديري</label>
                                <input
                                    type="text"
                                    name="deliveryTime"
                                    value={storeData.deliveryTime}
                                    onChange={handleInputChange}
                                    placeholder="30-45 دقيقة"
                                />
                            </div>
                            <div className="form-group">
                                <label>رسوم التوصيل (שח)</label>
                                <input
                                    type="number"
                                    name="deliveryFee"
                                    value={storeData.deliveryFee}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>الحد الأدنى للطلب (שח)</label>
                                <input
                                    type="number"
                                    name="minOrder"
                                    value={storeData.minOrder}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section glass">
                        <h2><Clock size={20} /> أوقات العمل التفصيلية</h2>
                        <div className="weekly-hours-grid">
                            {Object.keys(storeData.workingHoursWeekly || {}).sort((a, b) => {
                                const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                                return order.indexOf(a) - order.indexOf(b);
                            }).map(day => (
                                <div key={day} className="day-row">
                                    <span className="day-name">{dayLabels[day]}</span>
                                    <div className="time-inputs">
                                        <input
                                            type="time"
                                            value={storeData.workingHoursWeekly[day].open}
                                            onChange={(e) => handleWeeklyHoursChange(day, 'open', e.target.value)}
                                            disabled={storeData.workingHoursWeekly[day].closed}
                                        />
                                        <span>إلى</span>
                                        <input
                                            type="time"
                                            value={storeData.workingHoursWeekly[day].close}
                                            onChange={(e) => handleWeeklyHoursChange(day, 'close', e.target.value)}
                                            disabled={storeData.workingHoursWeekly[day].closed}
                                        />
                                        <label className="closed-toggle">
                                            <input
                                                type="checkbox"
                                                checked={storeData.workingHoursWeekly[day].closed}
                                                onChange={(e) => handleWeeklyHoursChange(day, 'closed', e.target.checked)}
                                            />
                                            مغلق
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-section glass">
                        <h2><MapPin size={20} /> موقع المتجر (الإحداثيات)</h2>
                        <p className="section-helper">مطلوب لحساب مسافة التوصيل بدقة.</p>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>خط العرض (Latitude)</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="lat"
                                    value={storeData.location?.lat || ''}
                                    onChange={(e) => setStoreData(prev => ({
                                        ...prev,
                                        location: { ...prev.location, lat: parseFloat(e.target.value) }
                                    }))}
                                    placeholder="e.g. 31.7683"
                                />
                            </div>
                            <div className="form-group">
                                <label>خط الطول (Longitude)</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="lng"
                                    value={storeData.location?.lng || ''}
                                    onChange={(e) => setStoreData(prev => ({
                                        ...prev,
                                        location: { ...prev.location, lng: parseFloat(e.target.value) }
                                    }))}
                                    placeholder="e.g. 35.2137"
                                />
                            </div>
                        </div>
                        <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" style={{ color: '#E11D48', fontSize: '0.9rem', display: 'block', marginTop: '0.5rem' }}>
                            افتح خرائط جوجل للحصول على الإحداثيات ↗
                        </a>
                    </div>

                    <div className="form-section glass">
                        <div className="section-header-box">
                            <h2><BadgeDollarSign size={20} /> نطاقات التوصيل (Zones)</h2>
                            <p className="section-helper">حدد المناطق حسب المسافة من المتجر. سيتم تطبيق السعر الخاص بأقرب نطاق يغطي موقع العميل.</p>
                        </div>
                        <div className="delivery-rates-list">
                            {(storeData.deliveryZones || []).map((zone, index) => (
                                <div key={index} className="rate-row" style={{ alignItems: 'flex-end', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                                    <div className="rate-field" style={{ flex: 2 }}>
                                        <label>اسم النطاق</label>
                                        <input
                                            placeholder="مثال: المنطقة القريبة"
                                            value={zone.name}
                                            onChange={(e) => {
                                                const newZones = [...(storeData.deliveryZones || [])];
                                                newZones[index].name = e.target.value;
                                                setStoreData(prev => ({ ...prev, deliveryZones: newZones }));
                                            }}
                                        />
                                    </div>
                                    <div className="rate-field">
                                        <label>المسافة (كم)</label>
                                        <input
                                            type="number"
                                            placeholder="5"
                                            value={zone.radiusKm}
                                            onChange={(e) => {
                                                const newZones = [...(storeData.deliveryZones || [])];
                                                newZones[index].radiusKm = parseFloat(e.target.value);
                                                setStoreData(prev => ({ ...prev, deliveryZones: newZones }));
                                            }}
                                        />
                                        <small style={{ color: '#666', fontSize: '0.7em' }}>حتى {zone.radiusKm} كم</small>
                                    </div>
                                    <div className="rate-field">
                                        <label>سعر التوصيل (₪)</label>
                                        <input
                                            type="number"
                                            placeholder="15"
                                            value={zone.fee}
                                            onChange={(e) => {
                                                const newZones = [...(storeData.deliveryZones || [])];
                                                newZones[index].fee = parseFloat(e.target.value);
                                                setStoreData(prev => ({ ...prev, deliveryZones: newZones }));
                                            }}
                                        />
                                    </div>
                                    <div className="rate-field" style={{ flex: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '10px' }}>
                                        <label className="switch-label" title={zone.isActive ? "نشط" : "غير نشط"}>
                                            <input
                                                type="checkbox"
                                                checked={zone.isActive}
                                                onChange={(e) => {
                                                    const newZones = [...(storeData.deliveryZones || [])];
                                                    newZones[index].isActive = e.target.checked;
                                                    setStoreData(prev => ({ ...prev, deliveryZones: newZones }));
                                                }}
                                            />
                                        </label>
                                    </div>

                                    <button
                                        className="remove-rate-btn"
                                        title="حذف النطاق"
                                        onClick={() => {
                                            const newZones = storeData.deliveryZones.filter((_, i) => i !== index);
                                            setStoreData(prev => ({ ...prev, deliveryZones: newZones }));
                                        }}
                                        style={{ backgroundColor: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>×</span>
                                    </button>
                                </div>
                            ))}

                            <button
                                className="add-rate-btn"
                                onClick={() => setStoreData(prev => ({
                                    ...prev,
                                    deliveryZones: [...(prev.deliveryZones || []), { name: '', radiusKm: 0, fee: 0, isActive: true }]
                                }))}
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '12px',
                                    border: '1px dashed #E11D48',
                                    color: '#E11D48',
                                    background: '#FFF1F2',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                + إضافة نطاق توصيل جديد
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Images & Socials */}
                <div className="form-column">
                    <div className="form-section glass">
                        <h2><Upload size={20} /> الصور</h2>

                        <div className="form-group logo-uploader">
                            <label>شعار المتجر (Logo)</label>
                            <div className="image-upload-area" onClick={() => document.getElementById('logo-input').click()}>
                                {storeData.logo ? (
                                    <>
                                        <img src={storeData.logo} alt="Logo" />
                                        <div className="upload-overlay">
                                            <span className="upload-btn-mini"><Upload size={14} /> تغيير</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="upload-placeholder">
                                        <Upload size={24} />
                                        <span>رفع الشعار</span>
                                    </div>
                                )}
                                <input
                                    id="logo-input"
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'logo')}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>صورة الغلاف (Cover)</label>
                            <div className="image-upload-area cover-uploader" onClick={() => document.getElementById('cover-input').click()}>
                                {storeData.cover ? (
                                    <>
                                        <img src={storeData.cover} alt="Cover" />
                                        <div className="upload-overlay">
                                            <span className="upload-btn-mini"><Upload size={14} /> تغيير</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="upload-placeholder">
                                        <Upload size={24} />
                                        <span>رفع الغلاف</span>
                                    </div>
                                )}
                                <input
                                    id="cover-input"
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'cover')}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section glass">
                        <h2><Globe size={20} /> روابط التواصل</h2>
                        <div className="social-inputs">
                            <div className="social-input-group">
                                <div className="social-icon"><Instagram size={18} /></div>
                                <input
                                    type="text"
                                    name="instagram"
                                    value={storeData.social?.instagram || ''}
                                    onChange={(e) => handleInputChange(e, 'social')}
                                    placeholder="رابط انستجرام"
                                />
                            </div>
                            <div className="social-input-group">
                                <div className="social-icon"><Video size={18} /></div>
                                <input
                                    type="text"
                                    name="tiktok"
                                    value={storeData.social?.tiktok || ''}
                                    onChange={(e) => handleInputChange(e, 'social')}
                                    placeholder="رابط تيك توك"
                                />
                            </div>
                            <div className="social-input-group">
                                <div className="social-icon"><MessageCircle size={18} /></div>
                                <input
                                    type="text"
                                    name="whatsapp"
                                    value={storeData.social?.whatsapp || ''}
                                    onChange={(e) => handleInputChange(e, 'social')}
                                    placeholder="رابط واتساب"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="form-actions">
                <button
                    className="floating-save-btn"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? <Loader className="spin" size={20} /> : <Save size={20} />}
                    <span>حفظ التغييرات</span>
                </button>
            </div>
        </div >
    );
};

export default StoreManager;
