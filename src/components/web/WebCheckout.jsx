import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebCart } from '../../context/WebCartContext';
import { useWebAuth } from '../../context/WebAuthContext';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../firebase/config';
import { useWebStoreData } from '../../hooks/useWebStoreData';
import { getStoreStatus, formatTo12Hour, getWorkingHoursRows, generateSlotsForDay } from '../../utils/storeStatus';
import { ArrowLeft, ArrowRight, MapPin, Loader2, CheckCircle, CreditCard, Banknote, Clock, Tag, X, MapPinned } from 'lucide-react';
import './WebCheckout.css';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const WebCheckout = ({ onClose }) => {
    const { t, i18n } = useTranslation();
    const {
        cartItems,
        subtotal,
        discountAmount,
        effectiveDeliveryFee,
        promoCode,
        applyPromoCode,
        removePromoCode,
        clearCart,
        validateDeliveryLocation,
        deliveryFee,
        deliveryFeeSource,
        zoneOffer
    } = useWebCart();
    const { currentUser, userData, updateUserProfileLocation } = useWebAuth();
    const { storeInfo } = useWebStoreData();

    const [deliveryType, setDeliveryType] = useState('delivery');
    const [addressTitle, setAddressTitle] = useState('');
    const [selectedCity, setSelectedCity] = useState(userData?.city || '');
    const [addressDetails, setAddressDetails] = useState('');
    const [addressPhone, setAddressPhone] = useState(currentUser?.phoneNumber || userData?.phoneNumber || '');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    const [coords, setCoords] = useState({
        lat: userData?.latitude || 0,
        lng: userData?.longitude || 0
    });
    const [isLocating, setIsLocating] = useState(false);

    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const [paymentParams, setPaymentParams] = useState(null);
    const [paymentBaseUrl, setPaymentBaseUrl] = useState('');

    const [scheduleForLater, setScheduleForLater] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('today');
    const [scheduledTime, setScheduledTime] = useState('09:00');
    const [hoursModalVisible, setHoursModalVisible] = useState(false);
    const [zonesModalVisible, setZonesModalVisible] = useState(false);
    const [promoInput, setPromoInput] = useState('');
    const [applyingPromo, setApplyingPromo] = useState(false);
    const [promoMessage, setPromoMessage] = useState('');

    const isRtl = i18n.language === 'ar' || i18n.language === 'he';
    const lang = i18n.language || 'ar';

    const tWeb = (key) => t(`web.${key}`);

    const weeklyHours = storeInfo?.workingHoursWeekly || {};
    const todayKey = DAY_KEYS[new Date().getDay()];
    const tomorrowKey = DAY_KEYS[(new Date().getDay() + 1) % 7];
    const storeStatus = getStoreStatus(storeInfo, (k) => tWeb(k), deliveryType);
    const isStoreOpenNow = storeStatus.status === 'open' || storeStatus.status === 'closing_soon';
    const deliveryTimeText = storeInfo?.deliveryTime?.trim() || (lang === 'he' ? "30-45 דק'" : '30-45 دقيقة');

    const todaySlots = generateSlotsForDay(weeklyHours[todayKey]);
    const tomorrowSlots = generateSlotsForDay(weeklyHours[tomorrowKey]);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const availableTimesToday = todaySlots.filter(s => {
        const slotDate = new Date(todayStart.getTime() + s.offsetMins * 60000);
        return slotDate.getTime() > now.getTime() + 30 * 60000;
    });
    const timeSlotsForPicker = scheduledDate === 'today' ? availableTimesToday : tomorrowSlots;

    useEffect(() => {
        if (scheduledDate === 'today' && availableTimesToday.length > 0) {
            setScheduledTime(availableTimesToday[0].time);
        }
    }, [scheduledDate]);

    const getScheduledForAndLabel = () => {
        if (!scheduleForLater || !scheduledTime) return { scheduledFor: null, scheduledForLabel: '', scheduledPeriod: null };
        const currentDaySlots = scheduledDate === 'today' ? todaySlots : tomorrowSlots;
        const matchedSlot = currentDaySlots.find(s => s.time === scheduledTime);
        if (!matchedSlot) return { scheduledFor: null, scheduledForLabel: '', scheduledPeriod: null };
        const offset = matchedSlot.offsetMins;
        const d = scheduledDate === 'tomorrow'
            ? new Date(todayStart.getTime() + 24 * 3600000 + offset * 60000)
            : new Date(todayStart.getTime() + offset * 60000);
        if (d.getTime() <= now.getTime() + 29 * 60000) return { scheduledFor: null, scheduledForLabel: '', scheduledPeriod: null };
        const dateLabel = scheduledDate === 'tomorrow' ? tWeb('tomorrow') : tWeb('today');
        const hours = Math.floor(offset / 60);
        const periodLabel = hours < 12 ? tWeb('timeMorning') : tWeb('timeEvening');
        const formattedTime = formatTo12Hour(scheduledTime, (k) => t(k));
        const scheduledForLabel = `${dateLabel} - ${periodLabel} ${formattedTime}`;
        const scheduledPeriod = hours < 12 ? 'morning' : 'evening';
        return { scheduledFor: d, scheduledForLabel, scheduledPeriod };
    };
    const { scheduledFor, scheduledForLabel, scheduledPeriod } = getScheduledForAndLabel();

    const totalAmount = Math.max(0, Number(subtotal) - Number(discountAmount) + (deliveryType === 'delivery' ? Number(effectiveDeliveryFee) : 0));
    const canSubmit = isStoreOpenNow || scheduleForLater;
    const scheduleValid = !scheduleForLater || (scheduleForLater && scheduledFor);

    const reverseGeocode = async (lat, lng) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': i18n.language === 'he' ? 'he' : 'ar',
                        'User-Agent': 'CoolTreatHub-WebCheckout/1.0'
                    }
                }
            );
            if (!res.ok) return null;
            const data = await res.json();
            return data?.display_name || null;
        } catch (e) {
            console.warn('Reverse geocode failed:', e);
            return null;
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setError(t('web.geolocationNotSupported'));
            return;
        }

        setIsLocating(true);
        setError('');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setCoords({ lat: latitude, lng: longitude });
                validateDeliveryLocation(latitude, longitude, selectedCity, storeInfo);
                const address = await reverseGeocode(latitude, longitude);
                if (address) setAddressDetails(address);
                setIsLocating(false);
            },
            (err) => {
                console.error("Geolocation error:", err);
                setError(t('web.geolocationError'));
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Sync with user data once it loads
    React.useEffect(() => {
        if (userData || currentUser) {
            if (!addressPhone && (currentUser?.phoneNumber || userData?.phoneNumber)) {
                setAddressPhone(currentUser?.phoneNumber || userData?.phoneNumber || '');
            }
            if (!selectedCity && userData?.city) {
                setSelectedCity(userData.city);
            }
            if (coords.lat === 0 && coords.lng === 0 && userData?.latitude) {
                setCoords({
                    lat: userData.latitude || 0,
                    lng: userData.longitude || 0
                });
            }
        }
    }, [userData, currentUser]);

    useEffect(() => {
        if (deliveryType === 'delivery' && (selectedCity || coords.lat)) {
            validateDeliveryLocation(coords.lat, coords.lng, selectedCity, storeInfo);
        }
    }, [selectedCity, coords.lat, coords.lng, deliveryType, storeInfo]);

    const handleApplyPromo = async () => {
        setPromoMessage('');
        setApplyingPromo(true);
        const res = await applyPromoCode(promoInput.trim(), currentUser?.uid);
        setApplyingPromo(false);
        const msg = t(`web.${res.message}`);
        setPromoMessage(msg);
        if (res.success) setPromoInput('');
    };

    const deliveryCities = storeInfo?.deliveryCityFees?.filter(c => c.isActive !== false) || [];
    const hasCities = deliveryCities.length > 0;

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        if (!currentUser) return; // shouldn't happen but just in case

        if (deliveryType === 'delivery') {
            if (!coords.lat && !selectedCity) {
                setError(t('web.selectLocationError'));
                return;
            }
            if (!addressDetails.trim() || !addressPhone.trim()) {
                setError(t('web.fillDetailsError'));
                return;
            }
        }

        const minOrder = Number(storeInfo?.minOrder || 0);
        if (subtotal < minOrder) {
            setError(t('web.minOrderError', { min: minOrder }));
            return;
        }
        if (!canSubmit) {
            setError(tWeb('closed'));
            return;
        }
        if (scheduleForLater && !scheduledFor) {
            setError(tWeb('selectTime'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const orderNumber = Math.floor(100000 + Math.random() * 900000);

            // Find city names for Ar/He
            let customerCityAr = null;
            let customerCityHe = null;
            if (selectedCity && storeInfo?.deliveryCityFees) {
                const cityObj = storeInfo.deliveryCityFees.find(c =>
                    c.nameAr === selectedCity || c.cityNameAr === selectedCity ||
                    c.nameHe === selectedCity || c.cityNameHe === selectedCity
                );
                if (cityObj) {
                    customerCityAr = cityObj.nameAr || cityObj.cityNameAr;
                    customerCityHe = cityObj.nameHe || cityObj.cityNameHe;
                }
            }

            // Mobile app payload parity
            const orderData = {
                orderNumber,
                userId: currentUser.uid,
                customerName: userData?.displayName || currentUser.displayName || 'Guest User',
                customerPhone: addressPhone || currentUser.phoneNumber || '',
                customerEmail: currentUser.email || '',
                customerCity: selectedCity || null,
                customerCityAr: customerCityAr || null,
                customerCityHe: customerCityHe || null,
                items: cartItems.map(item => ({
                    id: item.productId,
                    name: item.name,
                    nameAr: item.nameAr || item.name,
                    nameHe: item.nameHe || item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image,
                    note: item.note,
                    selectedSize: item.selectedSize ? {
                        name: item.selectedSize.name || '',
                        nameAr: item.selectedSize.nameAr || item.selectedSize.name || '',
                        nameHe: item.selectedSize.nameHe || item.selectedSize.name || '',
                        label: item.selectedSize.name || ''
                    } : null,
                    selectedFlavors: item.selectedFlavors.map(f => {
                        const isObj = typeof f === 'object';
                        return {
                            name: isObj ? f.name : f,
                            nameAr: isObj ? (f.nameAr || f.name) : f,
                            nameHe: isObj ? (f.nameHe || f.name) : f
                        };
                    }),
                    selectedExtras: item.selectedExtras.map(e => ({
                        name: e.name || e.nameAr || e.nameHe || '',
                        nameAr: e.nameAr || e.name || '',
                        nameHe: e.nameHe || e.name || '',
                        image: e.image || null
                    })),
                    classification: null
                })),
                totalAmount: totalAmount.toString(),
                subtotal: subtotal.toFixed(2),
                discountAmount: String(discountAmount.toFixed(2)),
                promoCode: promoCode?.code || null,
                membershipDiscount: '0',
                pointsDiscount: '0',
                pointsRedeemed: 0,
                rewardPointsTotal: 0,
                cashbackRedeemedPoints: 0,
                deliveryFee: deliveryType === 'delivery' ? effectiveDeliveryFee : 0,
                deliveryType: deliveryType,
                paymentMethod: paymentMethod,
                status: 'pending',
                createdAt: new Date(),
                address: deliveryType === 'delivery' ? {
                    title: addressTitle || t('web.home'),
                    details: addressDetails,
                    phone: addressPhone,
                    city: selectedCity,
                    latitude: coords.lat,
                    longitude: coords.lng,
                } : null,
                deliveryAddress: deliveryType === 'delivery' ? {
                    title: addressTitle || t('web.home'),
                    details: addressDetails,
                    phone: addressPhone,
                    city: selectedCity,
                    latitude: coords.lat,
                    longitude: coords.lng,
                } : t('web.pickupFromBranch'),
                scheduledFor: scheduledFor ? Timestamp.fromDate(scheduledFor) : null,
                scheduledForLabel: scheduledForLabel || null,
                scheduledPeriod: scheduledPeriod || null,
                source: 'web'
            };

            const docRef = await addDoc(collection(db, 'orders'), orderData);

            if (paymentMethod === 'card') {
                try {
                    const functions = getFunctions();
                    const callable = httpsCallable(functions, 'initializePayment');
                    const result = await callable({
                        orderId: docRef.id,
                        amount: totalAmount,
                        currency: 'ILS',
                    });

                    if (result.data?.success && result.data?.paymentUrl) {
                        setPaymentBaseUrl(result.data.baseUrl);
                        setPaymentParams(result.data.paymentParams);
                        setLoading(false);
                        return; // Stop here and let the form submit
                    } else {
                        throw new Error(t('web.paymentInitError'));
                    }
                } catch (paymentErr) {
                    console.error("Payment Init Error:", paymentErr);
                    setError(paymentErr.message || t('web.paymentError'));
                    setLoading(false);
                    return;
                }
            }

            // Update user profile location for next time
            if (deliveryType === 'delivery') {
                await updateUserProfileLocation(coords.lat, coords.lng, selectedCity);
            }

            setIsSuccess(true);
            setScheduleForLater(false);
            setScheduledDate('today');
            setScheduledTime('09:00');
            setTimeout(() => {
                clearCart();
                onClose();
            }, 3000);

        } catch (err) {
            console.error("Submit Order Error:", err);
            setError(t('web.submitOrderError'));
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className={`web-checkout-container ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="checkout-success-view">
                    <CheckCircle size={80} color="#10B981" />
                    <h2>{t('web.orderSuccessTitle')}</h2>
                    <p>{t('web.orderSuccessSub')}</p>
                </div>
            </div>
        );
    }

    if (paymentParams && paymentBaseUrl) {
        // Create an auto-submitting form for Tranzila
        const inputs = Object.keys(paymentParams)
            .map(key => `<input type="hidden" name="${key}" value="${paymentParams[key]}" />`)
            .join('\n');

        const htmlContent = `
            <html>
                <head><meta charset="UTF-8"></head>
                <body onload="document.forms[0].submit()" style="margin:0; padding:0; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; background-color:#f9fafb;">
                    <form method="POST" action="${paymentBaseUrl}" accept-charset="UTF-8">
                        ${inputs}
                    </form>
                    <div style="text-align:center;">
                        <h2 style="color:#10B981; margin-bottom: 10px;">${t('web.redirectingToPayment')}</h2>
                        <p style="color:#6B7280;">${t('web.pleaseWait')}</p>
                    </div>
                </body>
            </html>
        `;

        return (
            <div className={`web-checkout-container ${isRtl ? 'rtl' : 'ltr'}`} style={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 9999, backgroundColor: '#fff' }}>
                <header className="checkout-header">
                    <button className="back-btn" onClick={() => { setPaymentParams(null); setPaymentBaseUrl(''); }}>
                        {isRtl ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
                    </button>
                    <h2>{t('web.securePayment')}</h2>
                    <div style={{ width: 40 }}></div>
                </header>
                <iframe
                    srcDoc={htmlContent}
                    style={{ width: '100%', height: 'calc(100vh - 60px)', border: 'none' }}
                    title="Payment Gateway"
                />
            </div>
        );
    }

    return (
        <div className={`web-checkout-container ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <header className="checkout-header">
                <button className="back-btn" onClick={onClose}>
                    {isRtl ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
                </button>
                <h2>{t('web.checkout')}</h2>
                <div style={{ width: 40 }}></div>
            </header>

            <form className="checkout-content" onSubmit={handlePlaceOrder}>
                {error && <div className="checkout-error">{error}</div>}

                <div className="checkout-section">
                    <h3>{t('web.deliveryMethod')}</h3>
                    <div className="method-selector">
                        <button
                            type="button"
                            className={`method-btn ${deliveryType === 'delivery' ? 'active' : ''}`}
                            onClick={() => setDeliveryType('delivery')}
                        >
                            {t('web.delivery')}
                        </button>
                        <button
                            type="button"
                            className={`method-btn ${deliveryType === 'pickup' ? 'active' : ''}`}
                            onClick={() => setDeliveryType('pickup')}
                        >
                            {t('web.pickup')}
                        </button>
                    </div>
                </div>

                {deliveryType === 'delivery' && (
                    <div className="checkout-section">
                        <h3>{t('web.deliveryAddress')}</h3>
                        {hasCities && (
                            <div className="input-group" style={{ marginBottom: 12 }}>
                                <select
                                    className="city-select"
                                    value={selectedCity}
                                    onChange={(e) => setSelectedCity(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>{t('web.selectCity')}</option>
                                    {deliveryCities.map((city, idx) => (
                                        <option key={idx} value={city.cityNameAr || city.nameAr}>
                                            {isRtl ? (city.cityNameAr || city.nameAr) : (city.cityNameHe || city.nameHe || city.nameAr)}
                                            {city.fee > 0 ? ` (+${city.fee} ₪)` : ` (${t('web.free')})`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder={t('web.addressPlaceholder')}
                                value={addressDetails}
                                onChange={e => setAddressDetails(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className={`location-btn ${isLocating ? 'locating' : ''} ${coords.lat ? 'has-coords' : ''}`}
                                onClick={handleGetLocation}
                                title={t('web.getLocation')}
                            >
                                {isLocating ? <Loader2 className="spinner" size={20} /> : <MapPin size={20} />}
                            </button>
                        </div>
                        <div className="input-group" style={{ marginTop: 12 }}>
                            <input
                                type="tel"
                                placeholder={t('web.phonePlaceholder')}
                                value={addressPhone}
                                onChange={e => setAddressPhone(e.target.value)}
                                required
                                style={{ direction: 'ltr', textAlign: isRtl ? 'right' : 'left' }}
                            />
                        </div>
                    </div>
                )}

                {/* نطاقات التوصيل — يظهر عند التوصيل فقط */}
                {deliveryType === 'delivery' && (storeInfo?.deliveryZones?.filter(z => z.isActive !== false).length > 0) && (
                    <div className="checkout-section">
                        <button
                            type="button"
                            className="checkout-hours-card"
                            onClick={() => setZonesModalVisible(true)}
                        >
                            <span className="hours-icon zones-icon">
                                <MapPinned size={20} />
                            </span>
                            <div className="hours-text">
                                <span className="hours-status">{tWeb('deliveryZonesTitle')}</span>
                                <span className="hours-delivery">{tWeb('deliveryZonesSub')}</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* أوقات العمل والتوصيل */}
                <div className="checkout-section">
                    <button
                        type="button"
                        className="checkout-hours-card"
                        onClick={() => setHoursModalVisible(true)}
                    >
                        <span className={`hours-icon ${isStoreOpenNow ? 'open' : 'closed'}`}>
                            <Clock size={20} />
                        </span>
                        <div className="hours-text">
                            <span className="hours-status">
                                {isStoreOpenNow ? tWeb('open') : tWeb('closed')} ({tWeb('storeWorkingHours')})
                            </span>
                            <span className="hours-delivery">{tWeb('deliveryTimeLabel')}: {deliveryTimeText}</span>
                        </div>
                    </button>
                </div>

                {/* تحديد وقت لاحق */}
                <div className="checkout-section">
                    <div className="schedule-row">
                        <div>
                            <div className="schedule-title">{tWeb('scheduleForLater')}</div>
                            <div className="schedule-sub">{tWeb('enableToChooseTime')}</div>
                        </div>
                        <button
                            type="button"
                            className={`toggle-switch ${scheduleForLater ? 'on' : ''}`}
                            onClick={() => setScheduleForLater(!scheduleForLater)}
                            aria-pressed={scheduleForLater}
                        >
                            <span className="toggle-dot" />
                        </button>
                    </div>
                    {scheduleForLater && (
                        <div className="schedule-picker">
                            <div className="schedule-date-tabs">
                                <button type="button" className={scheduledDate === 'today' ? 'active' : ''} onClick={() => setScheduledDate('today')}>{tWeb('today')}</button>
                                <button type="button" className={scheduledDate === 'tomorrow' ? 'active' : ''} onClick={() => setScheduledDate('tomorrow')}>{tWeb('tomorrow')}</button>
                            </div>
                            <div className="input-group">
                                <label className="schedule-label">{tWeb('selectTime')}</label>
                                <select
                                    className="city-select"
                                    value={timeSlotsForPicker.some(s => s.time === scheduledTime) ? scheduledTime : (timeSlotsForPicker[0]?.time || '')}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                >
                                    {timeSlotsForPicker.length === 0 ? (
                                        <option value="">—</option>
                                    ) : (
                                        timeSlotsForPicker.map((s) => (
                                            <option key={s.time} value={s.time}>{formatTo12Hour(s.time, (k) => t(k))}</option>
                                        ))
                                    )}
                                </select>
                            </div>
                            {scheduledForLabel && <p className="schedule-summary">{scheduledForLabel}</p>}
                        </div>
                    )}
                </div>

                {/* كوبون الخصم */}
                <div className="checkout-section">
                    <h3>{t('promos.promoCodeLabel')}</h3>
                    {promoCode ? (
                        <div className="promo-applied">
                            <Tag size={18} />
                            <span>{promoCode.code} (-{discountAmount.toFixed(2)} ₪)</span>
                            <button type="button" className="promo-remove" onClick={removePromoCode} title={tWeb('removePromo')}>
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="promo-input-row">
                                <input
                                    type="text"
                                    placeholder={tWeb('promoCodePlaceholder')}
                                    value={promoInput}
                                    onChange={(e) => { setPromoInput(e.target.value); setPromoMessage(''); }}
                                    className="promo-input"
                                />
                                <button type="button" className="promo-apply-btn" onClick={handleApplyPromo} disabled={applyingPromo || !promoInput.trim()}>
                                    {applyingPromo ? <Loader2 className="spinner" size={18} /> : tWeb('applyPromo')}
                                </button>
                            </div>
                            {promoMessage && <p className={`promo-message ${promoMessage.includes('تم') || promoMessage.includes('הוחלה') ? 'success' : 'error'}`}>{promoMessage}</p>}
                        </>
                    )}
                </div>

                <div className="checkout-section">
                    <h3>{t('web.paymentMethod')}</h3>
                    <div className="payment-options">
                        <label className={`payment-option ${paymentMethod === 'cash' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="payment"
                                value="cash"
                                checked={paymentMethod === 'cash'}
                                onChange={() => setPaymentMethod('cash')}
                            />
                            <Banknote size={24} color={paymentMethod === 'cash' ? '#9FD6C7' : '#9CA3AF'} />
                            <div className="payment-text">
                                <span>{t('web.cashOnDelivery')}</span>
                            </div>
                        </label>
                        <label className={`payment-option ${paymentMethod === 'card' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="payment"
                                value="card"
                                checked={paymentMethod === 'card'}
                                onChange={() => setPaymentMethod('card')}
                            />
                            <CreditCard size={24} color={paymentMethod === 'card' ? '#9FD6C7' : '#9CA3AF'} />
                            <div className="payment-text">
                                <span>{t('web.creditCard')}</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* كارد عرض التوصيل — يظهر فقط عندما يكون موقع العميل داخل نطاق توصيل عليه عرض */}
                {deliveryType === 'delivery' && deliveryFeeSource === 'zone' && zoneOffer && (zoneOffer.offerLabelAr || zoneOffer.offerLabelHe) && (
                    <div className="checkout-zone-offer-card">
                        <span className="zone-offer-icon">
                            <Tag size={20} />
                        </span>
                        <div className="zone-offer-body">
                            <span className="zone-offer-text">
                                {isRtl ? (zoneOffer.offerLabelHe || zoneOffer.offerLabelAr) : (zoneOffer.offerLabelAr || zoneOffer.offerLabelHe)}
                                {zoneOffer.freeDeliveryAbove != null ? ` ${Math.ceil(zoneOffer.freeDeliveryAbove)} ₪` : ''}
                            </span>
                            {zoneOffer.freeDeliveryAbove != null && subtotal < zoneOffer.freeDeliveryAbove && (
                                <span className="zone-offer-hint">
                                    {tWeb('addForFreeDelivery', { amount: Math.max(0, Math.ceil(zoneOffer.freeDeliveryAbove - subtotal)) })}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <div className="checkout-summary">
                    <div className="summary-row">
                        <span>{t('web.subtotal')}</span>
                        <span>{subtotal.toFixed(2)} ₪</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="summary-row discount">
                            <span>{tWeb('discountLabel')}</span>
                            <span>- {discountAmount.toFixed(2)} ₪</span>
                        </div>
                    )}
                    {deliveryType === 'delivery' && (
                        <div className="summary-row">
                            <span>{t('web.deliveryFeeLabel')}</span>
                            <span style={{ color: '#10B981' }}>{effectiveDeliveryFee === 0 ? t('web.free') : `+${effectiveDeliveryFee} ₪`}</span>
                        </div>
                    )}
                    <div className="summary-row total">
                        <span>{t('web.totalLabel')}</span>
                        <span>{totalAmount.toFixed(2)} ₪</span>
                    </div>
                </div>

                <div className="checkout-footer">
                    {!canSubmit && <p className="checkout-closed-hint">{tWeb('closed')}</p>}
                    {scheduleForLater && scheduledForLabel && <p className="checkout-scheduled-hint">{scheduledForLabel}</p>}
                    <button type="submit" className="submit-order-btn" disabled={loading || !canSubmit || !scheduleValid}>
                        {loading ? <Loader2 className="spinner" size={24} /> : t('web.confirmOrder')}
                    </button>
                    <p className="terms-text">
                        {t('web.termsAgreement')}
                    </p>
                </div>
            </form>

            {hoursModalVisible && (
                <div className="checkout-modal-overlay" onClick={() => setHoursModalVisible(false)}>
                    <div className="checkout-modal" onClick={e => e.stopPropagation()}>
                        <h3>{tWeb('storeWorkingHours')}</h3>
                        <ul className="checkout-hours-list">
                            {(() => {
                                const rows = getWorkingHoursRows(weeklyHours, (k) => t(k));
                                if (rows.length === 0) return <li className="checkout-hours-row"><span>—</span></li>;
                                return rows.map((row, idx) => (
                                    <li key={idx} className="checkout-hours-row">
                                        <span className="checkout-hours-day">{row.dayLabel}</span>
                                        <span className="checkout-hours-time">{row.hoursText}</span>
                                    </li>
                                ));
                            })()}
                        </ul>
                        <p className="checkout-hours-delivery">{tWeb('deliveryTimeLabel')}: {deliveryTimeText}</p>
                        <button type="button" className="checkout-modal-close" onClick={() => setHoursModalVisible(false)}>
                            {t('promos.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {zonesModalVisible && (
                <div className="checkout-modal-overlay" onClick={() => setZonesModalVisible(false)}>
                    <div className="checkout-modal" onClick={e => e.stopPropagation()}>
                        <h3>{tWeb('deliveryZonesTitle')}</h3>
                        <p className="checkout-zones-sub">{tWeb('deliveryZonesSub')}</p>
                        <ul className="checkout-zones-list">
                            {(storeInfo?.deliveryZones || []).filter(z => z.isActive !== false).map((zone, idx) => {
                                const name = isRtl ? (zone.nameAr || zone.nameHe || zone.name) : (zone.nameHe || zone.nameAr || zone.name);
                                const fee = Number(zone.fee) || 0;
                                const hasOffer = zone.freeDeliveryAbove != null || zone.offerLabelAr || zone.offerLabelHe;
                                const offerText = isRtl ? (zone.offerLabelHe || zone.offerLabelAr) : (zone.offerLabelAr || zone.offerLabelHe);
                                return (
                                    <li key={idx} className="checkout-zone-row">
                                        <div className="checkout-zone-info">
                                            <span className="checkout-zone-name">{name || t('store.zoneNamePlaceholder')}</span>
                                            {hasOffer && offerText && (
                                                <span className="checkout-zone-offer-text">
                                                    {offerText}{zone.freeDeliveryAbove != null ? ` ${Math.ceil(zone.freeDeliveryAbove)} ₪` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <span className="checkout-zone-fee">
                                            {fee === 0 ? tWeb('free') : `${fee} ₪`}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                        <button type="button" className="checkout-modal-close" onClick={() => setZonesModalVisible(false)}>
                            {t('promos.cancel')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebCheckout;
