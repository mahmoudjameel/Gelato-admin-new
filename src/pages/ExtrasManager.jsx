import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Save,
    X,
    Upload,
    Snowflake,
    Clock,
    AlertTriangle,
    Image as ImageIcon,
    Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, storage } from '../firebase/config';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './ExtrasManager.css';

const ExtrasManager = () => {
    const { t } = useTranslation();
    const [extras, setExtras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExtra, setEditingExtra] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [freezeModalOpen, setFreezeModalOpen] = useState(false);
    const [extraToFreeze, setExtraToFreeze] = useState(null);
    const [freezeType, setFreezeType] = useState('tomorrow'); // tomorrow, scheduled, indefinite
    const [customFreezeDate, setCustomFreezeDate] = useState('');

    const [formData, setFormData] = useState({
        nameAr: '',
        nameHe: '',
        price: '',
        image: '',
        isFrozen: false
    });

    useEffect(() => {
        fetchExtras();
    }, []);

    const fetchExtras = async () => {
        try {
            const q = query(collection(db, 'extras'), orderBy('nameAr'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExtras(data);
        } catch (error) {
            console.error("Error fetching extras: ", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (file) => {
        const storageRef = ref(storage, `extras/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            let imageUrl = formData.image;
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            const extraData = {
                ...formData,
                image: imageUrl,
                price: parseFloat(formData.price) || 0
            };

            if (editingExtra) {
                await updateDoc(doc(db, 'extras', editingExtra.id), extraData);
            } else {
                await addDoc(collection(db, 'extras'), extraData);
            }

            handleCloseModal();
            fetchExtras();
        } catch (error) {
            console.error("Error saving extra: ", error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('common.deleteConfirm'))) {
            try {
                await deleteDoc(doc(db, 'extras', id));
                fetchExtras();
            } catch (error) {
                console.error("Error deleting extra: ", error);
            }
        }
    };

    // Freeze Functions
    const handleFreezeClick = (extra) => {
        setExtraToFreeze(extra);
        setFreezeType('tomorrow');
        setCustomFreezeDate('');
        setFreezeModalOpen(true);
    };

    const submitFreeze = async () => {
        if (!extraToFreeze) return;

        let unfreezeAt = null;
        const now = new Date();

        if (freezeType === 'tomorrow') {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0); // Midnight
            unfreezeAt = tomorrow;
        } else if (freezeType === 'scheduled' && customFreezeDate) {
            unfreezeAt = new Date(customFreezeDate);
        }
        // If indefinite, unfreezeAt remains null but isFrozen is true

        try {
            await updateDoc(doc(db, 'extras', extraToFreeze.id), {
                isFrozen: true,
                freezeType,
                unfreezeAt: unfreezeAt ? unfreezeAt : null
            });
            setFreezeModalOpen(false);
            setExtraToFreeze(null);
            fetchExtras();
        } catch (error) {
            console.error("Error freezing extra: ", error);
        }
    };

    const unfreezeExtra = async (id) => {
        if (window.confirm(t('products.unfreezeConfirm'))) {
            try {
                await updateDoc(doc(db, 'extras', id), {
                    isFrozen: false,
                    freezeType: null,
                    unfreezeAt: null
                });
                fetchExtras();
            } catch (error) {
                console.error("Error unfreezing extra: ", error);
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingExtra(null);
        setImageFile(null);
        setImagePreview(null);
        setFormData({ nameAr: '', nameHe: '', price: '', image: '', isFrozen: false });
    };

    const openModal = (extra = null) => {
        if (extra) {
            setEditingExtra(extra);
            setFormData({
                nameAr: extra.nameAr || '',
                nameHe: extra.nameHe || '',
                price: extra.price || '',
                image: extra.image || '',
                isFrozen: extra.isFrozen || false
            });
            setImagePreview(extra.image);
        } else {
            setEditingExtra(null);
            setFormData({ nameAr: '', nameHe: '', price: '', image: '', isFrozen: false });
            setImagePreview(null);
        }
        setIsModalOpen(true);
    };

    const filteredExtras = extras.filter(ex =>
        (ex.nameAr && ex.nameAr.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ex.nameHe && ex.nameHe.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="extras-manager">
            <div className="page-header">
                <div className="header-left">
                    <button type="button" className="add-btn" onClick={() => openModal()}>
                        <Plus size={20} />
                        <span>{t('menuManagement.addExtra')}</span>
                    </button>
                </div>
                <div className="header-right">
                    <div className="search-bar glass">
                        <Search size={18} color="#9CA3AF" />
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="extras-grid">
                {loading ? (
                    <div className="loading">{t('common.loading')}</div>
                ) : filteredExtras.length === 0 ? (
                    <div className="empty-state">{t('common.noData')}</div>
                ) : (
                    filteredExtras.map((extra) => (
                        <div key={extra.id} className={`extra-card glass ${extra.isFrozen ? 'frozen' : ''}`}>
                            {extra.isFrozen && (
                                <div className="frozen-badge">
                                    <Snowflake size={12} />
                                    <span>{t('products.frozen')}</span>
                                </div>
                            )}

                            <div className="extra-image-container">
                                {extra.image ? (
                                    <img src={extra.image} alt={extra.nameAr} className="extra-img" />
                                ) : (
                                    <ImageIcon size={32} color="#9CA3AF" />
                                )}
                            </div>

                            <div className="extra-info">
                                <h3>{extra.nameAr} / {extra.nameHe}</h3>
                                <span className="price-tag">{extra.price} ₪</span>
                            </div>

                            <div className="extra-actions">
                                {extra.isFrozen ? (
                                    <button className="unfreeze-btn" title={t('products.unfreeze')} onClick={() => unfreezeExtra(extra.id)}>
                                        <Snowflake size={16} color="#3B82F6" />
                                    </button>
                                ) : (
                                    <button className="freeze-btn" title={t('products.freeze')} onClick={() => handleFreezeClick(extra)}>
                                        <Clock size={16} color="#F59E0B" />
                                    </button>
                                )}
                                <button className="edit-btn" onClick={() => openModal(extra)}>
                                    <Edit2 size={16} />
                                </button>
                                <button className="delete-btn" onClick={() => handleDelete(extra.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && createPortal(
                <div className="extras-manager modal-root">
                    <div className="modal-overlay" onClick={handleCloseModal}>
                        <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{editingExtra ? t('menuManagement.editExtras') : t('menuManagement.addExtra')}</h2>
                                <button type="button" onClick={handleCloseModal}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="modal-form">
                                <div className="image-upload-area" onClick={() => document.getElementById('extraImageInput').click()}>
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="preview-img-modal" />
                                    ) : (
                                        <>
                                            <Upload size={24} color="#9CA3AF" />
                                            <span style={{ color: '#6B7280', marginTop: 8 }}>{t('products.uploadImage')}</span>
                                        </>
                                    )}
                                    <input
                                        id="extraImageInput"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>{t('products.nameAr')}</label>
                                    <input
                                        type="text"
                                        value={formData.nameAr}
                                        onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                        required
                                        placeholder={t('products.nameAr')}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('products.nameHe')}</label>
                                    <input
                                        type="text"
                                        value={formData.nameHe}
                                        onChange={(e) => setFormData({ ...formData, nameHe: e.target.value })}
                                        dir="rtl"
                                        placeholder={t('products.nameHe')}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('products.price')}</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="modal-footer">
                                    <button type="submit" className="save-btn" disabled={uploading}>
                                        {uploading ? (
                                            <span>{t('common.loading')}</span>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                <span>{editingExtra ? t('common.save') : t('common.add')}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {freezeModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass modal-small" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2>{t('products.freezeProduct')}</h2>
                            <button onClick={() => setFreezeModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px' }}>
                            <div className="freeze-options">
                                <label className={`freeze-option ${freezeType === 'tomorrow' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="freezeType"
                                        value="tomorrow"
                                        checked={freezeType === 'tomorrow'}
                                        onChange={(e) => setFreezeType(e.target.value)}
                                    />
                                    <Clock size={20} />
                                    <span>{t('products.freezeTomorrow')}</span>
                                </label>

                                <label className={`freeze-option ${freezeType === 'scheduled' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="freezeType"
                                        value="scheduled"
                                        checked={freezeType === 'scheduled'}
                                        onChange={(e) => setFreezeType(e.target.value)}
                                    />
                                    <Calendar size={20} />
                                    <span>{t('products.freezeScheduled')}</span>
                                </label>

                                {freezeType === 'scheduled' && (
                                    <input
                                        type="datetime-local"
                                        className="freeze-date-input"
                                        value={customFreezeDate}
                                        onChange={(e) => setCustomFreezeDate(e.target.value)}
                                        style={{ width: '100%', marginTop: '10px', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                )}

                                <label className={`freeze-option ${freezeType === 'indefinite' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="freezeType"
                                        value="indefinite"
                                        checked={freezeType === 'indefinite'}
                                        onChange={(e) => setFreezeType(e.target.value)}
                                    />
                                    <Snowflake size={20} />
                                    <span>{t('products.freezeIndefinite')}</span>
                                </label>
                            </div>

                            <div className="modal-footer" style={{ marginTop: '20px' }}>
                                <button className="save-btn" onClick={submitFreeze} disabled={freezeType === 'scheduled' && !customFreezeDate}>
                                    {t('products.confirmFreeze')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExtrasManager;
