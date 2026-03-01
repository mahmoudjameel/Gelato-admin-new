import React, { createContext, useContext, useState, useEffect } from 'react';

const WebCartContext = createContext();

export const useWebCart = () => useContext(WebCartContext);

export const WebCartProvider = ({ children }) => {
    // Initialize cart from localStorage so it persists across refreshes
    const [cartItems, setCartItems] = useState(() => {
        const saved = localStorage.getItem('webCartItems');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('webCartItems', JSON.stringify(cartItems));
    }, [cartItems]);

    // Add item to cart. We create a unique ID based on selections so identical items stack.
    const addToCart = (product, quantity = 1, selectedSize = null, selectedFlavors = [], selectedExtras = [], note = '') => {
        setCartItems(prev => {
            // Generate a unique key based on the options
            const sizeId = selectedSize ? (selectedSize.id || selectedSize.name) : 'no-size';
            const flavorsKey = selectedFlavors.map(f => typeof f === 'object' ? (f.id || f.name) : f).sort().join('-');
            const extrasKey = selectedExtras.map(e => typeof e === 'object' ? (e.id || e.name) : e).sort().join('-');

            const uniqueKey = `${product.id}_${sizeId}_${flavorsKey}_${extrasKey}_${note}`;

            const existingItemIndex = prev.findIndex(item => item.cartItemId === uniqueKey);

            if (existingItemIndex >= 0) {
                // Item exists with same options, just increase quantity
                const newItems = [...prev];
                newItems[existingItemIndex].quantity += quantity;
                return newItems;
            }

            // If price was already computed complexly in the modal, use it directly
            let itemPrice = product.price || 0;

            if (!product.isCalculatedPrice) {
                // Calculate base price from size or product
                let basePrice = product.price || 0;
                if (selectedSize && selectedSize.price) {
                    basePrice = parseFloat(selectedSize.price);
                }

                // Calculate extras price
                let extrasPrice = 0;
                if (selectedExtras && selectedExtras.length > 0) {
                    extrasPrice = selectedExtras.reduce((sum, extra) => {
                        const price = typeof extra === 'object' ? parseFloat(extra.price || 0) : 0;
                        return sum + price;
                    }, 0);
                }

                itemPrice = basePrice + extrasPrice;
            }

            return [...prev, {
                cartItemId: uniqueKey,
                productId: product.id,
                name: product.name,
                nameAr: product.nameAr || product.name,
                nameHe: product.nameHe || product.name,
                image: product.image,
                price: itemPrice,
                quantity: quantity,
                selectedSize,
                selectedFlavors,
                selectedExtras,
                note
            }];
        });
    };

    const removeFromCart = (cartItemId) => {
        setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
    };

    const updateQuantity = (cartItemId, change) => {
        setCartItems(prev => prev.map(item => {
            if (item.cartItemId === cartItemId) {
                const newQuantity = Math.max(1, item.quantity + change);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem('webCartItems');
    };

    // Delivery State
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [deliveryFeeSource, setDeliveryFeeSource] = useState(null); // 'zone', 'city', 'default'
    const [zoneOffer, setZoneOffer] = useState(null);

    const validateDeliveryLocation = (lat, lng, cityName, storeInfo) => {
        if (!lat || !lng || (lat === 0 && lng === 0)) {
            setDeliveryFee(0);
            setDeliveryFeeSource(null);
            setZoneOffer(null);
            return { valid: false, fee: 0, messageKey: 'locationRequired' };
        }

        const defaultFee = Number(storeInfo?.deliveryFee) || 0;
        const zones = storeInfo?.deliveryZones || [];

        // 1) Rectangular Zones
        const zoneLatMin = (z) => Math.min(Number(z.latMin), Number(z.latMax));
        const zoneLatMax = (z) => Math.max(Number(z.latMin), Number(z.latMax));
        const zoneLngMin = (z) => Math.min(Number(z.lngMin), Number(z.lngMax));
        const zoneLngMax = (z) => Math.max(Number(z.lngMin), Number(z.lngMax));

        const matchedRectZone = zones.find(z =>
            z.isActive !== false && z.latMin &&
            lat >= zoneLatMin(z) && lat <= zoneLatMax(z) &&
            lng >= zoneLngMin(z) && lng <= zoneLngMax(z)
        );

        if (matchedRectZone) {
            const fee = Number(matchedRectZone.fee) || 0;
            setDeliveryFee(fee);
            setDeliveryFeeSource('zone');
            setZoneOffer(matchedRectZone.freeDeliveryAbove ? {
                freeDeliveryAbove: Number(matchedRectZone.freeDeliveryAbove),
                offerLabelAr: matchedRectZone.offerLabelAr,
                offerLabelHe: matchedRectZone.offerLabelHe
            } : null);
            return { valid: true, fee };
        }

        // 2) Circular Radius Zones
        const storeLat = storeInfo?.location?.lat;
        const storeLng = storeInfo?.location?.lng;
        if (storeLat && storeLng) {
            const sortedRadiusZones = [...zones]
                .filter(z => z.isActive !== false && (z.radiusKm || z.radius))
                .sort((a, b) => (a.radiusKm || a.radius / 1000) - (b.radiusKm || b.radius / 1000));

            const matchedRadiusZone = sortedRadiusZones.find(z => {
                if (z.radiusKm) {
                    return haversineKm(storeLat, storeLng, lat, lng) <= z.radiusKm;
                }
                if (z.lat && z.lng && z.radius) {
                    return haversineKm(z.lat, z.lng, lat, lng) <= (z.radius / 1000);
                }
                return false;
            });

            if (matchedRadiusZone) {
                const fee = Number(matchedRadiusZone.fee) || 0;
                setDeliveryFee(fee);
                setDeliveryFeeSource('zone');
                setZoneOffer(matchedRadiusZone.freeDeliveryAbove ? {
                    freeDeliveryAbove: Number(matchedRadiusZone.freeDeliveryAbove),
                    offerLabelAr: matchedRadiusZone.offerLabelAr,
                    offerLabelHe: matchedRadiusZone.offerLabelHe
                } : null);
                return { valid: true, fee };
            }
        }

        // 3) City Fees fallback
        const cityFees = storeInfo?.deliveryCityFees || [];
        if (cityName && cityFees.length > 0) {
            const matched = cityFees.find(c =>
                c.isActive !== false &&
                (c.nameAr === cityName || c.cityNameAr === cityName || c.nameHe === cityName || c.cityNameHe === cityName)
            );
            if (matched) {
                const fee = Number(matched.fee) || 0;
                setDeliveryFee(fee);
                setDeliveryFeeSource('city');
                setZoneOffer(null);
                return { valid: true, fee };
            }
        }

        // 4) Global Default
        setDeliveryFee(defaultFee);
        setDeliveryFeeSource('default');
        setZoneOffer(null);
        return { valid: true, fee: defaultFee };
    };

    function haversineKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

    return (
        <WebCartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartTotal,
            cartCount,
            deliveryFee,
            deliveryFeeSource,
            zoneOffer,
            validateDeliveryLocation
        }}>
            {children}
        </WebCartContext.Provider>
    );
};
