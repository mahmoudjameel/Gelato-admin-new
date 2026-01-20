import React, { useState, useEffect } from 'react';
import {
    Ticket,
    Plus,
    Trash2,
    Edit2,
    Save,
    X,
    Percent,
    DollarSign,
    Layers,
    Calendar,
    Users
} from 'lucide-react';
import { db } from '../firebase/config';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import './PromoCodeManager.css';

const PromoCodeManager = () => {
    const { t, i18n } = useTranslation();
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage', // percentage | fixed | tiered
        value: '', // For fixed/percentage
        tiers: [''], // For tiered: array of percentages ['50', '40', '30']
        subsequentValue: '0', // Fallback for tiers
        maxUsesGlobal: '',
        maxUsesPerUser: '1',
        expiryDate: '',
        isActive: true
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'promo_codes'), (snapshot) => {
            const promoList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPromos(promoList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const resetForm = () => {
        setFormData({
            code: '',
            type: 'percentage',
            value: '',
            tiers: [''],
            subsequentValue: '0',
            maxUsesGlobal: '',
            maxUsesPerUser: '1',
            expiryDate: '',
            isActive: true
        });
        setEditingId(null);
    };

    const handleEdit = (promo) => {
        setEditingId(promo.id);

        // Format date for input
        let dateStr = '';
        if (promo.expiryDate) {
            const date = promo.expiryDate.toDate();
            dateStr = date.toISOString().split('T')[0];
        }

        setFormData({
            code: promo.code,
            type: promo.type,
            value: promo.value || '',
            tiers: promo.tiers || [''],
            subsequentValue: promo.subsequentValue || '0',
            maxUsesGlobal: promo.maxUsesGlobal || '',
            maxUsesPerUser: promo.maxUsesPerUser || '1',
            expiryDate: dateStr,
            isActive: promo.isActive
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('promos.deleteConfirm'))) {
            try {
                await deleteDoc(doc(db, 'promo_codes', id));
            } catch (error) {
                console.error("Error deleting promo:", error);
                alert(t('promos.deleteError'));
            }
        }
    };

    const handleTierChange = (index, value) => {
        const newTiers = [...formData.tiers];
        newTiers[index] = value;
        setFormData(prev => ({ ...prev, tiers: newTiers }));
    };

    const addTier = () => {
        setFormData(prev => ({ ...prev, tiers: [...prev.tiers, ''] }));
    };

    const removeTier = (index) => {
        setFormData(prev => ({
            ...prev,
            tiers: prev.tiers.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.code) {
            alert(t('promos.enterCodeError'));
            return;
        }

        try {
            const promoData = {
                code: formData.code.toUpperCase(),
                type: formData.type,
                maxUsesGlobal: formData.maxUsesGlobal ? Number(formData.maxUsesGlobal) : null,
                maxUsesPerUser: formData.maxUsesPerUser ? Number(formData.maxUsesPerUser) : 1,
                isActive: formData.isActive,
                createdAt: serverTimestamp(),
            };

            // Add Expiry
            if (formData.expiryDate) {
                promoData.expiryDate = Timestamp.fromDate(new Date(formData.expiryDate));
            }

            // Add Value Logic
            if (formData.type === 'tiered') {
                promoData.tiers = formData.tiers.map(t => Number(t));
                promoData.subsequentValue = Number(formData.subsequentValue);
            } else {
                promoData.value = Number(formData.value);
            }

            if (editingId) {
                await updateDoc(doc(db, 'promo_codes', editingId), promoData);
                alert(t('promos.updateSuccess'));
            } else {
                // Check if code exists
                // In a real app, you'd check for duplicates here using a query
                await addDoc(collection(db, 'promo_codes'), promoData);
                alert(t('promos.createSuccess'));
            }

            resetForm();

        } catch (error) {
            console.error("Error saving promo:", error);
            alert(t('promos.saveError', { error: error.message }));
        }
    };

    return (
        <div className="promo-manager">
            <div className="page-header">
                <div className="header-left">
                    <h1>{t('promos.title')}</h1>
                    <p>{t('promos.subtitle')}</p>
                </div>
            </div>

            <div className="promo-grid">
                {/* List Column */}
                <div className="promos-list-container">
                    <div className="promos-list">
                        {promos.map(promo => (
                            <div key={promo.id} className={`promo-card ${!promo.isActive ? 'opacity-60' : ''}`}>
                                <div className="promo-info">
                                    <h3>
                                        <span className="font-mono font-bold text-lg">{promo.code}</span>
                                        <span className="promo-type">
                                            {promo.type === 'tiered' ? t('promos.promoType.tiered') : promo.type === 'fixed' ? t('promos.promoType.fixed') : t('promos.promoType.percentage')}
                                        </span>
                                    </h3>
                                    <div className="promo-meta">
                                        {promo.type === 'tiered' ? (
                                            <span>
                                                <Layers size={14} /> {promo.tiers?.join('% → ')}%
                                            </span>
                                        ) : (
                                            <span>
                                                {promo.type === 'fixed' ? <DollarSign size={14} /> : <Percent size={14} />}
                                                {promo.value}
                                                {promo.type === 'percentage' ? '%' : ' ₪'}
                                            </span>
                                        )}
                                        {promo.expiryDate && (
                                            <span>
                                                <Calendar size={14} /> {promo.expiryDate.toDate().toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'he-IL')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="promo-actions">
                                    <span className={`status-badge ${promo.isActive ? 'active' : 'expired'}`}>
                                        {promo.isActive ? t('promos.status.active') : t('promos.status.expired')}
                                    </span>
                                    <button onClick={() => handleEdit(promo)} className="action-btn" title={t('common.edit')}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(promo.id)} className="action-btn delete" title={t('common.delete')}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {promos.length === 0 && !loading && (
                            <div className="text-center p-8 text-gray-500">
                                {t('promos.noPromos')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Column */}
                <div className="form-column">
                    <div className="glass-panel sticky top-4">
                        <div className="panel-header">
                            <h2>
                                {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
                                {editingId ? t('promos.editPromo') : t('promos.newPromo')}
                            </h2>
                            {editingId && (
                                <button onClick={resetForm} className="action-btn" title={t('promos.cancel')}>
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>{t('promos.promoCodeLabel')}</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder={t('promos.promoCodePlaceholder')}
                                    className="font-mono text-lg uppercase"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('promos.discountType')}</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                >
                                    <option value="percentage">{t('promos.types.percentage')}</option>
                                    <option value="fixed">{t('promos.types.fixed')}</option>
                                    <option value="tiered">{t('promos.types.tiered')}</option>
                                </select>
                            </div>

                            {formData.type === 'tiered' ? (
                                <div className="form-group">
                                    <label>{t('promos.tieredDiscountLabel')}</label>
                                    <div className="tiers-container">
                                        {formData.tiers.map((tier, index) => (
                                            <div key={index} className="tier-row">
                                                <div className="tier-number">{index + 1}</div>
                                                <div className="tier-input-group">
                                                    <span>{t('promos.discount')}</span>
                                                    <input
                                                        type="number"
                                                        value={tier}
                                                        onChange={(e) => handleTierChange(index, e.target.value)}
                                                        placeholder="50"
                                                    />
                                                    <span>%</span>
                                                </div>
                                                {formData.tiers.length > 1 && (
                                                    <div className="remove-tier-btn" onClick={() => removeTier(index)}>
                                                        <X size={14} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" className="add-tier-btn" onClick={addTier}>
                                            <Plus size={16} /> {t('promos.addLevel')}
                                        </button>

                                        <div className="tier-row mt-3 bg-gray-50">
                                            <div className="tier-number text-gray-500">∞</div>
                                            <div className="tier-input-group">
                                                <span className="text-sm">{t('promos.afterThat')}</span>
                                                <input
                                                    type="number"
                                                    value={formData.subsequentValue}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, subsequentValue: e.target.value }))}
                                                    placeholder="0"
                                                />
                                                <span>%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {t('promos.tieredExample')}
                                    </p>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>{t('promos.discountValue')}</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.value}
                                            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                                            placeholder={t('promos.discountValuePlaceholder')}
                                            required
                                        />
                                        <span className="absolute left-3 top-3 text-gray-400">
                                            {formData.type === 'percentage' ? '%' : '₪'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('promos.usesPerPerson')}</label>
                                    <input
                                        type="number"
                                        value={formData.maxUsesPerUser}
                                        onChange={(e) => setFormData(prev => ({ ...prev, maxUsesPerUser: e.target.value }))}
                                        placeholder="1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('promos.expiryDate')}</label>
                                    <input
                                        type="date"
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{t('promos.enableCode')}</span>
                                </label>
                            </div>

                            <button type="submit" className="save-btn" disabled={loading}>
                                <Save size={20} />
                                {editingId ? t('promos.saveChanges') : t('promos.createCode')}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromoCodeManager;
