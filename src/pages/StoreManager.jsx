import React, { useState, useEffect } from 'react';
import {
    Store,
    MapPin,
    Clock,
    Phone,
    Globe,
    Instagram,
    Twitter,
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
            twitter: '',
            whatsapp: ''
        },
        logo: '',
        cover: ''
    });

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
                                <div className="social-icon"><Twitter size={18} /></div>
                                <input
                                    type="text"
                                    name="twitter"
                                    value={storeData.social?.twitter || ''}
                                    onChange={(e) => handleInputChange(e, 'social')}
                                    placeholder="رابط تويتر"
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
        </div>
    );
};

export default StoreManager;
