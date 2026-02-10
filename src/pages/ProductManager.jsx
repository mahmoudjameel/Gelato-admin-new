import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Copy,
    Package,
    X,
    Save,
    Upload,
    ChevronDown,
    Trash,
    Check,
    Image as ImageIcon,
    Database,
    Snowflake,
    RotateCcw,
    Clock,
    Calendar,
    AlertTriangle
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
    where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { seedRewards } from '../utils/seedData';
import { seedData } from '../data/seedData';
import './ProductManager.css';

// --- Memoized Sub-Components ---

const ProductRow = React.memo(({
    product,
    t,
    showDeleted,
    unfreezeProduct,
    handleFreezeClick,
    openModal,
    handleDuplicate,
    handleDelete,
    handleRestore,
    handlePermanentDelete
}) => (
    <tr>
        <td>
            <div className="table-product-info">
                <img src={product.image} alt={product.name} className="table-img" />
                <span>{product.nameAr || product.name}</span>
            </div>
        </td>
        <td>{product.classification && <span className={`badge-classification badge-${product.classification.toLowerCase()}`}>{product.classification}</span>}</td>
        <td><span className="badge-category">{product.category}</span></td>
        <td><span className="price-tag">{product.price} ₪</span></td>
        <td>⭐ {product.rating}</td>
        <td>
            <div className="table-actions">
                {!showDeleted ? (
                    <>
                        {product.isFrozen ? (
                            <button className="unfreeze-btn" title={t('products.unfreeze')} onClick={() => unfreezeProduct(product.id)}>
                                <Snowflake size={16} color="#3B82F6" />
                            </button>
                        ) : (
                            <button className="freeze-btn" title={t('products.freeze')} onClick={() => handleFreezeClick(product)}>
                                <Clock size={16} color="#F59E0B" />
                            </button>
                        )}
                        <button className="edit-btn" onClick={() => openModal(product)} title={t('products.editProduct')}><Edit2 size={16} /></button>
                        <button className="duplicate-btn" onClick={() => handleDuplicate(product)} title={t('products.duplicate')}><Copy size={16} /></button>
                        <button className="delete-btn" onClick={() => handleDelete(product.id)} title={t('products.delete')}><Trash2 size={16} /></button>
                    </>
                ) : (
                    <>
                        <button className="restore-btn" title={t('products.restore')} onClick={() => handleRestore(product.id)}>
                            <RotateCcw size={16} color="#10B981" />
                        </button>
                        <button className="permanent-delete-btn" title={t('products.deletePermanently')} onClick={() => handlePermanentDelete(product.id)}>
                            <Trash size={16} color="#EF4444" />
                        </button>
                    </>
                )}
            </div>
        </td>
    </tr>
));

const SizesSection = React.memo(({ sizes, t, addSize, updateSize, removeSize }) => (
    <div className="dynamic-section">
        <div className="section-header-modal">
            <h3>{t('products.sizes')}</h3>
            <button type="button" className="btn-icon-add" onClick={addSize}><Plus size={16} /></button>
        </div>
        {(sizes || []).map((size, index) => (
            <div key={index} className="dynamic-row">
                <input
                    placeholder={t('products.sizeNameAr')}
                    value={size.nameAr || size.name}
                    onChange={(e) => updateSize(index, 'nameAr', e.target.value)}
                />
                <input
                    placeholder={t('products.sizeNameHe')}
                    value={size.nameHe || ''}
                    onChange={(e) => updateSize(index, 'nameHe', e.target.value)}
                    dir="rtl"
                />
                <input
                    type="number"
                    placeholder={t('products.additionalPrice')}
                    value={size.price}
                    onChange={(e) => updateSize(index, 'price', parseFloat(e.target.value))}
                />
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={size.isDefault}
                        onChange={(e) => updateSize(index, 'isDefault', e.target.checked)}
                    />
                    <span>{t('products.default')}</span>
                </label>
                <button type="button" className="btn-remove" onClick={() => removeSize(index)}><Trash size={16} /></button>
            </div>
        ))}
    </div>
));

const FlavorsSection = React.memo(({ flavors, t, addFlavor, updateFlavor, removeFlavor }) => (
    <div className="dynamic-section">
        <div className="section-header-modal">
            <h3>{t('products.flavors')}</h3>
            <button type="button" className="btn-icon-add" onClick={addFlavor}><Plus size={16} /></button>
        </div>
        <div className="flavors-grid-modal">
            {(flavors || []).map((flavor, index) => (
                <div key={index} className="dynamic-row">
                    <input
                        placeholder={t('products.flavorNameAr')}
                        value={typeof flavor === 'string' ? flavor : flavor.nameAr}
                        onChange={(e) => updateFlavor(index, 'nameAr', e.target.value)}
                    />
                    <input
                        placeholder={t('products.flavorNameHe')}
                        value={typeof flavor === 'string' ? '' : flavor.nameHe}
                        onChange={(e) => updateFlavor(index, 'nameHe', e.target.value)}
                        dir="rtl"
                    />
                    <button type="button" className="btn-remove" onClick={() => removeFlavor(index)}><Trash size={16} /></button>
                </div>
            ))}
        </div>
    </div>
));

const ExtrasSection = React.memo(({
    formData,
    extraGroups,
    globalExtras,
    isExtrasExpanded,
    setIsExtrasExpanded,
    setFormData,
    toggleExtraSelection,
    updateExtraOverride,
    t
}) => (
    <div className="dynamic-section">
        <div
            className="section-header-modal clickable-header"
            onClick={() => setIsExtrasExpanded(!isExtrasExpanded)}
            style={{ cursor: 'pointer' }}
        >
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {t('products.extras')}
                <ChevronDown size={16} style={{ transform: isExtrasExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                {(formData.extras || []).length} {t('products.selectedExtras')}
            </span>
        </div>

        {isExtrasExpanded && (
            <>
                {extraGroups.length > 0 && (
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label>{t('products.extraGroup')}</label>
                        <p className="help-text" style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '8px' }}>
                            {t('products.selectGroupsHint')}
                        </p>
                        <div className="groups-checkbox-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '10px',
                            background: 'var(--secondary)',
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)'
                        }}>
                            {extraGroups.map((g) => {
                                const isChecked = (formData.extraGroupIds || []).includes(g.id);
                                return (
                                    <label key={g.id} className={`group-check-item ${isChecked ? 'checked' : ''}`} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: '4px',
                                        padding: '10px 12px',
                                        background: isChecked ? 'rgba(143, 211, 196, 0.1)' : 'var(--card)',
                                        borderRadius: '12px',
                                        border: '1px solid',
                                        borderColor: isChecked ? 'var(--primary)' : 'var(--border)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                const currentIds = formData.extraGroupIds || [];
                                                const nextIds = isChecked
                                                    ? currentIds.filter(id => id !== g.id)
                                                    : [...currentIds, g.id];
                                                setFormData({ ...formData, extraGroupIds: nextIds });
                                            }}
                                            style={{ display: 'none' }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                            <div className="check-box-ui" style={{
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '4px',
                                                border: '2px solid',
                                                borderColor: isChecked ? 'var(--primary)' : '#D1D5DB',
                                                background: isChecked ? 'var(--primary)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white'
                                            }}>
                                                {isChecked && <Check size={12} strokeWidth={3} />}
                                            </div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: isChecked ? '700' : '500' }}>{g.nameAr}</span>
                                        </div>
                                        {isChecked && (
                                            <div className="group-config" onClick={(e) => e.stopPropagation()} style={{ marginTop: '8px', width: '100%' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)' }}>
                                                    <span style={{ fontSize: '0.7rem', color: '#666' }}>{t('products.freeChoices')}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={formData.extraGroupConfigs?.[g.id]?.freeLimit || 0}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setFormData({
                                                                ...formData,
                                                                extraGroupConfigs: {
                                                                    ...formData.extraGroupConfigs,
                                                                    [g.id]: { ...formData.extraGroupConfigs?.[g.id], freeLimit: val }
                                                                }
                                                            });
                                                        }}
                                                        style={{ width: '50px', padding: '2px 4px', fontSize: '0.8rem', border: 'none', background: '#f5f5f5', textAlign: 'center', borderRadius: '4px' }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="extras-selector-header" style={{ marginTop: '16px', marginBottom: '8px' }}>
                    <label>{t('products.individualExtras')}</label>
                    <p className="help-text" style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                        {t('products.individualExtrasHint')}
                    </p>
                </div>
                <div className="extras-selector-grid" style={{ animation: 'slideDown 0.3s ease' }}>
                    {(() => {
                        let availableExtras = globalExtras;
                        if (formData.extraGroupIds && formData.extraGroupIds.length > 0) {
                            const selectedGroupExtras = extraGroups
                                .filter(g => formData.extraGroupIds.includes(g.id))
                                .flatMap(g => g.extraIds || []);
                            availableExtras = globalExtras.filter(ex => selectedGroupExtras.includes(ex.id));
                        }
                        return availableExtras.map((gExtra) => {
                            const isSelected = (formData.extras || []).some(ex => ex.id === gExtra.id);
                            return (
                                <div
                                    key={gExtra.id}
                                    className={`extra-select-card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => toggleExtraSelection(gExtra.id)}
                                >
                                    <div className="extra-select-img">
                                        {gExtra.image ? <img src={gExtra.image} alt={gExtra.nameAr} /> : <ImageIcon size={16} />}
                                    </div>
                                    <div className="extra-select-info">
                                        <span className="name">{gExtra.nameAr}</span>
                                        <span className="price">{gExtra.price} ₪</span>
                                    </div>
                                    {isSelected && <div className="check-badge"><Check size={12} /></div>}
                                </div>
                            );
                        });
                    })()}
                </div>
            </>
        )}

        {formData.extras && formData.extras.length > 0 && (
            <div className="selected-extras-preview">
                <h4>{t('products.selectedExtras')} ({(formData.extras || []).length})</h4>
                {(formData.extras || []).map((extra, index) => (
                    <div key={index} className="selected-extra-row">
                        <span>{extra.nameAr}</span>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={extra.isDefault}
                                onChange={(e) => updateExtraOverride(index, 'isDefault', e.target.checked)}
                            />
                            <span>{t('products.default')}</span>
                        </label>
                    </div>
                ))}
            </div>
        )}
    </div>
));

const ProductManager = () => {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [globalExtras, setGlobalExtras] = useState([]);
    const [extraGroups, setExtraGroups] = useState([]); // مجموعات الإضافات
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [extraImageFiles, setExtraImageFiles] = useState({}); // { index: File }
    const [uploading, setUploading] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);
    const [freezeModalOpen, setFreezeModalOpen] = useState(false);
    const [productToFreeze, setProductToFreeze] = useState(null);
    const [freezeType, setFreezeType] = useState('tomorrow'); // tomorrow, scheduled, indefinite
    const [customFreezeDate, setCustomFreezeDate] = useState('');

    const [formData, setFormData] = useState({
        nameAr: '',
        nameHe: '',
        descriptionAr: '',
        descriptionHe: '',
        price: '',
        category: '',
        classification: '',
        image: '',
        rating: '4.5',
        sizes: [],
        flavors: [],
        extras: [],
        extraGroupIds: [], // مجموعات الإضافات (اختياري)
        extraGroupConfigs: {}, // إعدادات المجموعات (الحد المجاني)
        loyaltyPointsPrice: ''
    });

    // [NEW] Collapsible state for extras picker
    const [isExtrasExpanded, setIsExtrasExpanded] = useState(false);
    const [isDuplicateMode, setIsDuplicateMode] = useState(false);

    useEffect(() => {
        fetchData();
    }, [showDeleted]); // Re-fetch or re-filter when toggling deleted view

    const fetchData = async () => {
        setLoading(true);
        try {
            // Filter query based on isDeleted status (default false if field missing)
            // Note: Firestore querying on non-existent fields can be tricky, 
            // so we might filter client-side if the field was just added.
            // But let's try a direct query first.
            // Actually, for simplicity and to handle mixed data (some docs without isDeleted),
            // fetching all might be safer if the collection isn't huge, OR update all docs.
            // Let's assume we filter client side for safer migration or use a where clause.

            // To properly query `isDeleted == false`, we need to index it or ensure all docs have it.
            // Let's fetch all and filter in JS for smoother transition without re-indexing immediately.
            const pQ = query(collection(db, 'products'), orderBy('name'));
            const cQ = query(collection(db, 'categories'), orderBy('name'));
            const eQ = query(collection(db, 'extras'), orderBy('nameAr'));
            const gQ = query(collection(db, 'extraGroups'), orderBy('nameAr'));

            const [pSnapshot, cSnapshot, eSnapshot, gSnapshot] = await Promise.all([getDocs(pQ), getDocs(cQ), getDocs(eQ), getDocs(gQ)]);

            const allProducts = pSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                isDeleted: doc.data().isDeleted || false,
                isFrozen: doc.data().isFrozen || false
            }));

            // Filter based on the toggle
            const visibleProducts = allProducts.filter(p => p.isDeleted === showDeleted);

            setProducts(visibleProducts);
            setCategories(cSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            setGlobalExtras(eSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            setExtraGroups(gSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        } catch (error) {
            console.error("Error fetching data: ", error);
        } finally {
            setLoading(false);
        }
    };

    // Seed Functions
    const handleSeedDatabase = async () => {
        if (!window.confirm('هل أنت متأكد من إضافة البيانات التجريبية (Seed)؟ سيتم إضافة تصنيفات، إضافات، ومنتجات.')) return;

        setSeeding(true);
        try {
            // 1. Add Categories
            console.log("Seeding Categories...");
            for (const cat of seedData.categories) {
                // Check duplicate if needed, or just add
                await addDoc(collection(db, 'categories'), { ...cat, createdAt: new Date() });
            }

            // 2. Add Extras and map IDs
            console.log("Seeding Extras...");
            const extrasMap = {}; // seedID -> firestoreID
            for (const extra of seedData.extras) {
                const { id: seedId, ...extraData } = extra;
                const docRef = await addDoc(collection(db, 'extras'), { ...extraData, createdAt: new Date() });
                extrasMap[seedId] = docRef.id;
            }

            // 3. Add Products
            console.log("Seeding Products...");
            for (const prod of seedData.products) {
                const { linkedExtras, ...prodData } = prod;

                // Map extras if any
                let finalExtras = [];
                if (linkedExtras && linkedExtras.length > 0) {
                    finalExtras = linkedExtras.map(seedExtraId => {
                        const firestoreId = extrasMap[seedExtraId];
                        // We also need the extra details embedded in product sometimes, 
                        // but the new system references by ID mainly.
                        // However, EditProductScreen expects full objects in the 'extras' array often.
                        // Let's attach at least the ID. 
                        // Actually, looking at the code, we save array of objects in product.extras usually.
                        // Let's fetch the data we just saved or use the seed data.
                        const extraSeedData = seedData.extras.find(e => e.id === seedExtraId);
                        if (extraSeedData && firestoreId) {
                            const { id, ...data } = extraSeedData;
                            return { id: firestoreId, ...data };
                        }
                        return null;
                    }).filter(Boolean);
                }

                await addDoc(collection(db, 'products'), {
                    ...prodData,
                    extras: finalExtras,
                    createdAt: new Date()
                });
            }

            alert('تمت إضافة البيانات التجريبية بنجاح!');
            fetchData();
        } catch (error) {
            console.error("Seeding error:", error);
            alert('حدث خطأ أثناء إضافة البيانات');
        } finally {
            setSeeding(false);
        }
    };

    const handleClearSeed = async () => {
        if (!window.confirm('هل أنت متأكد من حذف جميع البيانات التجريبية (Seeded Data)؟ لا يمكن التراجع عن هذا الإجراء.')) return;

        setSeeding(true);
        try {
            // Delete Products
            const pQ = query(collection(db, 'products'), where('isSeeded', '==', true));
            const pSnap = await getDocs(pQ);
            const pDeletePromises = pSnap.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(pDeletePromises);

            // Delete Extras
            const eQ = query(collection(db, 'extras'), where('isSeeded', '==', true));
            const eSnap = await getDocs(eQ);
            const eDeletePromises = eSnap.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(eDeletePromises);

            // Delete Categories
            const cQ = query(collection(db, 'categories'), where('isSeeded', '==', true));
            const cSnap = await getDocs(cQ);
            const cDeletePromises = cSnap.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(cDeletePromises);

            alert('تم حذف البيانات التجريبية بنجاح!');
            fetchData();
        } catch (error) {
            console.error("Clearing seed error:", error);
            alert('حدث خطأ أثناء حذف البيانات');
        } finally {
            setSeeding(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (file, path = 'products') => {
        const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            // 1. Upload main image if exists
            let imageUrl = formData.image;
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            // 2. Upload images for extras if exist
            const updatedExtras = [...(formData.extras || [])];
            for (let i = 0; i < updatedExtras.length; i++) {
                if (extraImageFiles[i]) {
                    const extraUrl = await uploadImage(extraImageFiles[i], 'extras');
                    updatedExtras[i].image = extraUrl;
                }
            }

            const productData = {
                ...formData,
                name: formData.nameAr, // Compat
                description: formData.descriptionAr, // Compat
                image: imageUrl,
                price: parseFloat(formData.price),
                loyaltyPointsPrice: formData.loyaltyPointsPrice ? parseInt(formData.loyaltyPointsPrice) : null,
                extras: updatedExtras,
                extraGroupIds: formData.extraGroupIds || [],
                extraGroupConfigs: formData.extraGroupConfigs || {},
                flavors: (formData.flavors || []).filter(f => (f.nameAr && f.nameAr.trim() !== '') || (f.nameHe && f.nameHe.trim() !== '')),
                sizes: (formData.sizes || []).filter(s => (s.nameAr && s.nameAr.trim() !== '') || (s.nameHe && s.nameHe.trim() !== ''))
            };

            if (editingProduct) {
                await updateDoc(doc(db, 'products', editingProduct.id), productData);
            } else {
                await addDoc(collection(db, 'products'), productData);
            }

            closeProductModal();
            resetForm();
            fetchData();
        } catch (error) {
            console.error("Error saving product: ", error);
        } finally {
            setUploading(false);
        }
    };

    // Helper functions for dynamic fields
    const addSize = () => {
        const sizes = formData.sizes || [];
        setFormData({
            ...formData,
            sizes: [...sizes, { nameAr: '', nameHe: '', price: 0, isDefault: sizes.length === 0 }]
        });
    };

    const removeSize = (index) => {
        const newSizes = (formData.sizes || []).filter((_, i) => i !== index);
        setFormData({ ...formData, sizes: newSizes });
    };

    const updateSize = (index, field, value) => {
        const newSizes = [...(formData.sizes || [])];
        if (field === 'isDefault' && value === true) {
            newSizes.forEach((s, i) => s.isDefault = i === index);
        } else {
            newSizes[index][field] = value;
        }
        setFormData({ ...formData, sizes: newSizes });
    };

    const addFlavor = () => {
        setFormData({ ...formData, flavors: [...(formData.flavors || []), { nameAr: '', nameHe: '' }] });
    };

    const removeFlavor = (index) => {
        const newFlavors = (formData.flavors || []).filter((_, i) => i !== index);
        setFormData({ ...formData, flavors: newFlavors });
    };

    const updateFlavor = (index, field, value) => {
        const newFlavors = [...(formData.flavors || [])];
        if (typeof newFlavors[index] === 'string') {
            newFlavors[index] = { nameAr: value, nameHe: '' }; // Convert legacy string to object on edit
        } else {
            newFlavors[index][field] = value;
        }
        setFormData({ ...formData, flavors: newFlavors });
    };

    const addExtra = (points = false) => {
        // No longer creating new extras here ad-hoc. 
        // Logic handled by selecting from list.
    };

    const toggleExtraSelection = (extraId) => {
        const currentExtras = formData.extras || [];
        const exists = currentExtras.find(ex => ex.id === extraId);

        let newExtras;
        if (exists) {
            newExtras = currentExtras.filter(ex => ex.id !== extraId);
        } else {
            // Find original extra
            const original = globalExtras.find(ex => ex.id === extraId);
            if (original) {
                newExtras = [...currentExtras, {
                    id: original.id,
                    nameAr: original.nameAr,
                    nameHe: original.nameHe,
                    price: original.price,
                    image: original.image,
                    isDefault: false
                }];
            }
        }
        setFormData({ ...formData, extras: newExtras });
    };

    const updateExtraOverride = (index, field, value) => {
        // Allow overriding price or default status per product if needed? 
        // For now, let's stick to global properties mainly, but 'isDefault' is per product.
        const newExtras = [...(formData.extras || [])];
        newExtras[index][field] = value;
        setFormData({ ...formData, extras: newExtras });
    };

    const resetForm = () => {
        setEditingProduct(null);
        setImageFile(null);
        setImagePreview(null);
        setExtraImageFiles({});
        setFormData({
            nameAr: '',
            nameHe: '',
            descriptionAr: '',
            descriptionHe: '',
            price: '',
            category: '',
            classification: '',
            image: '',
            rating: '4.5',
            sizes: [],
            flavors: [],
            extras: [],
            extraGroupIds: [],
            extraGroupConfigs: {},
            loyaltyPointsPrice: ''
        });
    };

    const closeProductModal = () => {
        setIsModalOpen(false);
        setIsDuplicateMode(false);
    };

    const openModal = (product = null) => {
        setIsDuplicateMode(false);
        if (product) {
            setEditingProduct(product);
            setFormData({
                ...product,
                nameAr: product.nameAr || product.name || '',
                nameHe: product.nameHe || '',
                descriptionAr: product.descriptionAr || product.description || '',
                descriptionHe: product.descriptionHe || '',
                price: product.price.toString(),
                classification: product.classification || '',
                sizes: product.sizes || [],
                flavors: product.flavors || [],
                extras: product.extras || [],
                extraGroupIds: product.extraGroupIds || (product.extraGroupId ? [product.extraGroupId] : []),
                extraGroupConfigs: product.extraGroupConfigs || {},
                loyaltyPointsPrice: product.loyaltyPointsPrice ? product.loyaltyPointsPrice.toString() : ''
            });
            setImagePreview(product.image);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    /** فتح المودال لإنشاء نسخة من المنتج (بيانات مشابهة، يُضاف للمنتجات بعد الحفظ) */
    const handleDuplicate = (product) => {
        const copySuffix = ' (نسخة)';
        setEditingProduct(null);
        setFormData({
            nameAr: (product.nameAr || product.name || '').trim() + copySuffix,
            nameHe: (product.nameHe || '').trim() + copySuffix,
            descriptionAr: product.descriptionAr || product.description || '',
            descriptionHe: product.descriptionHe || '',
            price: product.price != null ? String(product.price) : '',
            category: product.category || '',
            classification: product.classification || '',
            image: product.image || '',
            rating: product.rating != null ? String(product.rating) : '4.5',
            sizes: Array.isArray(product.sizes) ? product.sizes.map(s => ({ ...s })) : [],
            flavors: Array.isArray(product.flavors) ? product.flavors.map(f => typeof f === 'string' ? { nameAr: f, nameHe: '' } : { ...f }) : [],
            extras: Array.isArray(product.extras) ? product.extras.map(e => ({ ...e })) : [],
            extraGroupIds: Array.isArray(product.extraGroupIds) ? [...product.extraGroupIds] : (product.extraGroupId ? [product.extraGroupId] : []),
            extraGroupConfigs: product.extraGroupConfigs ? { ...product.extraGroupConfigs } : {},
            loyaltyPointsPrice: product.loyaltyPointsPrice != null ? String(product.loyaltyPointsPrice) : ''
        });
        setImagePreview(product.image || null);
        setImageFile(null);
        setExtraImageFiles({});
        setIsDuplicateMode(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('products.deleteConfirm'))) {
            try {
                // Soft delete
                await updateDoc(doc(db, 'products', id), { isDeleted: true });
                fetchData();
            } catch (error) {
                console.error("Error deleting product: ", error);
            }
        }
    };

    const handleRestore = async (id) => {
        if (window.confirm(t('products.restoreConfirm'))) {
            try {
                await updateDoc(doc(db, 'products', id), { isDeleted: false });
                fetchData();
            } catch (error) {
                console.error("Error restoring product: ", error);
            }
        }
    };

    const handlePermanentDelete = async (id) => {
        if (window.confirm(t('products.permanentDeleteConfirm'))) {
            try {
                await deleteDoc(doc(db, 'products', id));
                fetchData();
            } catch (error) {
                console.error("Error permanently deleting product: ", error);
            }
        }
    };

    // Freeze Functions
    const handleFreezeClick = (product) => {
        setProductToFreeze(product);
        setFreezeType('tomorrow');
        setCustomFreezeDate('');
        setFreezeModalOpen(true);
    };

    const submitFreeze = async () => {
        if (!productToFreeze) return;

        let unfreezeAt = null;
        const now = new Date();

        if (freezeType === 'tomorrow') {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0); // Midnight
            unfreezeAt = tomorrow;
        } else if (freezeType === 'scheduled' && customFreezeDate) {
            unfreezeAt = new Date(customFreezeDate);
        }
        // If indefinite, unfreezeAt remains null but isFrozen is true

        try {
            await updateDoc(doc(db, 'products', productToFreeze.id), {
                isFrozen: true,
                freezeType,
                unfreezeAt: unfreezeAt ? unfreezeAt : null
            });
            setFreezeModalOpen(false);
            setProductToFreeze(null);
            fetchData();
        } catch (error) {
            console.error("Error freezing product: ", error);
        }
    };

    const unfreezeProduct = async (id) => {
        if (window.confirm(t('products.unfreezeConfirm'))) {
            try {
                await updateDoc(doc(db, 'products', id), {
                    isFrozen: false,
                    freezeType: null,
                    unfreezeAt: null
                });
                fetchData();
            } catch (error) {
                console.error("Error unfreezing product: ", error);
            }
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            (p.nameAr || p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    // --- Memoized Handlers ---

    const handleAddSize = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            sizes: [...(prev.sizes || []), { nameAr: '', nameHe: '', price: 0, isDefault: (prev.sizes || []).length === 0 }]
        }));
    }, []);

    const handleRemoveSize = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            sizes: (prev.sizes || []).filter((_, i) => i !== index)
        }));
    }, []);

    const handleUpdateSize = useCallback((index, field, value) => {
        setFormData(prev => {
            const newSizes = [...(prev.sizes || [])];
            if (field === 'isDefault' && value === true) {
                newSizes.forEach((s, i) => s.isDefault = i === index);
            } else {
                newSizes[index][field] = value;
            }
            return { ...prev, sizes: newSizes };
        });
    }, []);

    const handleAddFlavor = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            flavors: [...(prev.flavors || []), { nameAr: '', nameHe: '' }]
        }));
    }, []);

    const handleRemoveFlavor = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            flavors: (prev.flavors || []).filter((_, i) => i !== index)
        }));
    }, []);

    const handleUpdateFlavor = useCallback((index, field, value) => {
        setFormData(prev => {
            const newFlavors = [...(prev.flavors || [])];
            if (typeof newFlavors[index] === 'string') {
                newFlavors[index] = { nameAr: field === 'nameAr' ? value : '', nameHe: field === 'nameHe' ? value : '' };
            } else {
                newFlavors[index][field] = value;
            }
            return { ...prev, flavors: newFlavors };
        });
    }, []);

    const handleToggleExtraSelection = useCallback((extraId) => {
        setFormData(prev => {
            const currentExtras = prev.extras || [];
            const exists = currentExtras.find(ex => ex.id === extraId);
            if (exists) {
                return { ...prev, extras: currentExtras.filter(ex => ex.id !== extraId) };
            } else {
                const original = globalExtras.find(ex => ex.id === extraId);
                if (original) {
                    return {
                        ...prev,
                        extras: [...currentExtras, {
                            id: original.id,
                            nameAr: original.nameAr,
                            nameHe: original.nameHe,
                            price: original.price,
                            image: original.image,
                            isDefault: false
                        }]
                    };
                }
            }
            return prev;
        });
    }, [globalExtras]);

    const handleUpdateExtraOverride = useCallback((index, field, value) => {
        setFormData(prev => {
            const newExtras = [...(prev.extras || [])];
            newExtras[index][field] = value;
            return { ...prev, extras: newExtras };
        });
    }, []);

    return (
        <div className="product-manager">
            <div className="page-header">
                <div className="header-left">
                    <button className="add-btn" onClick={() => openModal()}>
                        <Plus size={20} />
                        <span>{t('products.addNew')}</span>
                    </button>

                    <div className="seed-controls" style={{ display: 'flex', gap: '8px', marginLeft: '1rem' }}>
                        <button
                            className="seed-btn glass"
                            onClick={handleSeedDatabase}
                            disabled={seeding}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                color: '#10B981',
                                padding: '10px 16px',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: seeding ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Database size={18} />
                            <span>{seeding ? t('common.loading') : 'إضافة بيانات تجريبية'}</span>
                        </button>

                        <button
                            className="clear-seed-btn glass"
                            onClick={handleClearSeed}
                            disabled={seeding}
                            title="حذف البيانات التجريبية فقط"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#EF4444',
                                padding: '10px 16px',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: seeding ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Trash2 size={18} />
                            <span>حذف بيانات Seed</span>
                        </button>
                    </div>

                    <button
                        className={`delete-toggle-btn ${showDeleted ? 'active' : ''}`}
                        onClick={() => setShowDeleted(!showDeleted)}
                        title={showDeleted ? t('products.backToProducts') : t('products.archive')}
                        style={{
                            marginLeft: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: showDeleted ? '#6366F1' : 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: showDeleted ? 'white' : '#6366F1',
                            padding: '10px 16px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        <Package size={18} />
                        <span>{showDeleted ? t('products.backToProducts') : t('products.archive')}</span>
                    </button>
                </div>
                <div className="header-right">
                    <div className="search-bar glass">
                        <Search size={18} color="#9CA3AF" />
                        <input
                            type="text"
                            placeholder={t('products.searchProducts')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {showDeleted && (
                <div className="archive-banner glass" style={{ marginBottom: '1rem', padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#6366F1', fontWeight: 600 }}>{t('products.archiveTitle')}</h3>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: '#64748B' }}>{t('products.archiveHint')}</p>
                </div>
            )}

            <div className="data-table-container glass">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t('products.product')}</th>
                            <th>{t('products.classification')}</th>
                            <th>{t('products.category')}</th>
                            <th>{t('products.price')}</th>
                            <th>{t('products.rating')}</th>
                            <th>{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map((product) => (
                            <ProductRow
                                key={product.id}
                                product={product}
                                t={t}
                                showDeleted={showDeleted}
                                unfreezeProduct={unfreezeProduct}
                                handleFreezeClick={handleFreezeClick}
                                openModal={openModal}
                                handleDuplicate={handleDuplicate}
                                handleDelete={handleDelete}
                                handleRestore={handleRestore}
                                handlePermanentDelete={handlePermanentDelete}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay product-modal-overlay">
                    <div className="modal-content glass modal-large product-modal">
                        <div className={`modal-header product-modal-header ${isDuplicateMode ? 'product-modal-header--duplicate' : ''}`}>
                            <div className="product-modal-title-wrap">
                                <h2>{isDuplicateMode ? t('products.duplicateProduct') : editingProduct ? t('products.editProduct') : t('products.addNew')}</h2>
                                {isDuplicateMode && <span className="product-modal-badge">{t('products.duplicate')}</span>}
                            </div>
                            <button type="button" className="modal-close-btn" onClick={closeProductModal} aria-label="Close"><X size={22} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form scrollable">
                            <div className="form-row">
                                <div className="form-group flex-2">
                                    <label>{t('products.nameAr')}</label>
                                    <input
                                        type="text"
                                        value={formData.nameAr}
                                        onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group flex-2">
                                    <label>{t('products.nameHe')}</label>
                                    <input
                                        type="text"
                                        value={formData.nameHe}
                                        onChange={(e) => setFormData({ ...formData, nameHe: e.target.value })}
                                        dir="rtl"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label>{t('products.price')} (₪)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group flex-1">
                                    <label>{t('products.loyaltyPointsPrice')}</label>
                                    <input
                                        type="number"
                                        value={formData.loyaltyPointsPrice}
                                        onChange={(e) => setFormData({ ...formData, loyaltyPointsPrice: e.target.value })}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label>{t('products.category')}</label>
                                    <div className="select-container">
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            required
                                        >
                                            <option value="">{t('products.category')}</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="select-icon" />
                                    </div>
                                </div>
                                <div className="form-group flex-1">
                                    <label>{t('products.classification')}</label>
                                    <div className="select-container">
                                        <select
                                            value={formData.classification}
                                            onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                                        >
                                            <option value="">{t('products.selectClassification')}</option>
                                            <option value="A">{t('products.classificationA')}</option>
                                            <option value="B">{t('products.classificationB')}</option>
                                            <option value="C">{t('products.classificationC')}</option>
                                            <option value="D">{t('products.classificationD')}</option>
                                            <option value="E">{t('products.classificationE')}</option>
                                            <option value="F">{t('products.classificationF')}</option>
                                        </select>
                                        <ChevronDown size={16} className="select-icon" />
                                    </div>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label>{t('products.rating')}</label>
                                    <input
                                        type="text"
                                        value={formData.rating}
                                        onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>{t('products.descriptionAr')}</label>
                                <textarea
                                    rows="2"
                                    value={formData.descriptionAr}
                                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label>{t('products.descriptionHe')}</label>
                                <textarea
                                    rows="2"
                                    value={formData.descriptionHe}
                                    onChange={(e) => setFormData({ ...formData, descriptionHe: e.target.value })}
                                    dir="rtl"
                                ></textarea>
                            </div>

                            <div className="form-group">
                                <label>{t('products.image')}</label>
                                <div className="image-upload-box" onClick={() => document.getElementById('imageInput').click()}>
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="preview-img" />
                                    ) : (
                                        <div className="upload-placeholder">
                                            <Upload size={32} />
                                            <p>{t('products.uploadImage')}</p>
                                        </div>
                                    )}
                                    <input
                                        id="imageInput"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            </div>

                            <hr className="form-divider" />

                            {/* Dynamic Options Sections */}
                            <SizesSection
                                sizes={formData.sizes}
                                t={t}
                                addSize={handleAddSize}
                                updateSize={handleUpdateSize}
                                removeSize={handleRemoveSize}
                            />

                            <FlavorsSection
                                flavors={formData.flavors}
                                t={t}
                                addFlavor={handleAddFlavor}
                                updateFlavor={handleUpdateFlavor}
                                removeFlavor={handleRemoveFlavor}
                            />

                            <ExtrasSection
                                formData={formData}
                                extraGroups={extraGroups}
                                globalExtras={globalExtras}
                                isExtrasExpanded={isExtrasExpanded}
                                setIsExtrasExpanded={setIsExtrasExpanded}
                                setFormData={setFormData}
                                toggleExtraSelection={handleToggleExtraSelection}
                                updateExtraOverride={handleUpdateExtraOverride}
                                t={t}
                            />

                            <div className="modal-footer">
                                <button type="submit" className="save-btn" disabled={uploading}>
                                    {uploading ? t('common.loading') : (
                                        <>
                                            <Save size={18} />
                                            <span>{editingProduct ? t('common.save') : t('common.add')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div >
                </div >
            )}

            {freezeModalOpen && (
                <div className="freeze-modal-overlay">
                    <div className="freeze-modal glass">
                        <div className="freeze-modal-header">
                            <h2>{t('products.freezeProduct')}</h2>
                            <button type="button" className="freeze-modal-close" onClick={() => setFreezeModalOpen(false)} aria-label="Close"><X size={22} /></button>
                        </div>
                        <div className="freeze-modal-body">
                            <div className="freeze-options">
                                <label className={`freeze-option ${freezeType === 'tomorrow' ? 'selected' : ''}`}>
                                    <input type="radio" name="freezeType" value="tomorrow" checked={freezeType === 'tomorrow'} onChange={(e) => setFreezeType(e.target.value)} />
                                    <span className="freeze-option-icon"><Clock size={20} /></span>
                                    <span className="freeze-option-text">{t('products.freezeTomorrow')}</span>
                                </label>

                                <div className="freeze-option-group">
                                    <label className={`freeze-option ${freezeType === 'scheduled' ? 'selected' : ''}`}>
                                        <input type="radio" name="freezeType" value="scheduled" checked={freezeType === 'scheduled'} onChange={(e) => setFreezeType(e.target.value)} />
                                        <span className="freeze-option-icon"><Calendar size={20} /></span>
                                        <span className="freeze-option-text">{t('products.freezeScheduled')}</span>
                                    </label>
                                    {freezeType === 'scheduled' && (
                                        <input
                                            type="datetime-local"
                                            className="freeze-date-input"
                                            value={customFreezeDate}
                                            onChange={(e) => setCustomFreezeDate(e.target.value)}
                                        />
                                    )}
                                </div>

                                <label className={`freeze-option ${freezeType === 'indefinite' ? 'selected' : ''}`}>
                                    <input type="radio" name="freezeType" value="indefinite" checked={freezeType === 'indefinite'} onChange={(e) => setFreezeType(e.target.value)} />
                                    <span className="freeze-option-icon"><Snowflake size={20} /></span>
                                    <span className="freeze-option-text">{t('products.freezeIndefinite')}</span>
                                </label>
                            </div>

                            <div className="freeze-modal-footer">
                                <button type="button" className="freeze-confirm-btn" onClick={submitFreeze} disabled={freezeType === 'scheduled' && !customFreezeDate}>
                                    {t('products.confirmFreeze')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default ProductManager;
