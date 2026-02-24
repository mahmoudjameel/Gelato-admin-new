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
    Trophy,
    Crosshair
} from 'lucide-react';
import { db, storage } from '../firebase/config';
import ZoneMap from '../components/ZoneMap';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTranslation } from 'react-i18next';
import './StoreManager.css';

const StoreManager = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: t('store.tabs.general', 'General'), icon: <Store size={20} /> },
        { id: 'contact', label: t('store.tabs.contact', 'Location'), icon: <MapPin size={20} /> },
        { id: 'hours', label: t('store.tabs.hours', 'Working Hours'), icon: <Clock size={20} /> },
        { id: 'delivery', label: t('store.tabs.delivery', 'Delivery'), icon: <BadgeDollarSign size={20} /> },
        { id: 'payment', label: t('store.tabs.payment', 'Payment & Loyalty'), icon: <Trophy size={20} /> },
    ];
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
        deliveryZones: [],
        deliveryCityFees: [],
        paymentMethodsEnabled: { cash: true, card: true },
        isManualClosed: false,
        pickupHours: {},
        deliveryHours: {}
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
    const [geocodeResultsByZone, setGeocodeResultsByZone] = useState({});
    const [activeMapIndex, setActiveMapIndex] = useState(null);

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

    const applyGeocodeResult = (zoneIndex, result) => {
        const zones = [...(storeData.deliveryZones || [])];
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);

        zones[zoneIndex] = {
            ...zones[zoneIndex],
            name: result.display_name || zones[zoneIndex].name,
            lat: newLat,
            lng: newLng,
            // Keep bounding box for compatibility if needed, though we use circles now
            latMin: parseFloat(result.boundingbox[0]),
            latMax: parseFloat(result.boundingbox[1]),
            lngMin: parseFloat(result.boundingbox[2]),
            lngMax: parseFloat(result.boundingbox[3])
        };

        setStoreData(prev => ({ ...prev, deliveryZones: zones }));
        setGeocodeResultsByZone(prev => ({ ...prev, [zoneIndex]: [] }));
        // Automatically open the map for this zone
        setActiveMapIndex(zoneIndex);
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
                        : (prev.paymentMethodsEnabled || { cash: true, card: true }),
                    isManualClosed: data.isManualClosed || false,
                    pickupHours: data.pickupHours || data.workingHoursWeekly || {},
                    deliveryHours: data.deliveryHours || data.workingHoursWeekly || {}
                }));
            }

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

    const handleWeeklyHoursChange = (type, day, field, value) => {
        const hoursKey = type === 'pickup' ? 'pickupHours' : 'deliveryHours';
        setStoreData(prev => ({
            ...prev,
            [hoursKey]: {
                ...prev[hoursKey],
                [day]: { ...prev[hoursKey][day], [field]: value }
            }
        }));
    };

    const TimeInput12h = ({ value, onChange, disabled }) => {
        const hours = Array.from({ length: 12 }, (_, i) => i + 1);
        const minutes = ['00', '15', '30', '45'];
        const periods = [t('store.am'), t('store.pm')];

        const parseValue = (val) => {
            if (!val) return { h: '10', m: '00', p: t('store.am') };
            const [h24, m] = val.split(':');
            let h = parseInt(h24, 10);
            const p = h >= 12 ? t('store.pm') : t('store.am');
            h = h % 12 || 12;
            return { h: h.toString(), m, p };
        };

        const { h, m, p } = parseValue(value);

        const handleChange = (part, newVal) => {
            let newH = part === 'h' ? newVal : h;
            let newM = part === 'm' ? newVal : m;
            let newP = part === 'p' ? newVal : p;

            let h24 = parseInt(newH, 10);
            if (newP === t('store.pm') && h24 !== 12) h24 += 12;
            if (newP === t('store.am') && h24 === 12) h24 = 0;

            const finalValue = `${h24.toString().padStart(2, '0')}:${newM}`;
            onChange(finalValue);
        };

        return (
            <div className={`time-picker-12h ${disabled ? 'disabled' : ''}`}>
                <select value={h} onChange={(e) => handleChange('h', e.target.value)} disabled={disabled}>
                    {hours.map(val => <option key={val} value={val}>{val}</option>)}
                </select>
                <select value={m} onChange={(e) => handleChange('m', e.target.value)} disabled={disabled}>
                    {minutes.map(val => <option key={val} value={val}>{val}</option>)}
                </select>
                <select value={p} onChange={(e) => handleChange('p', e.target.value)} disabled={disabled}>
                    {periods.map(val => <option key={val} value={val}>{val}</option>)}
                </select>
            </div>
        );
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

    const generateMapLinksFromCoords = async () => {
        let lat = storeData.location?.lat;
        let lng = storeData.location?.lng;

        // If coordinates are missing, try to geocode the address first
        if (!lat || !lng || lat === 0 || lng === 0) {
            const address = storeData.addressAr || storeData.addressHe;
            if (!address) {
                alert(t('store.enterAddressOrCoordsFirst', 'Please enter store address or coordinates first'));
                return;
            }

            try {
                setSaving(true);
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=il`;
                const res = await fetch(url, { headers: { 'User-Agent': 'GelatoHouse-Admin/1.0' } });
                const data = await res.json();

                if (data && data.length > 0) {
                    lat = parseFloat(data[0].lat);
                    lng = parseFloat(data[0].lon);
                    setStoreData(prev => ({
                        ...prev,
                        location: { lat, lng }
                    }));
                } else {
                    alert(t('store.addressNotFound', 'Could not find coordinates for this address. Please enter them manually.'));
                    setSaving(false);
                    return;
                }
            } catch (err) {
                console.error(err);
                alert(t('store.geocodingError', 'Error fetching coordinates.'));
                setSaving(false);
                return;
            } finally {
                setSaving(false);
            }
        }

        setStoreData(prev => ({
            ...prev,
            googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
            wazeUrl: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        }));
    };

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

            const storePayload = stripUndefined({ ...toSave, updatedAt: new Date() });
            await setDoc(doc(db, 'store', 'profile'), storePayload, { merge: true });
            setStoreData(prev => ({ ...prev, ...toSave }));

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

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert(t('store.geolocationNotSupported', 'Geolocation is not supported by your browser.'));
            return;
        }

        setSaving(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setStoreData(prev => ({
                    ...prev,
                    location: {
                        lat: parseFloat(latitude.toFixed(7)),
                        lng: parseFloat(longitude.toFixed(7))
                    }
                }));
                setSaving(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert(t('store.geolocationError', 'Error getting your current location. Please check browser permissions.'));
                setSaving(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
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

            <div className="store-tabs glass">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="store-form">
                {activeTab === 'general' && (
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
                )}

                {activeTab === 'contact' && (
                    <>
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
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleGetCurrentLocation}
                                style={{
                                    marginTop: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    width: '100%',
                                    backgroundColor: '#A62B82',
                                    color: 'white',
                                    borderColor: '#A62B82'
                                }}
                            >
                                <Crosshair size={18} />
                                {t('store.getCurrentLocation')}
                            </button>
                        </div>
                    </>
                )}

                {activeTab === 'hours' && (
                    <div className="form-section glass">
                        <div className="section-header-row">
                            <h2><Clock size={20} /> {t('store.detailedWorkingHours')}</h2>
                            <div className="manual-toggles-container">
                                <div className="manual-close-toggle">
                                    <label className="switch-label">
                                        <input
                                            type="checkbox"
                                            checked={storeData.isManualClosed}
                                            onChange={(e) => setStoreData(prev => ({ ...prev, isManualClosed: e.target.checked }))}
                                        />
                                        <span className="switch-slider"></span>
                                        <span className="switch-text">{t('store.manualClose', 'Close Store (Total)')}</span>
                                    </label>
                                </div>
                                <div className="manual-close-toggle">
                                    <label className="switch-label">
                                        <input
                                            type="checkbox"
                                            checked={storeData.isDeliveryManualClosed}
                                            onChange={(e) => setStoreData(prev => ({ ...prev, isDeliveryManualClosed: e.target.checked }))}
                                        />
                                        <span className="switch-slider"></span>
                                        <span className="switch-text">{t('store.manualDeliveryClose', 'Close Delivery (Only)')}</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="hours-type-tabs">
                            <button
                                className={`type-tab ${!storeData._hoursType || storeData._hoursType === 'pickup' ? 'active' : ''}`}
                                onClick={() => setStoreData(prev => ({ ...prev, _hoursType: 'pickup' }))}
                            >
                                {t('store.pickupHours', 'Pickup Hours')}
                            </button>
                            <button
                                className={`type-tab ${storeData._hoursType === 'delivery' ? 'active' : ''}`}
                                onClick={() => setStoreData(prev => ({ ...prev, _hoursType: 'delivery' }))}
                            >
                                {t('store.deliveryHours', 'Delivery Hours')}
                            </button>
                        </div>

                        <div className="weekly-hours-grid">
                            {(() => {
                                const type = storeData._hoursType || 'pickup';
                                const hoursKey = type === 'pickup' ? 'pickupHours' : 'deliveryHours';
                                const hours = storeData[hoursKey] || {};
                                const daysOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

                                return daysOrder.map(day => {
                                    const dayInfo = hours[day] || { open: '10:00', close: '22:00', closed: false };
                                    return (
                                        <div className="day-row-container" key={day}>
                                            <div className="day-row">
                                                <span className="day-name">{dayLabels[day]}</span>
                                                <div className="time-inputs-12h">
                                                    <TimeInput12h
                                                        value={dayInfo.open}
                                                        onChange={(val) => handleWeeklyHoursChange(type, day, 'open', val)}
                                                        disabled={dayInfo.closed}
                                                    />
                                                    <span className="to-label">{t('store.to')}</span>
                                                    <TimeInput12h
                                                        value={dayInfo.close}
                                                        onChange={(val) => handleWeeklyHoursChange(type, day, 'close', val)}
                                                        disabled={dayInfo.closed}
                                                    />
                                                    <label className="closed-toggle">
                                                        <input
                                                            type="checkbox"
                                                            checked={dayInfo.closed}
                                                            onChange={(e) => handleWeeklyHoursChange(type, day, 'closed', e.target.checked)}
                                                        />
                                                        {t('store.closed')}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                )}

                {activeTab === 'delivery' && (
                    <>
                        <div className="form-section glass">
                            <h2><BadgeDollarSign size={20} /> {t('store.delivery')}</h2>
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
                                                <ul className="geocode-results-list" style={{ listStyle: 'none', margin: '6px 0 0', padding: '6px 0', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '220px', overflowY: 'auto', position: 'relative', zIndex: 10 }}>
                                                    {(geocodeResultsByZone[index] || []).map((result, i) => (
                                                        <li
                                                            key={i}
                                                            onClick={() => applyGeocodeResult(index, result)}
                                                            style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '0.8125rem', borderBottom: i < geocodeResultsByZone[index].length - 1 ? '1px solid #eee' : 'none' }}
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
                                                value={zone.fee ?? ''}
                                                onChange={(e) => {
                                                    const arr = [...(storeData.deliveryZones || [])];
                                                    arr[index] = { ...arr[index], fee: parseFloat(e.target.value) || 0 };
                                                    setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                                }}
                                            />
                                        </div>

                                        <div className="rate-field" style={{ flex: '0 1 100px' }}>
                                            <label>{t('store.latitude')}</label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={zone.lat ?? ''}
                                                onChange={(e) => {
                                                    const arr = [...(storeData.deliveryZones || [])];
                                                    arr[index] = { ...arr[index], lat: parseFloat(e.target.value) || 0 };
                                                    setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                                }}
                                            />
                                        </div>
                                        <div className="rate-field" style={{ flex: '0 1 100px' }}>
                                            <label>{t('store.longitude')}</label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={zone.lng ?? ''}
                                                onChange={(e) => {
                                                    const arr = [...(storeData.deliveryZones || [])];
                                                    arr[index] = { ...arr[index], lng: parseFloat(e.target.value) || 0 };
                                                    setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                                }}
                                            />
                                        </div>
                                        <div className="rate-field" style={{ flex: '0 1 100px' }}>
                                            <label>{t('store.zoneRadius')} (m)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                value={zone.radius ?? ''}
                                                onChange={(e) => {
                                                    const arr = [...(storeData.deliveryZones || [])];
                                                    arr[index] = { ...arr[index], radius: parseInt(e.target.value) || 0 };
                                                    setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                                }}
                                            />
                                        </div>
                                        <div className="rate-field" style={{ flex: '0 0 36px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '10px' }}>
                                            <label className="switch-label">
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
                                            className="btn-secondary"
                                            onClick={() => setActiveMapIndex(activeMapIndex === index ? null : index)}
                                            style={{
                                                flex: '0 0 auto',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                backgroundColor: activeMapIndex === index ? '#A62B82' : '#F3F4F6',
                                                color: activeMapIndex === index ? 'white' : '#A62B82',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                border: '1px solid #A62B82'
                                            }}
                                        >
                                            {activeMapIndex === index ? t('store.closeMap') : t('store.editOnMap')}
                                        </button>
                                        <button
                                            type="button"
                                            className="remove-rate-btn"
                                            onClick={() => setStoreData(prev => ({ ...prev, deliveryZones: (prev.deliveryZones || []).filter((_, i) => i !== index) }))}
                                            style={{ backgroundColor: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            ×
                                        </button>
                                        <div style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669', marginBottom: '0.5rem' }}>{t('store.zoneOfferSection')}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
                                                <div className="rate-field" style={{ flex: '1 1 100px' }}>
                                                    <label style={{ fontSize: '0.75rem', color: '#374151' }}>{t('store.zoneFreeDeliveryAbove')}</label>
                                                    <input
                                                        type="number"
                                                        step="any"
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

                                        {activeMapIndex === index && (
                                            <div style={{ width: '100%', marginTop: '1rem' }}>
                                                <ZoneMap
                                                    center={{ lat: zone.lat || 31.7683, lng: zone.lng || 35.2137 }}
                                                    radius={zone.radius || 1000}
                                                    otherZones={(storeData.deliveryZones || []).filter((_, i) => i !== index)}
                                                    onUpdate={(data) => {
                                                        const arr = [...(storeData.deliveryZones || [])];
                                                        arr[index] = {
                                                            ...arr[index],
                                                            lat: data.lat,
                                                            lng: data.lng,
                                                            radius: data.radius
                                                        };
                                                        setStoreData(prev => ({ ...prev, deliveryZones: arr }));
                                                    }}
                                                    t={t}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="add-rate-btn"
                                    onClick={() => setStoreData(prev => ({
                                        ...prev,
                                        deliveryZones: [...(prev.deliveryZones || []), { name: '', fee: 0, isActive: true, offerLabelAr: '', offerLabelHe: '' }]
                                    }))}
                                    style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px dashed #059669', color: '#059669', background: '#ECFDF5', cursor: 'pointer', fontWeight: 'bold', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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
                                                value={row.fee ?? ''}
                                                onChange={(e) => {
                                                    const arr = [...(storeData.deliveryCityFees || [])];
                                                    arr[index] = { ...arr[index], fee: parseFloat(e.target.value) || 0 };
                                                    setStoreData(prev => ({ ...prev, deliveryCityFees: arr }));
                                                }}
                                            />
                                        </div>
                                        <div className="rate-field" style={{ flex: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '10px' }}>
                                            <label className="switch-label">
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
                                            onClick={() => setStoreData(prev => ({ ...prev, deliveryCityFees: (prev.deliveryCityFees || []).filter((_, i) => i !== index) }))}
                                            style={{ backgroundColor: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            ×
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
                                    style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px dashed #0EA5E9', color: '#0EA5E9', background: '#F0F9FF', cursor: 'pointer', fontWeight: 'bold', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    {t('store.addCityFee')}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'payment' && (
                    <>
                        <div className="form-section glass">
                            <h2><BadgeDollarSign size={20} /> {t('store.tabs.payment')}</h2>
                            <div style={{ marginTop: '0.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>{t('store.paymentMethodsShown')}</h3>
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
                            <h2><Trophy size={20} /> {t('store.loyalty.title')}</h2>
                            <div className="loyalty-group">
                                <h3>{t('store.loyalty.ratios')}</h3>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label>{t('store.loyalty.currencyPerPoint')}</label>
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
                                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', height: '100%', marginTop: 'auto' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
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
                    </>
                )}

                {activeTab === 'general' && (
                    <>
                        <div className="form-section glass">
                            <h2><Upload size={20} /> {t('store.images')}</h2>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>{t('store.logo')}</label>
                                    <div className="image-upload-area" onClick={() => document.getElementById('logo-input').click()}>
                                        {storeData.logo ? <img src={storeData.logo} alt="Logo" /> : <span>{t('store.uploadLogo')}</span>}
                                        <input id="logo-input" type="file" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('store.cover')}</label>
                                    <div className="image-upload-area" onClick={() => document.getElementById('cover-input').click()}>
                                        {storeData.cover ? <img src={storeData.cover} alt="Cover" /> : <span>{t('store.uploadCover')}</span>}
                                        <input id="cover-input" type="file" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-section glass">
                            <h2><Globe size={20} /> {t('store.socialLinks')}</h2>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Instagram</label>
                                    <input
                                        type="text"
                                        name="instagram"
                                        value={storeData.social?.instagram || ''}
                                        onChange={(e) => handleInputChange(e, 'social')}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>TikTok</label>
                                    <input
                                        type="text"
                                        name="tiktok"
                                        value={storeData.social?.tiktok || ''}
                                        onChange={(e) => handleInputChange(e, 'social')}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>WhatsApp</label>
                                    <input
                                        type="text"
                                        name="whatsapp"
                                        value={storeData.social?.whatsapp || ''}
                                        onChange={(e) => handleInputChange(e, 'social')}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}
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
        </div>
    );
};

export default StoreManager;
