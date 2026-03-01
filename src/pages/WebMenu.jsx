import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebStoreData } from '../hooks/useWebStoreData';
import { useWebCart } from '../context/WebCartContext';
import { useWebAuth } from '../context/WebAuthContext';
import { ShoppingBag, ChevronLeft, ArrowRight, Loader2, Plus, Moon, Sun, Globe, ClipboardList, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toggleTheme, getStoredTheme } from '../utils/theme';
import WebProductModal from '../components/web/WebProductModal';
import WebCartDrawer from '../components/web/WebCartDrawer';
import WebAuthModal from '../components/web/WebAuthModal';
import WebOrders from '../components/web/WebOrders';
import './WebMenu.css';
const BRAND_MINT = '#9FD6C7';
import WebProfileModal from '../components/web/WebProfileModal';

const WebMenu = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { categories, products, extras, loading } = useWebStoreData();
    const { cartItems, cartTotal, addToCart } = useWebCart();
    const { currentUser, openLogin } = useWebAuth();

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isOrdersOpen, setIsOrdersOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isDark, setIsDark] = useState(getStoredTheme() === 'dark');

    const isRtl = i18n.language === 'ar' || i18n.language === 'he';

    const handleToggleTheme = () => {
        const newTheme = toggleTheme();
        setIsDark(newTheme === 'dark');
    };

    const toggleLang = () => {
        const newLang = i18n.language === 'ar' ? 'he' : 'ar';
        i18n.changeLanguage(newLang);
        document.dir = 'rtl'; // Both are RTL
    };

    const handleProfileClick = () => {
        if (currentUser) {
            setIsProfileOpen(true);
        } else {
            openLogin();
        }
    };

    const handleProductPress = (product) => {
        if (!currentUser) {
            openLogin();
            return;
        }

        const hasSizes = product.sizes && product.sizes.length > 0;
        const hasFlavors = product.flavorsCount > 0;
        const hasExtras = product.extras && product.extras.length > 0;

        if (hasSizes || hasFlavors || hasExtras) {
            setSelectedProduct(product);
            setIsProductModalOpen(true);
        } else {
            addToCart(product, 1);
        }
    };

    if (loading) {
        return (
            <div className={`web-menu-loading ${isRtl ? 'rtl' : 'ltr'}`}>
                <Loader2 className="spinner" size={40} color={BRAND_MINT} />
                <p>{t('web.loadingMenu')}</p>
            </div>
        );
    }

    const filteredProducts = selectedCategory === 'all'
        ? products.filter(p => !p.isDeleted)
        : products.filter(p => {
            const inCategories = p.categoryIds && p.categoryIds.includes(selectedCategory);
            const isOldCategory = p.category === selectedCategory;
            return (inCategories || isOldCategory) && !p.isDeleted;
        });

    return (
        <div className={`web-menu-container ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>

            {/* Header */}
            <header className="web-menu-header">
                <div className="container header-inner">
                    <button className="icon-btn profile-header-btn" onClick={handleProfileClick} aria-label={t('web.profile')}>
                        <User size={24} />
                    </button>
                    <h1>{t('web.menuTitle')}</h1>
                    <div className="header-actions">
                        <button className="icon-btn theme-toggle" onClick={handleToggleTheme} aria-label="Toggle Theme">
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button className="icon-btn lang-toggle" onClick={toggleLang} aria-label="Toggle Language">
                            <Globe size={20} />
                            <span className="lang-code">{i18n.language === 'ar' ? 'ع' : 'ע'}</span>
                        </button>
                        {currentUser && (
                            <button className="icon-btn orders-btn" onClick={() => setIsOrdersOpen(true)} aria-label="My Orders">
                                <ClipboardList size={20} />
                            </button>
                        )}
                        <button className="cart-icon-btn" onClick={() => setIsCartOpen(true)} aria-label={t('web.shoppingCart')}>
                            <ShoppingBag size={24} />
                            {cartItems.length > 0 && (
                                <span className="cart-badge">{cartItems.reduce((acc, item) => acc + item.quantity, 0)}</span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Categories Horizontal Scroll */}
            <div className="categories-wrapper">
                <div className="container">
                    <div className="categories-scroll">
                        <button
                            className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('all')}
                        >
                            <span>{t('web.all')}</span>
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                {cat.image && <img src={cat.image} alt={cat.nameAr} className="cat-icon" />}
                                <span>{i18n.language === 'ar' ? cat.nameAr : cat.nameHe}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <main className="menu-main container">
                {filteredProducts.length === 0 ? (
                    <div className="empty-state">
                        <ShoppingBag size={48} color="#D1D5DB" />
                        <p>{t('web.noProducts')}</p>
                    </div>
                ) : (
                    <div className="products-grid">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="product-card" onClick={() => handleProductPress(product)}>
                                <div className="product-image-wrapper">
                                    <img src={product.image || '/placeholder.png'} alt={product.name} className="product-image" loading="lazy" />
                                    <button className="add-quick-btn">
                                        <Plus size={20} color="#FFF" />
                                    </button>
                                </div>
                                <div className="product-info">
                                    <h3>{product.name}</h3>
                                    {product.description && (
                                        <p className="product-desc" title={product.description}>{product.description}</p>
                                    )}
                                    <div className="product-footer">
                                        <span className="product-price">{product.price} ₪</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Floating Floating Bag Button */}
            {cartItems.length > 0 && (
                <div className="floating-checkout-wrapper container">
                    <button className="checkout-bar" onClick={() => setIsCartOpen(true)}>
                        <div className="checkout-bar-info">
                            <span className="bar-count">{cartItems.reduce((acc, item) => acc + item.quantity, 0)}</span>
                            <span className="bar-text">{t('web.viewCart')}</span>
                        </div>
                        <span className="bar-total">{cartTotal.toFixed(2)} ₪</span>
                    </button>
                </div>
            )}

            {/* Modals & Drawers */}
            {isProductModalOpen && selectedProduct && (
                <WebProductModal
                    product={selectedProduct}
                    extras={extras}
                    onClose={() => setIsProductModalOpen(false)}
                />
            )}

            <WebCartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
            />

            <WebAuthModal />
            <WebOrders
                isOpen={isOrdersOpen}
                onClose={() => setIsOrdersOpen(false)}
            />
            <WebProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </div>
    );
};

export default WebMenu;
