import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Image as ImageIcon,
    X,
    Save,
    Upload,
    Layers
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
    orderBy,
    setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './BannerManager.css';

const BannerManager = () => {
    const { t } = useTranslation();
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        titleAr: '',
        titleHe: '',
        subtitleAr: '',
        subtitleHe: '',
        badge: t('banners.defaultBadge'),
        image: ''
    });

    const [bannerSettings, setBannerSettings] = useState({
        interval: 3000,
        isPlaying: true
    });

    useEffect(() => {
        fetchBanners();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const docRef = doc(db, 'banners', 'config');
            const docSnap = await getDocs(query(collection(db, 'banners')));
            // Better approach for single config doc:
            // Since we might not have the collection yet, let's use setDoc to ensure it exists or get it.
            // Actually, simply reading the doc is better.
            const settingsSnapshot = await getDocs(collection(db, 'banners'));
            settingsSnapshot.forEach(doc => {
                if (doc.id === 'config') {
                    setBannerSettings(prev => ({ ...prev, ...doc.data() }));
                }
            });
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    const updateSettings = async (key, value) => {
        const newSettings = { ...bannerSettings, [key]: value };
        setBannerSettings(newSettings); // Optimistic update
        try {
            await setDoc(doc(db, 'banners', 'config'), { [key]: value }, { merge: true });
        } catch (error) {
            console.error("Error updating settings:", error);
            // Revert on error if needed
        }
    };

    const fetchBanners = async () => {
        try {
            const q = query(collection(db, 'banner'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setBanners(data);
        } catch (error) {
            console.error("Error fetching banners: ", error);
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
        const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
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

            const bannerData = {
                ...formData,
                title: formData.titleAr, // Fallback/Compat
                subtitle: formData.subtitleAr, // Fallback/Compat
                image: imageUrl
            };

            if (editingBanner) {
                await updateDoc(doc(db, 'banner', editingBanner.id), bannerData);
            } else {
                await addDoc(collection(db, 'banner'), bannerData);
            }

            setIsModalOpen(false);
            resetForm();
            fetchBanners();
        } catch (error) {
            console.error("Error saving banner: ", error);
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setEditingBanner(null);
        setImageFile(null);
        setImagePreview(null);
        setFormData({
            titleAr: '',
            titleHe: '',
            subtitleAr: '',
            subtitleHe: '',
            badge: t('banners.defaultBadge'),
            image: ''
        });
    };

    const openModal = (banner = null) => {
        if (banner) {
            setEditingBanner(banner);
            setFormData({
                ...banner,
                titleAr: banner.titleAr || banner.title || '',
                titleHe: banner.titleHe || '',
                subtitleAr: banner.subtitleAr || banner.subtitle || '',
                subtitleHe: banner.subtitleHe || '',
            });
            setImagePreview(banner.image);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('banners.deleteConfirm'))) {
            try {
                await deleteDoc(doc(db, 'banner', id));
                fetchBanners();
            } catch (error) {
                console.error("Error deleting banner: ", error);
            }
        }
    };

    return (
        <div className="banner-manager">
            <div className="page-header">
                <div className="header-left">
                    <button className="add-btn" onClick={() => openModal()}>
                        <Plus size={20} />
                        <span>{t('banners.addNew')}</span>
                    </button>
                </div>

                {/* Global Settings Controls */}
                <div className="header-right settings-controls glass">
                    <div className="setting-item">
                        <label>{t('banners.autoPlay')}</label>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={bannerSettings.isPlaying}
                                onChange={(e) => updateSettings('isPlaying', e.target.checked)}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    <div className="setting-item">
                        <label>{t('banners.switchSpeed')}</label>
                        <div className="range-wrapper">
                            <input
                                type="range"
                                min="2"
                                max="10"
                                value={bannerSettings.interval / 1000}
                                onChange={(e) => updateSettings('interval', Number(e.target.value) * 1000)}
                            />
                            <span>{bannerSettings.interval / 1000} {t('banners.seconds')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="banner-list">
                {loading ? (
                    <div className="loading">{t('banners.loading')}</div>
                ) : banners.length === 0 ? (
                    <div className="empty-state glass">
                        <Layers size={48} color="#D946EF" />
                        <p>{t('banners.noBanners')}</p>
                    </div>
                ) : banners.map((banner) => (
                    <div key={banner.id} className="banner-preview-card glass">
                        <div className="banner-visual">
                            <img src={banner.image} alt={banner.title} />
                            <div className="banner-overlay">
                                <span className="banner-badge-preview">{banner.badge}</span>
                                <h2>{banner.titleAr || banner.title}</h2>
                                <p>{banner.subtitleAr || banner.subtitle}</p>
                            </div>
                        </div>
                        <div className="banner-meta">
                            <div className="banner-actions">
                                <button className="edit-btn" onClick={() => openModal(banner)}>
                                    <Edit2 size={18} />
                                    <span>{t('banners.edit')}</span>
                                </button>
                                <button className="delete-btn" onClick={() => handleDelete(banner.id)}>
                                    <Trash2 size={18} />
                                    <span>{t('banners.delete')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass">
                        <div className="modal-header">
                            <h2>{editingBanner ? t('banners.editBanner') : t('banners.newBanner')}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>{t('banners.mainTitleAr')}</label>
                                    <input
                                        type="text"
                                        value={formData.titleAr}
                                        onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                                        required
                                        placeholder={t('banners.titlePlaceholder')}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('banners.mainTitleHe')}</label>
                                    <input
                                        type="text"
                                        value={formData.titleHe}
                                        onChange={(e) => setFormData({ ...formData, titleHe: e.target.value })}
                                        dir="rtl"
                                        placeholder={t('banners.titleHePlaceholder')}
                                    />
                                </div>
                            </div>
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>{t('banners.subtitleAr')}</label>
                                    <input
                                        type="text"
                                        value={formData.subtitleAr}
                                        onChange={(e) => setFormData({ ...formData, subtitleAr: e.target.value })}
                                        required
                                        placeholder={t('banners.subtitlePlaceholder')}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('banners.subtitleHe')}</label>
                                    <input
                                        type="text"
                                        value={formData.subtitleHe}
                                        onChange={(e) => setFormData({ ...formData, subtitleHe: e.target.value })}
                                        dir="rtl"
                                        placeholder={t('banners.subtitleHePlaceholder')}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('banners.badge')}</label>
                                <input
                                    type="text"
                                    value={formData.badge}
                                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('banners.bannerImage')}</label>
                                <div className="image-upload-box" onClick={() => document.getElementById('bannerImageInput').click()}>
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="preview-img" />
                                    ) : (
                                        <div className="upload-placeholder">
                                            <Upload size={32} />
                                            <p>{t('banners.clickToUpload')}</p>
                                        </div>
                                    )}
                                    <input
                                        id="bannerImageInput"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="save-btn" disabled={uploading}>
                                    {uploading ? t('banners.saving') : (
                                        <>
                                            <Save size={18} />
                                            <span>{editingBanner ? t('banners.saveChanges') : t('banners.add')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BannerManager;
