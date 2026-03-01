import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebCart } from '../../context/WebCartContext';
import { useWebAuth } from '../../context/WebAuthContext';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../firebase/config';
import { useWebStoreData } from '../../hooks/useWebStoreData';
import { ArrowLeft, ArrowRight, MapPin, Loader2, CheckCircle, CreditCard, Banknote } from 'lucide-react';
import './WebCheckout.css';

const WebCheckout = ({ onClose }) => {
    const { t, i18n } = useTranslation();
    const { cartItems, cartTotal, clearCart } = useWebCart();
    const { currentUser, userData, updateUserProfileLocation } = useWebAuth();
    const { storeInfo } = useWebStoreData();

    const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' or 'pickup'
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

    const [paymentParams, setPaymentParams] = useState(null); // htmlFor Tranzila
    const [paymentBaseUrl, setPaymentBaseUrl] = useState('');

    const isRtl = i18n.language === 'ar' || i18n.language === 'he';

    const { validateDeliveryLocation, deliveryFee, zoneOffer } = useWebCart();

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setError(t('web.geolocationNotSupported'));
            return;
        }

        setIsLocating(true);
        setError('');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCoords({ lat: latitude, lng: longitude });
                setIsLocating(false);
                // Trigger validation
                validateDeliveryLocation(latitude, longitude, selectedCity, storeInfo);
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

    // Update fee when city changes manually
    React.useEffect(() => {
        if (selectedCity || coords.lat) {
            validateDeliveryLocation(coords.lat, coords.lng, selectedCity, storeInfo);
        }
    }, [selectedCity]);

    const deliveryCities = storeInfo?.deliveryCityFees?.filter(c => c.isActive !== false) || [];
    const hasCities = deliveryCities.length > 0;

    const totalAmount = Number(cartTotal) + Number(deliveryFee);

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
        if (cartTotal < minOrder) {
            setError(t('web.minOrderError', { min: minOrder }));
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
                subtotal: cartTotal.toFixed(2),
                discountAmount: '0',
                promoCode: null,
                membershipDiscount: '0',
                pointsDiscount: '0',
                pointsRedeemed: 0,
                rewardPointsTotal: 0,
                cashbackRedeemedPoints: 0,
                deliveryFee: deliveryFee,
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
                scheduledFor: null,
                scheduledForLabel: null,
                scheduledPeriod: null,
                source: 'web' // Additional flag for tracking
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

                <div className="checkout-summary">
                    <div className="summary-row">
                        <span>{t('web.subtotal')}</span>
                        <span>{cartTotal.toFixed(2)} ₪</span>
                    </div>
                    {deliveryType === 'delivery' && (
                        <div className="summary-row">
                            <span>{t('web.deliveryFeeLabel')}</span>
                            <span style={{ color: '#10B981' }}>{deliveryFee === 0 ? t('web.free') : `+${deliveryFee} ₪`}</span>
                        </div>
                    )}
                    <div className="summary-row total">
                        <span>{t('web.totalLabel')}</span>
                        <span>{totalAmount.toFixed(2)} ₪</span>
                    </div>
                </div>

                <div className="checkout-footer">
                    <button type="submit" className="submit-order-btn" disabled={loading}>
                        {loading ? <Loader2 className="spinner" size={24} /> : t('web.confirmOrder')}
                    </button>
                    <p className="terms-text">
                        {t('web.termsAgreement')}
                    </p>
                </div>
            </form>
        </div>
    );
};

export default WebCheckout;
