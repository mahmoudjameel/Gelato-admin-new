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
        deliveryZones: [], // مناطق التوصيل: اسم + إحداثيات (مستطيل) + سعر: { name, latMin, latMax, lngMin, lngMax, fee, isActive }
        deliveryCityFees: [], // رسوم حسب المدينة: { cityNameAr, cityNameHe, fee, isActive }
        paymentMethodsEnabled: { cash: true, card: true }
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

    const [geocodeLoadingIndex, setGeocodeLoadingIndex] = useState(null);
    /** قائمة نتائج البحث لكل صف: { [zoneIndex]: [{ display_name, boundingbox }, ...] } */
    const [geocodeResultsByZone, setGeocodeResultsByZone] = useState({});

    /** جلب عناوين/أماكن من اسم المكان وعرض قائمة للاختيار */
    const fetchCoordsForZone = async (index) => {
        const zones = [...(storeData.deliveryZones || [])];
        const zone = zones[index];
        const query = (zone?.name || '').trim();
        if (!query) {
            alert(t('store.enterZoneNameFirst'));
            return;
        }
        setGeocodeLoadingIndex(index);
        setGeocodeResultsByZone(prev => ({ ...prev, [index]: [] }));
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&countrycodes=il`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'GelatoHouse-Admin/1.0' }
            });
            if (!res.ok) throw new Error('Network error');
            const data = await res.json();
            if (!data || data.length === 0) {
                alert(t('store.coordsNotFound'));
                setGeocodeLoadingIndex(null);
                return;
            }
            setGeocodeResultsByZone(prev => ({ ...prev, [index]: data }));
        } catch (err) {
            console.error(err);
            alert(t('store.coordsFetchError'));
        } finally {
            setGeocodeLoadingIndex(null);
        }
    };

    /** عند اختيار عنوان من القائمة: تعبئة الإحداثيات وإغلاق القائمة */
    const applyGeocodeResult = (zoneIndex, result) => {
        const bbox = result.boundingbox; // [south, north, west, east]
        const latMin = parseFloat(bbox[0]);
        const latMax = parseFloat(bbox[1]);
        const lngMin = parseFloat(bbox[2]);
        const lngMax = parseFloat(bbox[3]);
        const zones = [...(storeData.deliveryZones || [])];
        zones[zoneIndex] = {
            ...zones[zoneIndex],
            name: result.display_name || zones[zoneIndex].name,
            latMin,
            latMax,
            lngMin,
            lngMax
        };
        setStoreData(prev => ({ ...prev, deliveryZones: zones }));
        setGeocodeResultsByZone(prev => ({ ...prev, [zoneIndex]: [] }));
    };

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
                const hasOldZonesByCoords = Array.isArray(data.deliveryZonesByCoords) && data.deliveryZonesByCoords.length > 0;
                const zonesEmptyOrOld = !Array.isArray(data.deliveryZones) || data.deliveryZones.length === 0 ||
                    (data.deliveryZones[0] && 'radiusKm' in data.deliveryZones[0]);
                const deliveryZones = (hasOldZonesByCoords && zonesEmptyOrOld)
                    ? data.deliveryZonesByCoords
                    : (data.deliveryZones || []);
                setStoreData(prev => ({
                    ...prev,
                    ...data,
                    deliveryZones,
                    nameAr: data.nameAr || data.name || '',
                    descriptionAr: data.descriptionAr || data.description || '',
                    addressAr: data.addressAr || data.address || '',
                    workingHoursAr: data.workingHoursAr || data.workingHours || '',
                    locationUrl: data.locationUrl || prev.locationUrl || '',
                    googleMapsUrl: data.googleMapsUrl || prev.googleMapsUrl || '',
                    wazeUrl: data.wazeUrl || prev.wazeUrl || '',
                    location: data.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number'
                        ? data.location
                        : (prev.location || { lat: 0, lng: 0 }),
                    paymentMethodsEnabled: data.paymentMethodsEnabled && typeof data.paymentMethodsEnabled.cash === 'boolean' && typeof data.paymentMethodsEnabled.card === 'boolean'
                        ? data.paymentMethodsEnabled
                        : (prev.paymentMethodsEnabled || { cash: true, card: true })
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

    const isValidMapUrl = (val) => {
        if (!val || typeof val !== 'string') return false;
        const v = val.trim();
        return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('waze://') || v.startsWith('geo:');
    };

    const generateMapLinksFromCoords = () => {
        const lat = storeData.location?.lat;
        const lng = storeData.location?.lng;
        if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
            alert(t('store.enterCoordsFirst'));
            return;
        }
        setStoreData(prev => ({
            ...prev,
            googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
            wazeUrl: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        }));
    };

    /** إزالة القيم undefined من الكائن لأن Firestore لا يقبلها */
    const stripUndefined = (obj) => {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) return obj.map((item) => stripUndefined(item)).filter((item) => item !== undefined);
        if (typeof obj !== 'object') return obj;
        const out = {};
        for (const key of Object.keys(obj)) {
            const v = obj[key];
            if (v !== undefined) out[key] = stripUndefined(v);
        }
        return out;
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const toSave = { ...storeData };
            if (!isValidMapUrl(toSave.googleMapsUrl)) toSave.googleMapsUrl = '';
            if (!isValidMapUrl(toSave.wazeUrl)) toSave.wazeUrl = '';
            if (!isValidMapUrl(toSave.locationUrl)) toSave.locationUrl = '';

            // Save Store Profile (strip undefined so Firestore accepts the document)
            const storePayload = stripUndefined({ ...toSave, updatedAt: new Date() });
            await setDoc(doc(db, 'store', 'profile'), storePayload, { merge: true });
            setStoreData(prev => ({ ...prev, ...toSave }));

            // Save Loyalty Settings (strip undefined)
            const loyaltyPayload = stripUndefined({ ...loyaltyData, updatedAt: new Date() });
            await setDoc(doc(db, 'settings', 'loyalty'), loyaltyPayload, { merge: true });

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
                                    type="url"
                                    name="googleMapsUrl"
                                    value={storeData.googleMapsUrl || ''}
                                    onChange={handleInputChange}
                                    placeholder={t('store.googleMapsPlaceholder')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('store.wazeUrl')}</label>
                                <input
                                    type="url"
                                    name="wazeUrl"
                                    value={storeData.wazeUrl || ''}
                                    onChange={handleInputChange}
                                    placeholder={t('store.wazePlaceholder')}
                                />
                                <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                                    {t('store.wazeUrlHelp')}
                                </small>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={generateMapLinksFromCoords}
                            style={{ marginTop: '0.5rem' }}
                        >
                            {t('store.generateMapLinks')}
                        </button>

                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>{t('store.paymentMethodsShown')}</h3>
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>{t('store.paymentMethodsShownHelp')}</p>
                            <div className="grid-2" style={{ gap: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={storeData.paymentMethodsEnabled?.cash !== false}
                                        onChange={(e) => setStoreData(prev => ({
                                            ...prev,
                                            paymentMethodsEnabled: { ...(prev.paymentMethodsEnabled || { cash: true, card: true }), cash: e.target.checked }
                                        }))}
                                    />
                                    <span>{t('store.paymentCash')}</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={storeData.paymentMethodsEnabled?.card !== false}
                                        onChange={(e) => setStoreData(prev => ({
                                            ...prev,
                                            paymentMethodsEnabled: { ...(prev.paymentMethodsEnabled || { cash: true, card: true }), card: e.target.checked }
                                        }))}
                                    />
                                    <span>{t('store.paymentCard')}</span>
                                </label>
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
                            <h2><MapPin size={20} /> {t('store.deliveryZones')}</h2>
                            <p className="section-helper">{t('store.zonesByCoordsHelper')}</p>
                        </div>
                        <div className="delivery-rates-list">
                            {(storeData.deliveryZones || []).map((zone, index) => (
                                <div key={index} className="rate-row" style={{ alignItems: 'flex-end', paddingBottom: '1rem', borderBottom: '1px solid #eee', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div className="rate-field" style={{ flex: '1 1 180px', position: 'relative' }}>
                                        <label>{t('store.zoneName')}</label>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <input
                                                placeholder={t('store.zoneNamePlaceholder')}
                                                value={zone.name || ''}
                                                onChange={(e) => {
                                                    const arr = [...(storeData.deliveryZones || [])];
                                                    arr[index] = { ...arr[index], name: e.target.value };
                                                    setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                                }}
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                title={t('store.fetchCoordsFromName')}
                                                onClick={() => fetchCoordsForZone(index)}
                                                disabled={geocodeLoadingIndex !== null}
                                                style={{
                                                    padding: '6px 10px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #059669',
                                                    background: '#ECFDF5',
                                                    color: '#059669',
                                                    cursor: geocodeLoadingIndex !== null ? 'not-allowed' : 'pointer',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                {geocodeLoadingIndex === index ? <Loader size={14} className="spin" /> : <MapPin size={14} />}
                                                {geocodeLoadingIndex === index ? t('store.fetchingCoords') : t('store.fetchCoordsBtn')}
                                            </button>
                                        </div>
                                        {(geocodeResultsByZone[index] || []).length > 0 && (
                                            <ul
                                                className="geocode-results-list"
                                                style={{
                                                    listStyle: 'none',
                                                    margin: '6px 0 0',
                                                    padding: '6px 0',
                                                    background: '#fff',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '10px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                    maxHeight: '220px',
                                                    overflowY: 'auto',
                                                    position: 'relative',
                                                    zIndex: 10
                                                }}
                                            >
                                                {(geocodeResultsByZone[index] || []).map((result, i) => (
                                                    <li
                                                        key={i}
                                                        onClick={() => applyGeocodeResult(index, result)}
                                                        style={{
                                                            padding: '10px 12px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8125rem',
                                                            borderBottom: i < geocodeResultsByZone[index].length - 1 ? '1px solid #eee' : 'none'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#ECFDF5';
                                                            e.currentTarget.style.color = '#059669';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = '';
                                                            e.currentTarget.style.color = '';
                                                        }}
                                                    >
                                                        {result.display_name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="rate-field" style={{ flex: '0 1 90px' }}>
                                        <label>{t('store.latMin')}</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="32.1"
                                            value={zone.latMin ?? ''}
                                            onChange={(e) => {
                                                const arr = [...(storeData.deliveryZones || [])];
                                                arr[index] = { ...arr[index], latMin: parseFloat(e.target.value) };
                                                setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                            }}
                                        />
                                    </div>
                                    <div className="rate-field" style={{ flex: '0 1 90px' }}>
                                        <label>{t('store.latMax')}</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="32.2"
                                            value={zone.latMax ?? ''}
                                            onChange={(e) => {
                                                const arr = [...(storeData.deliveryZones || [])];
                                                arr[index] = { ...arr[index], latMax: parseFloat(e.target.value) };
                                                setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                            }}
                                        />
                                    </div>
                                    <div className="rate-field" style={{ flex: '0 1 90px' }}>
                                        <label>{t('store.lngMin')}</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="34.8"
                                            value={zone.lngMin ?? ''}
                                            onChange={(e) => {
                                                const arr = [...(storeData.deliveryZones || [])];
                                                arr[index] = { ...arr[index], lngMin: parseFloat(e.target.value) };
                                                setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                            }}
                                        />
                                    </div>
                                    <div className="rate-field" style={{ flex: '0 1 90px' }}>
                                        <label>{t('store.lngMax')}</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="35.0"
                                            value={zone.lngMax ?? ''}
                                            onChange={(e) => {
                                                const arr = [...(storeData.deliveryZones || [])];
                                                arr[index] = { ...arr[index], lngMax: parseFloat(e.target.value) };
                                                setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                            }}
                                        />
                                    </div>
                                    <div className="rate-field" style={{ flex: '0 1 70px' }}>
                                        <label>{t('store.zoneFee')}</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="20"
                                            value={zone.fee ?? ''}
                                            onChange={(e) => {
                                                const arr = [...(storeData.deliveryZones || [])];
                                                arr[index] = { ...arr[index], fee: parseFloat(e.target.value) || 0 };
                                                setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                            }}
                                        />
                                    </div>
                                    <div className="rate-field" style={{ flex: '0 0 36px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '10px' }}>
                                        <label className="switch-label" title={zone.isActive !== false ? t('store.active') : t('store.inactive')}>
                                            <input
                                                type="checkbox"
                                                checked={zone.isActive !== false}
                                                onChange={(e) => {
                                                    const arr = [...(storeData.deliveryZones || [])];
                                                    arr[index] = { ...arr[index], isActive: e.target.checked };
                                                    setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                                }}
                                            />
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        className="remove-rate-btn"
                                        title={t('store.deleteZone')}
                                        onClick={() => setStoreData(prev => ({ ...prev, deliveryZones: (prev.deliveryZones || []).filter((_, i) => i !== index) }))}
                                        style={{ backgroundColor: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>×</span>
                                    </button>
                                    <div style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669', marginBottom: '0.5rem' }}>{t('store.zoneOfferSection')}</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
                                            <div className="rate-field" style={{ flex: '1 1 100px' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#374151' }}>{t('store.zoneFreeDeliveryAbove')}</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    placeholder={t('store.zoneFreeDeliveryAbovePlaceholder')}
                                                    value={zone.freeDeliveryAbove ?? ''}
                                                    onChange={(e) => {
                                                        const arr = [...(storeData.deliveryZones || [])];
                                                        const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                                        arr[index] = { ...arr[index], freeDeliveryAbove: v };
                                                        setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                                    }}
                                                />
                                            </div>
                                            <div className="rate-field" style={{ flex: '1 1 220px' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#374151' }}>{t('store.zoneOfferLabelAr')}</label>
                                                <input
                                                    type="text"
                                                    placeholder={t('store.zoneOfferLabelArPlaceholder')}
                                                    value={zone.offerLabelAr ?? ''}
                                                    onChange={(e) => {
                                                        const arr = [...(storeData.deliveryZones || [])];
                                                        arr[index] = { ...arr[index], offerLabelAr: e.target.value };
                                                        setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                                    }}
                                                />
                                            </div>
                                            <div className="rate-field" style={{ flex: '1 1 220px' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#374151' }}>{t('store.zoneOfferLabelHe')}</label>
                                                <input
                                                    type="text"
                                                    placeholder={t('store.zoneOfferLabelHePlaceholder')}
                                                    value={zone.offerLabelHe ?? ''}
                                                    onChange={(e) => {
                                                        const arr = [...(storeData.deliveryZones || [])];
                                                        arr[index] = { ...arr[index], offerLabelHe: e.target.value };
                                                        setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="add-rate-btn"
                                onClick={() => setStoreData(prev => ({
                                    ...prev,
                                    deliveryZones: [...(prev.deliveryZones || []), { name: '', fee: 0, isActive: true, offerLabelAr: '', offerLabelHe: '' }]
                                }))}
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '12px',
                                    border: '1px dashed #059669',
                                    color: '#059669',
                                    background: '#ECFDF5',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {t('store.addZoneByCoords')}
                            </button>
                        </div>
                    </div>

                    <div className="form-section glass">
                        <div className="section-header-box">
                            <h2><BadgeDollarSign size={20} /> {t('store.deliveryCityFees')}</h2>
                            <p className="section-helper">{t('store.cityFeesHelper')}</p>
                        </div>
                        <div className="delivery-rates-list">
                            {(storeData.deliveryCityFees || []).map((row, index) => (
                                <div key={`city-${index}`} className="rate-row" style={{ alignItems: 'flex-end', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                                    <div className="rate-field" style={{ flex: 2 }}>
                                        <label>{t('store.cityName')}</label>
                                        <input
                                            placeholder={t('store.cityNamePlaceholder')}
                                            value={row.cityNameAr || ''}
                                            onChange={(e) => {
                                                const arr = [...(storeData.deliveryCityFees || [])];
                                                arr[index] = { ...arr[index], cityNameAr: e.target.value };
                                                setStoreData(prev => ({ ...prev, deliveryCityFees: arr }));
                                            }}
                                        />
                                    </div>
                                    <div className="rate-field" style={{ flex: 1.5 }}>
                                        <label>{t('store.cityNameHe')}</label>
                                        <input
                                            placeholder={t('store.cityNameHePlaceholder')}
                                            value={row.cityNameHe || ''}
                                            onChange={(e) => {
                                                const arr = [...(storeData.deliveryCityFees || [])];
                                                arr[index] = { ...arr[index], cityNameHe: e.target.value };
                                                setStoreData(prev => ({ ...prev, deliveryCityFees: arr }));
                                            }}
                                        />
                                    </div>
                                    <div className="rate-field">
                                        <label>{t('store.zoneFee')}</label>
                                        <input
                                            type="number"
                                            placeholder="18"
                                            value={row.fee ?? ''}
                                            onChange={(e) => {
                                                const arr = [...(storeData.deliveryCityFees || [])];
                                                arr[index] = { ...arr[index], fee: parseFloat(e.target.value) || 0 };
                                                setStoreData(prev => ({ ...prev, deliveryCityFees: arr }));
                                            }}
                                        />
                                    </div>
                                    <div className="rate-field" style={{ flex: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '10px' }}>
                                        <label className="switch-label" title={row.isActive !== false ? t('store.active') : t('store.inactive')}>
                                            <input
                                                type="checkbox"
                                                checked={row.isActive !== false}
                                                onChange={(e) => {
                                                    const arr = [...(storeData.deliveryCityFees || [])];
                                                    arr[index] = { ...arr[index], isActive: e.target.checked };
                                                    setStoreData(prev => ({ ...prev, deliveryCityFees: arr }));
                                                }}
                                            />
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        className="remove-rate-btn"
                                        title={t('store.deleteCityFee')}
                                        onClick={() => setStoreData(prev => ({ ...prev, deliveryCityFees: (prev.deliveryCityFees || []).filter((_, i) => i !== index) }))}
                                        style={{ backgroundColor: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>×</span>
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="add-rate-btn"
                                onClick={() => setStoreData(prev => ({
                                    ...prev,
                                    deliveryCityFees: [...(prev.deliveryCityFees || []), { cityNameAr: '', cityNameHe: '', fee: 0, isActive: true }]
                                }))}
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '12px',
                                    border: '1px dashed #0EA5E9',
                                    color: '#0EA5E9',
                                    background: '#F0F9FF',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {t('store.addCityFee')}
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
