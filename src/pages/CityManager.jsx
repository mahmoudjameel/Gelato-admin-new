import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
    addDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    Plus,
    Trash2,
    Edit2,
    GripVertical,
    Save,
    X,
    MapPin,
    Languages,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './CityManager.css';

const CityManager = () => {
    const { t, i18n } = useTranslation();
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCity, setEditingCity] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        ar: '',
        he: '',
        order: 0
    });

    useEffect(() => {
        fetchCities();
    }, []);

    const fetchCities = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'cities'), orderBy('order', 'asc'));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCities(list);
        } catch (error) {
            console.error('Error fetching cities:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setFormData({ ar: '', he: '', order: cities.length > 0 ? Math.max(...cities.map(c => c.order || 0)) + 1 : 0 });
        setEditingCity(null);
        setIsAddModalOpen(true);
    };

    const handleOpenEdit = (city) => {
        setEditingCity(city);
        setFormData({ ar: city.ar, he: city.he, order: city.order || 0 });
        setIsAddModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingCity) {
                await updateDoc(doc(db, 'cities', editingCity.id), {
                    ...formData,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, 'cities'), {
                    ...formData,
                    createdAt: serverTimestamp()
                });
            }
            setIsAddModalOpen(false);
            fetchCities();
        } catch (error) {
            console.error('Error saving city:', error);
            alert('Error saving city');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(i18n.language === 'ar' ? 'هل أنت متأكد من حذف هذه المدينة؟' : 'האם אתה בטוח שברצונך למחוק עיר זו?')) return;
        try {
            await deleteDoc(doc(db, 'cities', id));
            fetchCities();
        } catch (error) {
            console.error('Error deleting city:', error);
        }
    };

    const moveStep = async (index, direction) => {
        const newCities = [...cities];
        const otherIndex = index + direction;
        if (otherIndex < 0 || otherIndex >= cities.length) return;

        // Swap order values
        const tempOrder = newCities[index].order;
        newCities[index].order = newCities[otherIndex].order;
        newCities[otherIndex].order = tempOrder;

        // Update in Firebase
        try {
            await updateDoc(doc(db, 'cities', newCities[index].id), { order: newCities[index].order });
            await updateDoc(doc(db, 'cities', newCities[otherIndex].id), { order: newCities[otherIndex].order });
            fetchCities();
        } catch (error) {
            console.error('Error moving city:', error);
        }
    };

    return (
        <div className="city-manager-container">
            <div className="page-header">
                <div className="header-info">
                    <h1>{i18n.language === 'ar' ? 'إدارة المدن' : 'ניהול ערים'}</h1>
                    <p>{i18n.language === 'ar' ? 'أضف وتحكم في المدن المتاحة للتسجيل والتوصيل' : 'הוסף ונהל ערים זמינות להרשמה ומשלוחים'}</p>
                </div>
                <button className="add-btn glass" onClick={handleOpenAdd}>
                    <Plus size={20} />
                    <span>{i18n.language === 'ar' ? 'إضافة مدينة' : 'הוסף עיר'}</span>
                </button>
            </div>

            <div className="cities-grid glass">
                {loading ? (
                    <div className="loading">{t('common.loading')}</div>
                ) : cities.length === 0 ? (
                    <div className="empty">{t('common.noData')}</div>
                ) : (
                    <div className="cities-list">
                        <div className="list-header">
                            <span className="col-order">#</span>
                            <span className="col-name">{i18n.language === 'ar' ? 'الاسم (عربي)' : 'שם (ערבית)'}</span>
                            <span className="col-name">{i18n.language === 'ar' ? 'الاسم (عبري)' : 'שם (עברית)'}</span>
                            <span className="col-actions">{t('orders.actions')}</span>
                        </div>
                        {cities.map((city, index) => (
                            <div key={city.id} className="city-item">
                                <div className="col-order">
                                    <div className="order-controls">
                                        <button disabled={index === 0} onClick={() => moveStep(index, -1)}><ArrowUp size={14} /></button>
                                        <span className="order-num">{city.order}</span>
                                        <button disabled={index === cities.length - 1} onClick={() => moveStep(index, 1)}><ArrowDown size={14} /></button>
                                    </div>
                                </div>
                                <div className="col-name ar-name">{city.ar}</div>
                                <div className="col-name he-name">{city.he}</div>
                                <div className="col-actions">
                                    <button className="edit-btn" onClick={() => handleOpenEdit(city)}><Edit2 size={18} /></button>
                                    <button className="delete-btn" onClick={() => handleDelete(city.id)}><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isAddModalOpen && (
                <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
                    <div className="modal-content glass" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingCity ? (i18n.language === 'ar' ? 'تعديل مدينة' : 'ערוך עיר') : (i18n.language === 'ar' ? 'إضافة مدينة جديدة' : 'הוסף עיר חדשה')}</h2>
                            <button className="close-btn" onClick={() => setIsAddModalOpen(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label><Languages size={16} /> {i18n.language === 'ar' ? 'الاسم بالعربية' : 'שם בערבית'}</label>
                                <input
                                    type="text"
                                    value={formData.ar}
                                    onChange={e => setFormData({ ...formData, ar: e.target.value })}
                                    required
                                    placeholder="رام الله، القدس..."
                                />
                            </div>
                            <div className="form-group">
                                <label><Languages size={16} /> {i18n.language === 'ar' ? 'الاسم بالعبرية' : 'שם בעברית'}</label>
                                <input
                                    type="text"
                                    value={formData.he}
                                    onChange={e => setFormData({ ...formData, he: e.target.value })}
                                    required
                                    placeholder="רמאללה, ירושלים..."
                                />
                            </div>
                            <div className="form-group">
                                <label><GripVertical size={16} /> {i18n.language === 'ar' ? 'الترتيب' : 'סדר'}</label>
                                <input
                                    type="number"
                                    value={formData.order}
                                    onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                    required
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="cancel-btn" onClick={() => setIsAddModalOpen(false)}>{t('common.cancel')}</button>
                                <button type="submit" className="save-btn" disabled={submitting}>
                                    {submitting ? t('common.loading') : <><Save size={18} /> {t('common.save')}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CityManager;
