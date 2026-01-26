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
    BadgeDollarSign,
    Trophy
} from 'lucide-react';
import { db, storage } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTranslation } from 'react-i18next';
import './StoreManager.css';

const StoreManager = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [storeData, setStoreData] = useState({
        nameAr: '',
        nameHe: '',
        descriptionAr: '',
        descriptionHe: '',
        addressAr: '',
        addressHe: '',
        phone: '',
        workingHoursAr: '',
        workingHoursHe: '',
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
        googleMapsUrl: '',
        wazeUrl: '',
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

    const [loyaltyData, setLoyaltyData] = useState({
        pointsPerCurrency: 1,
        currencyPerPoint: 1,
        rewardValue: 5,
        rewardPoints: 100,
        silverThreshold: 1000,
        silverDiscount: 5,
        goldThreshold: 3000,
        goldFreeDelivery: true
    });

    const dayLabels = {
        sunday: t('store.days.sunday'),
        monday: t('store.days.monday'),
        tuesday: t('store.days.tuesday'),
        wednesday: t('store.days.wednesday'),
        thursday: t('store.days.thursday'),
        friday: t('store.days.friday'),
        saturday: t('store.days.saturday')
    };

    useEffect(() => {
        fetchStoreData();
    }, []);

    const fetchStoreData = async () => {
        try {
            const docRef = doc(db, 'store', 'profile');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setStoreData(prev => ({
                    ...prev,
                    ...data,
                    // Migrate old fields if they exist and new ones don't
                    nameAr: data.nameAr || data.name || '',
                    descriptionAr: data.descriptionAr || data.description || '',
                    addressAr: data.addressAr || data.address || '',
                    workingHoursAr: data.workingHoursAr || data.workingHours || ''
                }));
            }

            // Fetch Loyalty Data
            const loyaltyDoc = await getDoc(doc(db, 'settings', 'loyalty'));
            if (loyaltyDoc.exists()) {
                setLoyaltyData(prev => ({ ...prev, ...loyaltyDoc.data() }));
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
            alert(t('store.errorUpload'));
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Save Store Profile
            await setDoc(doc(db, 'store', 'profile'), {
                ...storeData,
                updatedAt: new Date()
            }, { merge: true });

            // Save Loyalty Settings
            await setDoc(doc(db, 'settings', 'loyalty'), {
                ...loyaltyData,
                updatedAt: new Date()
            }, { merge: true });

            setSaving(false);
            alert(t('store.successSave'));
        } catch (error) {
            console.error("Error saving profile:", error);
            setSaving(false);
            alert(t('store.errorSave'));
        }
    };

    if (loading) return <div className="loading-screen">{t('store.loading')}</div>;

    return (
        <div className="store-manager">
            <div className="page-header">
                <div className="header-left">
                    <h1>{t('store.title')}</h1>
                    <p>{t('store.subtitle')}</p>
                </div>
            </div>

            <div className="store-form">
                {/* Left Column: Basic Info */}
                <div className="form-column">
                    <div className="form-section glass">
                        <h2><Store size={20} /> {t('store.basicInfo')}</h2>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>{t('store.nameAr')}</label>
                                <input
                                    type="text"
                                    name="nameAr"
                                    value={storeData.nameAr}
                                    onChange={handleInputChange}
                                    placeholder={t('store.storeNamePlaceholder')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('store.nameHe')}</label>
                                <input
                                    type="text"
                                    name="nameHe"
                                    value={storeData.nameHe}
                                    onChange={handleInputChange}
                                    placeholder={t('store.storeNamePlaceholder')}
                                />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>{t('store.descriptionAr')}</label>
                                <textarea
                                    name="descriptionAr"
                                    value={storeData.descriptionAr}
                                    onChange={handleInputChange}
                                    placeholder={t('store.storeDescPlaceholder')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('store.descriptionHe')}</label>
                                <textarea
                                    name="descriptionHe"
                                    value={storeData.descriptionHe}
                                    onChange={handleInputChange}
                                    placeholder={t('store.storeDescPlaceholder')}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section glass">
                        <h2><MapPin size={20} /> {t('store.contact')}</h2>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>{t('store.addressAr')}</label>
                                <input
                                    type="text"
                                    name="addressAr"
                                    value={storeData.addressAr}
                                    onChange={handleInputChange}
                                    placeholder={t('store.addressPlaceholder')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('store.addressHe')}</label>
                                <input
                                    type="text"
                                    name="addressHe"
                                    value={storeData.addressHe}
                                    onChange={handleInputChange}
                                    placeholder={t('store.addressPlaceholder')}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>{t('store.phoneNumber')}</label>
                            <input
                                type="text"
                                name="phone"
                                value={storeData.phone}
                                onChange={handleInputChange}
                                placeholder={t('store.phonePlaceholder')}
                            />
                        </div>
                        <div className="form-group">
                            <label>{t('store.locationUrl')}</label>
                            <input
                                type="text"
                                name="locationUrl"
                                value={storeData.locationUrl}
                                onChange={handleInputChange}
                                placeholder={t('store.locationUrlPlaceholder')}
                            />
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>{t('store.googleMapsUrl')}</label>
                                <input
                                    type="text"
                                    name="googleMapsUrl"
                                    value={storeData.googleMapsUrl || ''}
                                    onChange={handleInputChange}
                                    placeholder={t('store.googleMapsPlaceholder')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('store.wazeUrl')}</label>
                                <input
                                    type="text"
                                    name="wazeUrl"
                                    value={storeData.wazeUrl || ''}
                                    onChange={handleInputChange}
                                    placeholder={t('store.wazePlaceholder')}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section glass">
                        <h2><Clock size={20} /> {t('store.workingAndDelivery')}</h2>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>{t('store.workingHoursAr')}</label>
                                <input
                                    type="text"
                                    name="workingHoursAr"
                                    value={storeData.workingHoursAr}
                                    onChange={handleInputChange}
                                    placeholder={t('store.workingHoursPlaceholder')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('store.workingHoursHe')}</label>
                                <input
                                    type="text"
                                    name="workingHoursHe"
                                    value={storeData.workingHoursHe}
                                    onChange={handleInputChange}
                                    placeholder={t('store.workingHoursPlaceholder')}
                                />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>{t('store.deliveryTime')}</label>
                                <input
                                    type="text"
                                    name="deliveryTime"
                                    value={storeData.deliveryTime}
                                    onChange={handleInputChange}
                                    placeholder={t('store.deliveryTimePlaceholder')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('store.deliveryFeeLabel')}</label>
                                <input
                                    type="number"
                                    name="deliveryFee"
                                    value={storeData.deliveryFee}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('store.minOrderLabel')}</label>
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
                        <h2><Clock size={20} /> {t('store.detailedWorkingHours')}</h2>
                        <div className="weekly-hours-grid">
                            {Object.keys(storeData.workingHoursWeekly || {}).sort((a, b) => {
                                const order = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
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
                                        <span>{t('store.to')}</span>
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
                                            {t('store.closed')}
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-section glass">
                        <h2><MapPin size={20} /> {t('store.storeCoords')}</h2>
                        <p className="section-helper">{t('store.coordsHelper')}</p>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>{t('store.latitude')}</label>
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
                                <label>{t('store.longitude')}</label>
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
                            {t('store.openMaps')}
                        </a>
                    </div>

                    <div className="form-section glass">
                        <div className="section-header-box">
                            <h2><BadgeDollarSign size={20} /> {t('store.deliveryZones')}</h2>
                            <p className="section-helper">{t('store.zonesHelper')}</p>
                        </div>
                        <div className="delivery-rates-list">
                            {(storeData.deliveryZones || []).map((zone, index) => (
                                <div key={index} className="rate-row" style={{ alignItems: 'flex-end', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                                    <div className="rate-field" style={{ flex: 2 }}>
                                        <label>{t('store.zoneName')}</label>
                                        <input
                                            placeholder={t('store.zoneNamePlaceholder')}
                                            value={zone.name}
                                            onChange={(e) => {
                                                const newZones = [...(storeData.deliveryZones || [])];
                                                newZones[index].name = e.target.value;
                                                setStoreData(prev => ({ ...prev, deliveryZones: newZones }));
                                            }}
                                        />
                                    </div>
                                    <div className="rate-field">
                                        <label>{t('store.distanceKm')}</label>
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
                                        <small style={{ color: '#666', fontSize: '0.7em' }}>{t('store.upTo', { distance: zone.radiusKm })}</small>
                                    </div>
                                    <div className="rate-field">
                                        <label>{t('store.zoneFee')}</label>
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
                                        <label className="switch-label" title={zone.isActive ? t('store.active') : t('store.inactive')}>
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
                                        title={t('store.deleteZone')}
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
                                {t('store.addZone')}
                            </button>
                        </div>
                    </div>

                    {/* Loyalty System Section */}
                    <div className="form-section glass">
                        <h2><Trophy size={20} /> {t('store.loyalty.title')}</h2>
                        <p className="section-helper">{t('store.loyalty.subtitle')}</p>

                        <div className="loyalty-group">
                            <h3>{t('store.loyalty.ratios')}</h3>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>{t('store.loyalty.currencyPerPoint')}</label>
                                    <div className="input-with-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="number"
                                            value={loyaltyData.currencyPerPoint || 1}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 1;
                                                setLoyaltyData(prev => ({
                                                    ...prev,
                                                    currencyPerPoint: val,
                                                    pointsPerCurrency: 1 / val
                                                }));
                                            }}
                                            min="0.1"
                                            step="0.1"
                                        />
                                        <span style={{ fontSize: '0.8rem', color: '#666' }}>({t('common.points')})</span>
                                    </div>
                                    <small style={{ color: '#666', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                                        {t('store.loyalty.pointsPerCurrency')}: {loyaltyData.pointsPerCurrency?.toFixed(2)}
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label>{t('store.loyalty.rewardPoints')}</label>
                                    <input
                                        type="number"
                                        value={loyaltyData.rewardPoints}
                                        onChange={(e) => setLoyaltyData(prev => ({ ...prev, rewardPoints: parseFloat(e.target.value) }))}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('store.loyalty.rewardValue')}</label>
                                <input
                                    type="number"
                                    value={loyaltyData.rewardValue}
                                    onChange={(e) => setLoyaltyData(prev => ({ ...prev, rewardValue: parseFloat(e.target.value) }))}
                                />
                            </div>
                        </div>

                        <div className="loyalty-group" style={{ marginTop: '2rem' }}>
                            <h3>{t('store.loyalty.membershipLevels')}</h3>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>{t('store.loyalty.silverThreshold')}</label>
                                    <input
                                        type="number"
                                        value={loyaltyData.silverThreshold}
                                        onChange={(e) => setLoyaltyData(prev => ({ ...prev, silverThreshold: parseFloat(e.target.value) }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('store.loyalty.silverDiscount')}</label>
                                    <input
                                        type="number"
                                        value={loyaltyData.silverDiscount}
                                        onChange={(e) => setLoyaltyData(prev => ({ ...prev, silverDiscount: parseFloat(e.target.value) }))}
                                    />
                                </div>
                            </div>
                            <div className="grid-2" style={{ marginTop: '1rem' }}>
                                <div className="form-group">
                                    <label>{t('store.loyalty.goldThreshold')}</label>
                                    <input
                                        type="number"
                                        value={loyaltyData.goldThreshold}
                                        onChange={(e) => setLoyaltyData(prev => ({ ...prev, goldThreshold: parseFloat(e.target.value) }))}
                                    />
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', height: '100%' }}>
                                    <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={loyaltyData.goldFreeDelivery}
                                            onChange={(e) => setLoyaltyData(prev => ({ ...prev, goldFreeDelivery: e.target.checked }))}
                                        />
                                        <span>{t('store.loyalty.goldFreeDelivery')}</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Images & Socials */}
                <div className="form-column">
                    <div className="form-section glass">
                        <h2><Upload size={20} /> {t('store.images')}</h2>

                        <div className="form-group logo-uploader">
                            <label>{t('store.logo')}</label>
                            <div className="image-upload-area" onClick={() => document.getElementById('logo-input').click()}>
                                {storeData.logo ? (
                                    <>
                                        <img src={storeData.logo} alt="Logo" />
                                        <div className="upload-overlay">
                                            <span className="upload-btn-mini"><Upload size={14} /> {t('store.change')}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="upload-placeholder">
                                        <Upload size={24} />
                                        <span>{t('store.uploadLogo')}</span>
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
                            <label>{t('store.cover')}</label>
                            <div className="image-upload-area cover-uploader" onClick={() => document.getElementById('cover-input').click()}>
                                {storeData.cover ? (
                                    <>
                                        <img src={storeData.cover} alt="Cover" />
                                        <div className="upload-overlay">
                                            <span className="upload-btn-mini"><Upload size={14} /> {t('store.change')}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="upload-placeholder">
                                        <Upload size={24} />
                                        <span>{t('store.uploadCover')}</span>
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
                        <h2><Globe size={20} /> {t('store.socialLinks')}</h2>
                        <div className="social-inputs">
                            <div className="social-input-group">
                                <div className="social-icon" style={{ color: '#E1306C' }}>
                                    <Instagram size={20} />
                                </div>
                                <input
                                    type="text"
                                    name="instagram"
                                    value={storeData.social?.instagram || ''}
                                    onChange={(e) => handleInputChange(e, 'social')}
                                    placeholder={t('store.instagramPlaceholder')}
                                />
                            </div>
                            <div className="social-input-group">
                                <div className="social-icon" style={{ color: '#000000' }}>
                                    {/* Custom TikTok Icon */}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    name="tiktok"
                                    value={storeData.social?.tiktok || ''}
                                    onChange={(e) => handleInputChange(e, 'social')}
                                    placeholder={t('store.tiktokPlaceholder')}
                                />
                            </div>
                            <div className="social-input-group">
                                <div className="social-icon" style={{ color: '#25D366' }}>
                                    {/* Custom WhatsApp Icon */}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    name="whatsapp"
                                    value={storeData.social?.whatsapp || ''}
                                    onChange={(e) => handleInputChange(e, 'social')}
                                    placeholder={t('store.whatsappPlaceholder')}
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
                    <span>{t('store.saveChanges')}</span>
                </button>
            </div>
        </div >
    );
};

export default StoreManager;
