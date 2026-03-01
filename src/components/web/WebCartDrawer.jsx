import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebCart } from '../../context/WebCartContext';
import { useWebAuth } from '../../context/WebAuthContext';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import WebCheckout from './WebCheckout';
import './WebCartDrawer.css';

const WebCartDrawer = ({ isOpen, onClose }) => {
    const { t, i18n } = useTranslation();
    const { cartItems, updateQuantity, removeFromCart, cartTotal } = useWebCart();
    const { currentUser, openLogin, isOtpSuccess, setIsOtpSuccess } = useWebAuth();

    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    const isRtl = i18n.language === 'ar' || i18n.language === 'he';

    useEffect(() => {
        // If they just successfully logged in via OTP and were trying to checkout
        if (isOtpSuccess && currentUser) {
            setIsOtpSuccess(false);
            if (cartItems.length > 0) {
                setIsCheckoutOpen(true);
            }
        }
    }, [isOtpSuccess, currentUser, cartItems.length, setIsOtpSuccess]);

    const handleCheckoutClick = () => {
        if (!currentUser) {
            // Must authenticate before checkout
            openLogin();
        } else {
            // Already logged in, go to checkout form
            setIsCheckoutOpen(true);
        }
    };

    if (!isOpen) {
        // Even if closed, if checkout is open, keep it rendered (or handle via routing)
        if (isCheckoutOpen) {
            return <WebCheckout onClose={() => { setIsCheckoutOpen(false); onClose(); }} />;
        }
        return null;
    }

    // Replace drawer with checkout screen if open
    if (isCheckoutOpen) {
        return <WebCheckout onClose={() => { setIsCheckoutOpen(false); onClose(); }} />;
    }

    return (
        <div className={`web-cart-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className={`web-cart-drawer ${isRtl ? 'rtl' : 'ltr'}`} onClick={e => e.stopPropagation()}>
                <div className="drawer-header">
                    <h2>{t('web.shoppingCart')}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="drawer-content">
                    {cartItems.length === 0 ? (
                        <div className="empty-cart">
                            <ShoppingBag size={48} color="#D1D5DB" />
                            <p>{t('web.emptyCart')}</p>
                            <button className="continue-shop-btn" onClick={onClose}>
                                {t('web.continueShopping')}
                            </button>
                        </div>
                    ) : (
                        <div className="cart-items-list">
                            {cartItems.map((item) => {
                                const sizeName = item.selectedSize ? (i18n.language === 'ar' ? (item.selectedSize.nameAr || item.selectedSize.name) : (item.selectedSize.nameHe || item.selectedSize.name)) : null;

                                return (
                                    <div key={item.cartItemId} className="cart-item">
                                        <img src={item.image || '/placeholder.png'} alt={item.name} className="cart-item-img" />

                                        <div className="cart-item-info">
                                            <div className="cart-title-row">
                                                <h4>{item.name}</h4>
                                                <button className="remove-btn" onClick={() => removeFromCart(item.cartItemId)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="cart-item-details">
                                                {sizeName && <span className="detail-tag size">{sizeName}</span>}
                                                {item.selectedFlavors.length > 0 && (
                                                    <span className="detail-tag flavor">
                                                        {item.selectedFlavors.map(f => typeof f === 'object' ? (i18n.language === 'ar' ? (f.nameAr || f.name) : (f.nameHe || f.name)) : f).join(', ')}
                                                    </span>
                                                )}
                                                {item.selectedExtras.length > 0 && (
                                                    <div className="extras-list">
                                                        {item.selectedExtras.map((ext, idx) => (
                                                            <span key={idx} className="detail-tag extra">
                                                                + {i18n.language === 'ar' ? (ext.nameAr || ext.name) : (ext.nameHe || ext.name)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="cart-item-footer">
                                                <span className="item-price">{(item.price * item.quantity).toFixed(2)} ₪</span>

                                                <div className="drawer-qty-selector">
                                                    <button onClick={() => updateQuantity(item.cartItemId, -1)}><Minus size={14} /></button>
                                                    <span>{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.cartItemId, 1)}><Plus size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {cartItems.length > 0 && (
                    <div className="drawer-footer">
                        <div className="summary-row">
                            <span>{t('web.subtotal')}</span>
                            <span>{cartTotal.toFixed(2)} ₪</span>
                        </div>
                        <button className="checkout-btn" onClick={handleCheckoutClick}>
                            <span>{t('web.proceedToCheckout')}</span>
                            <span className="checkout-btn-total">{cartTotal.toFixed(2)} ₪</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WebCartDrawer;
