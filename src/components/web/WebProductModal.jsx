import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebCart } from '../../context/WebCartContext';
import { useWebAuth } from '../../context/WebAuthContext';
import { useWebStoreData } from '../../hooks/useWebStoreData';
import { X, Minus, Plus, ShoppingBag, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import './WebProductModal.css';

const WebProductModal = ({ product, extras: globalExtras, onClose }) => {
    const { t, i18n } = useTranslation();
    const { addToCart } = useWebCart();
    const { currentUser, openLogin } = useWebAuth();
    const { extraGroups } = useWebStoreData();

    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedFlavors, setSelectedFlavors] = useState([]);
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [note, setNote] = useState('');
    const [currentStep, setCurrentStep] = useState(0);

    const isRtl = i18n.language === 'ar' || i18n.language === 'he';

    // Parse options
    const visibleExtras = useMemo(() => {
        if (!product) return [];
        return (product.extras || []).filter(pExtra => {
            if (pExtra.id) {
                const global = globalExtras.find(g => g.id === pExtra.id);
                if (global && global.isFrozen) return false;
            }
            if (pExtra.isHidden) return false;
            return true;
        });
    }, [product, globalExtras]);

    const availableSteps = useMemo(() => {
        if (!product) return [];
        const steps = [];

        if (product.sizes && product.sizes.length > 0 && product.sizes.some(s => s.name || s.nameAr || s.nameHe)) {
            steps.push({ id: 'size', title: t('web.selectSize') });
        }

        if (product.flavorsCount > 0 && product.flavors && product.flavors.length > 0) {
            steps.push({ id: 'flavors', title: t('web.selectFlavors') });
        }

        if (product.extraGroupIds && product.extraGroupIds.length > 0) {
            const productGroups = extraGroups
                .filter(g => product.extraGroupIds.includes(g.id))
                .sort((a, b) => product.extraGroupIds.indexOf(a.id) - product.extraGroupIds.indexOf(b.id));

            productGroups.forEach(group => {
                const groupTitle = i18n.language === 'ar' ? (group.nameAr || group.name) : (group.nameHe || group.name);
                steps.push({
                    id: `extra_group_${group.id}`,
                    title: groupTitle,
                    groupId: group.id
                });
            });
        } else if (visibleExtras.length > 0) {
            steps.push({ id: 'extras', title: t('web.extras') });
        }

        // We can always add a notes step at the end. Or attach notes to the last step.
        // If there are no steps (shouldn't happen based on WebMenu logic), add a single step.
        if (steps.length === 0) {
            steps.push({ id: 'details', title: t('web.details') });
        }

        return steps;
    }, [product, visibleExtras, i18n.language, extraGroups]);

    const currentStepData = availableSteps[currentStep] || availableSteps[0];
    const isLastStep = currentStep === availableSteps.length - 1;

    useEffect(() => {
        if (product) {
            setCurrentStep(0);
            setQuantity(1);
            setNote('');

            // Set default size (using exact ID matching logic from QuickAddModal)
            const validSizes = product.sizes?.filter(s => s && (s.name || s.nameAr || s.nameHe)) || [];
            if (validSizes.length > 0) {
                const defaultSize = validSizes.find(s => s.isDefault) || validSizes[0];
                const baseId = defaultSize.nameAr || defaultSize.nameHe || defaultSize.name || 'size';
                const index = (product.sizes || []).indexOf(defaultSize);
                setSelectedSize(`${baseId}_${index}`);
            } else {
                setSelectedSize(null);
            }

            // Set default extras
            const defExtras = visibleExtras
                .filter(e => e.isDefault)
                .map(e => ({ ...e, id: e.id || e.name, quantity: 1 }));
            setSelectedExtras(defExtras);
            setSelectedFlavors([]);
        }
    }, [product, visibleExtras]);

    const handleFlavorToggle = (flavor) => {
        const id = typeof flavor === 'object' ? (flavor.id || flavor.name) : flavor;
        if (selectedFlavors.some(f => (f.id || f.name || f) === id)) {
            setSelectedFlavors(prev => prev.filter(f => (f.id || f.name || f) !== id));
        } else {
            const maxFlavors = product.flavorsCount || 0;
            if (selectedFlavors.length < maxFlavors) {
                setSelectedFlavors(prev => [...prev, flavor]);
            }
        }
    };

    const handleExtraToggle = (extra) => {
        const extraId = extra.id || extra.name;
        if (selectedExtras.some(e => (e.id || e.name) === extraId)) {
            setSelectedExtras(prev => prev.filter(e => (e.id || e.name) !== extraId));
        } else {
            setSelectedExtras(prev => [...prev, { ...extra, id: extraId, quantity: 1 }]);
        }
    };

    const updateExtraQuantity = (extraId, delta) => {
        setSelectedExtras(prev => {
            const extra = prev.find(e => (e.id || e.name) === extraId);
            if (!extra) return prev;

            const newQty = extra.quantity + delta;
            if (newQty <= 0) {
                return prev.filter(e => (e.id || e.name) !== extraId);
            }

            return prev.map(e => {
                if ((e.id || e.name) === extraId) {
                    return { ...e, quantity: newQty };
                }
                return e;
            });
        });
    };

    const handleNextOrAdd = () => {
        if (isLastStep && !currentUser) {
            openLogin();
            return;
        }
        if (currentStepData.id === 'flavors') {
            const maxFlavors = product.flavorsCount || 0;
            if (maxFlavors > 0 && selectedFlavors.length !== maxFlavors) {
                alert(t('web.selectFlavorsError', { count: maxFlavors }));
                return;
            }
        }

        if (isLastStep) {
            let sizeObj = null;
            if (selectedSize) {
                const sizeIndex = parseInt(selectedSize.split('_').pop() || '-1');
                if (sizeIndex >= 0 && product.sizes) {
                    sizeObj = product.sizes[sizeIndex];
                }
            }

            const finalExtras = selectedExtras.map(e => ({
                ...e,
                id: e.id || e.name,
                name: e.name,
                nameAr: e.nameAr,
                nameHe: e.nameHe,
                quantity: e.quantity || 1,
                price: e.price
            }));

            const totalBasePrice = calculateTotalPrice();

            // Override product fields explicitly exactly like QuickAddModal
            const item = {
                ...product,
                selectedFlavors,
                selectedExtras: finalExtras,
                selectedSize: sizeObj,
                quantity,
                note,
                isCalculatedPrice: true,
                price: totalBasePrice / quantity // Ensure cart sees unit price
            };

            addToCart(item, quantity, sizeObj, selectedFlavors, finalExtras, note);
            onClose();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const calculateTotalPrice = () => {
        let price = product.price || 0;

        if (product.sizes && selectedSize) {
            const sizeIndex = parseInt(selectedSize.split('_').pop() || '-1');
            if (sizeIndex >= 0 && product.sizes[sizeIndex]) {
                price += product.sizes[sizeIndex].price;
            }
        }

        if (product.extras) {
            const selectedByGroup = {};
            const ungroupedExtras = [];

            selectedExtras.forEach(item => {
                const extraObj = visibleExtras.find(e => String(e.id || e.name) === String(item.id || item.name))
                    || globalExtras.find(e => String(e.id || e.name) === String(item.id || item.name));

                if (extraObj) {
                    const group = extraGroups.find(g =>
                        (g.extraIds || []).includes(extraObj.id) && (product.extraGroupIds || []).includes(g.id)
                    );

                    if (group) {
                        if (!selectedByGroup[group.id]) selectedByGroup[group.id] = [];
                        selectedByGroup[group.id].push({ item, extraObj });
                    } else {
                        ungroupedExtras.push({ item, extraObj });
                    }
                }
            });

            // Calculate grouped extras
            Object.keys(selectedByGroup).forEach(groupId => {
                const groupItems = selectedByGroup[groupId];
                const config = product.extraGroupConfigs?.[groupId];
                let freeRemaining = Number(config?.freeLimit) || 0;

                groupItems.forEach(({ item, extraObj }) => {
                    let qty = item.quantity || 1;
                    const pricePerUnit = extraObj.price || 0;

                    if (freeRemaining > 0) {
                        const freeTaken = Math.min(qty, freeRemaining);
                        qty -= freeTaken;
                        freeRemaining = Math.max(0, freeRemaining - freeTaken);
                    }

                    if (qty > 0) {
                        price += pricePerUnit * qty;
                    }
                });
            });

            // Calculate ungrouped extras (legacy fallback mirroring QuickAdd)
            ungroupedExtras.forEach(({ item, extraObj }) => {
                let qty = item.quantity || 1;
                if (extraObj.isDefault) {
                    if (qty > 1) price += extraObj.price * (qty - 1);
                } else {
                    if (qty > 0) price += extraObj.price * qty;
                }
            });
        }

        return price * quantity;
    };

    if (!product) return null;

    return (
        <div className="web-modal-overlay" onClick={onClose} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="web-product-modal" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="modal-scroll-content">
                    <div className="prod-modal-header">
                        <img src={product.image || '/placeholder.png'} alt={product.name} className="prod-modal-img" />
                        <div className="prod-modal-info">
                            <h2>{product.name}</h2>
                            <p>{product.description}</p>
                        </div>
                    </div>

                    {/* Step Indicators */}
                    {availableSteps.length > 1 && (
                        <div className="steps-indicator">
                            {availableSteps.map((step, idx) => (
                                <div key={step.id} className={`step-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`} />
                            ))}
                        </div>
                    )}

                    {/* Step Content */}
                    <div className="step-content">
                        {currentStepData.id === 'size' && product.sizes && (
                            <div className="modal-section step-animation">
                                <h3>{currentStepData.title}</h3>
                                <p className="step-subtitle">{t('web.selectSize')}</p>
                                <div className="options-grid">
                                    {product.sizes.map((size, idx) => {
                                        if (!size.name && !size.nameAr && !size.nameHe) return null;

                                        const baseId = size.nameAr || size.nameHe || size.name || 'size';
                                        const sizeId = `${baseId}_${idx}`;
                                        const isSelected = selectedSize === sizeId;
                                        const name = i18n.language === 'ar' ? (size.nameAr || size.name) : (size.nameHe || size.name);

                                        return (
                                            <button
                                                key={idx}
                                                className={`option-card ${isSelected ? 'active' : ''}`}
                                                onClick={() => setSelectedSize(sizeId)}
                                            >
                                                <span className="opt-name">{name}</span>
                                                <span className="opt-price">+{size.price} ₪</span>
                                                {isSelected && <div className="opt-check"><Check size={14} /></div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {currentStepData.id === 'flavors' && product.flavors && (
                            <div className="modal-section step-animation">
                                <div className="section-header-row">
                                    <h3>{currentStepData.title}</h3>
                                    <span className="req-badge">
                                        {selectedFlavors.length} / {product.flavorsCount}
                                    </span>
                                </div>
                                <p className="step-subtitle">{t('web.flavorsLimit', { count: product.flavorsCount })}</p>
                                <div className="options-grid small-grid">
                                    {product.flavors.map((flavor, idx) => {
                                        if (!flavor) return null;
                                        if (typeof flavor !== 'string' && !flavor.name && !flavor.nameAr && !flavor.nameHe) return null;

                                        const baseId = typeof flavor === 'string' ? flavor : (flavor.nameAr || flavor.nameHe || flavor.name || 'flavor');
                                        const flavorId = `${baseId}_${idx}`;
                                        const isSelected = selectedFlavors.includes(flavorId);
                                        const name = typeof flavor === 'string' ? flavor : (i18n.language === 'ar' ? (flavor.nameAr || flavor.name) : (flavor.nameHe || flavor.name));

                                        return (
                                            <button
                                                key={idx}
                                                className={`option-card flavor-card ${isSelected ? 'active' : ''}`}
                                                onClick={() => handleFlavorToggle(flavorId)}
                                            >
                                                <span className="opt-name">{name}</span>
                                                {isSelected && <div className="opt-check"><Check size={14} /></div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {(currentStepData.id === 'extras' || currentStepData.id.startsWith('extra_group_')) && (
                            <div className="modal-section step-animation">
                                <h3>{currentStepData.title}</h3>
                                {(() => {
                                    let subtitle = t('web.customizeWithExtras');
                                    if (currentStepData.id.startsWith('extra_group_')) {
                                        const groupConfig = product.extraGroupConfigs?.[currentStepData.groupId];
                                        const freeLimit = Number(groupConfig?.freeLimit) || 0;
                                        if (freeLimit > 0) subtitle = t('web.freeExtrasLimit', { count: freeLimit });
                                    }
                                    return <p className="step-subtitle">{subtitle}</p>;
                                })()}
                                <div className="options-grid">
                                    {(() => {
                                        let extrasToShow = [];
                                        let groupConfig = null;
                                        let group = null;

                                        if (currentStepData.id.startsWith('extra_group_')) {
                                            const groupId = currentStepData.groupId;
                                            group = extraGroups.find(g => g.id === groupId);
                                            if (group) {
                                                extrasToShow = visibleExtras.filter(e => (group.extraIds || []).includes(e.id || e.name));
                                                groupConfig = product.extraGroupConfigs?.[groupId];
                                            }
                                        } else {
                                            extrasToShow = visibleExtras.filter(e => {
                                                const isInGroup = product.extraGroupIds?.some(gid => {
                                                    const g = extraGroups.find(gr => gr.id === gid);
                                                    return g && (g.extraIds || []).includes(e.id || e.name);
                                                });
                                                return !isInGroup;
                                            });
                                        }

                                        return extrasToShow.map((extra, idx) => {
                                            const extraId = extra.id || extra.name;
                                            const selectedExtra = selectedExtras.find(e => (e.id || e.name) === extraId);
                                            const isSelected = !!selectedExtra;
                                            const name = i18n.language === 'ar' ? (extra.nameAr || extra.name) : (extra.nameHe || extra.name);

                                            // Price Logic from QuickAddModal
                                            const itemInProduct = visibleExtras.find(pe => String(pe.id || pe.name) === String(extraId));
                                            const actualPrice = itemInProduct && typeof itemInProduct.price === 'number' ? itemInProduct.price : (extra.price || 0);
                                            const isDefault = extra.isDefault || itemInProduct?.isDefault;

                                            let displayPrice = '';
                                            if (isDefault) {
                                                displayPrice = t('web.free');
                                            } else if (group && Number(groupConfig?.freeLimit) > 0) {
                                                const freeLimitNum = Number(groupConfig.freeLimit);
                                                const groupSelectedExtras = selectedExtras.filter(item => {
                                                    const itemExtra = visibleExtras.find(pe => String(pe.id || pe.name) === String(item.id || item.name))
                                                        || globalExtras.find(ge => String(ge.id || ge.name) === String(item.id || item.name));
                                                    return itemExtra && (group.extraIds || []).includes(itemExtra.id);
                                                });

                                                let qtyBefore = 0;
                                                const currentIndex = groupSelectedExtras.findIndex(e => String(e.id || e.name) === String(extraId));
                                                if (currentIndex !== -1) {
                                                    for (let i = 0; i < currentIndex; i++) {
                                                        qtyBefore += (groupSelectedExtras[i].quantity || 1);
                                                    }
                                                } else {
                                                    groupSelectedExtras.forEach(e => qtyBefore += (e.quantity || 1));
                                                }

                                                const currentItemQty = isSelected ? selectedExtra.quantity : 1;
                                                const freeRemaining = Math.max(0, freeLimitNum - qtyBefore);
                                                const freeTaken = Math.min(currentItemQty, freeRemaining);
                                                const paidQty = currentItemQty - freeTaken;

                                                if (paidQty <= 0) displayPrice = i18n.language === 'ar' ? 'مجاني' : 'Free';
                                                else displayPrice = `+${actualPrice * paidQty} ₪`;
                                            } else {
                                                displayPrice = `+${actualPrice * (isSelected ? selectedExtra.quantity : 1)} ₪`;
                                            }

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`option-card extra-card has-qty ${isSelected ? 'active' : ''}`}
                                                    onClick={!isSelected ? () => handleExtraToggle(extra) : undefined}
                                                >
                                                    {extra.image && <img src={extra.image} alt="" className="extra-img" />}
                                                    <div className="extra-info">
                                                        <span className="opt-name">{name}</span>
                                                        <span className="opt-price" style={displayPrice === t('web.free') ? { color: '#9CA3AF' } : {}}>
                                                            {displayPrice}
                                                        </span>
                                                    </div>

                                                    {isSelected ? (
                                                        <div className="extra-qty-controls" onClick={e => e.stopPropagation()}>
                                                            <button className="extra-qty-btn" onClick={() => updateExtraQuantity(extraId, -1)}><Minus size={14} /></button>
                                                            <span className="extra-qty-val">{selectedExtra.quantity}</span>
                                                            <button className="extra-qty-btn primary" onClick={() => updateExtraQuantity(extraId, 1)}><Plus size={14} color="#FFF" /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="opt-add-badge"><Plus size={16} /></div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}

                        {isLastStep && (
                            <div className="modal-section step-animation" style={{ marginTop: 24 }}>
                                <h3>{t('web.notes')}</h3>
                                <textarea
                                    className="note-input"
                                    placeholder={t('web.addNotePlaceholder')}
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer-bar">
                    <div className="qty-selector">
                        <button className="qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18} /></button>
                        <span className="qty-val">{quantity}</span>
                        <button className="qty-btn" onClick={() => setQuantity(quantity + 1)}><Plus size={18} /></button>
                    </div>

                    <div className="action-buttons-row" style={{ display: 'flex', gap: 12, flex: 1 }}>
                        {currentStep > 0 && (
                            <button className="back-step-btn" onClick={() => setCurrentStep(s => s - 1)}>
                                {isRtl ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
                            </button>
                        )}
                        <button className="add-submit-btn" onClick={handleNextOrAdd} style={{ flex: 1 }}>
                            {isLastStep ? <ShoppingBag size={20} /> : (isRtl ? <ArrowLeft size={20} /> : <ArrowRight size={20} />)}
                            <span>{isLastStep ? t('web.addToCart') : t('web.next')}</span>
                            {isLastStep && <span className="add-total">{calculateTotalPrice()} ₪</span>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebProductModal;
