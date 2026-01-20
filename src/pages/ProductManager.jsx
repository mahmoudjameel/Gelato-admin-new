import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Package,
    X,
    Save,
    Upload,
    ChevronDown,
    Trash,
    Check,
    Image as ImageIcon
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
    orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './ProductManager.css';

const ProductManager = () => {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [extraImageFiles, setExtraImageFiles] = useState({}); // { index: File }
    const [uploading, setUploading] = useState(false);

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
        extras: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const pQ = query(collection(db, 'products'), orderBy('name'));
            const cQ = query(collection(db, 'categories'), orderBy('name'));

            const [pSnapshot, cSnapshot] = await Promise.all([getDocs(pQ), getDocs(cQ)]);

            setProducts(pSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setCategories(cSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching data: ", error);
        } finally {
            setLoading(false);
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
                extras: updatedExtras
            };

            if (editingProduct) {
                await updateDoc(doc(db, 'products', editingProduct.id), productData);
            } else {
                await addDoc(collection(db, 'products'), productData);
            }

            setIsModalOpen(false);
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

    const addExtra = () => {
        setFormData({
            ...formData,
            extras: [...(formData.extras || []), { nameAr: '', nameHe: '', price: 0, isDefault: false, image: '' }]
        });
    };

    const removeExtra = (index) => {
        const newExtras = (formData.extras || []).filter((_, i) => i !== index);
        // Also remove matched file if exists
        const newFiles = { ...extraImageFiles };
        delete newFiles[index];
        setExtraImageFiles(newFiles);
        setFormData({ ...formData, extras: newExtras });
    };

    const updateExtra = (index, field, value) => {
        const newExtras = [...(formData.extras || [])];
        newExtras[index][field] = value;
        setFormData({ ...formData, extras: newExtras });
    };

    const handleExtraImageChange = (index, file) => {
        if (file) {
            setExtraImageFiles(prev => ({ ...prev, [index]: file }));
        }
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
            extras: []
        });
    };

    const openModal = (product = null) => {
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
                extras: product.extras || []
            });
            setImagePreview(product.image);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('products.deleteConfirm'))) {
            try {
                await deleteDoc(doc(db, 'products', id));
                fetchData();
            } catch (error) {
                console.error("Error deleting product: ", error);
            }
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="product-manager">
            <div className="page-header">
                <div className="header-left">
                    <button className="add-btn" onClick={() => openModal()}>
                        <Plus size={20} />
                        <span>{t('products.addNew')}</span>
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
                        {loading ? (
                            <tr><td colSpan="6" className="loading">{t('common.loading')}</td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan="6" className="empty">{t('common.noData')}</td></tr>
                        ) : filteredProducts.map((product) => (
                            <tr key={product.id}>
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
                                        <button className="edit-btn" onClick={() => openModal(product)}><Edit2 size={16} /></button>
                                        <button className="delete-btn" onClick={() => handleDelete(product.id)}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass modal-large">
                        <div className="modal-header">
                            <h2>{editingProduct ? t('products.editProduct') : t('products.addNew')}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
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
                            <div className="dynamic-section">
                                <div className="section-header-modal">
                                    <h3>{t('products.sizes')}</h3>
                                    <button type="button" className="btn-icon-add" onClick={addSize}><Plus size={16} /></button>
                                </div>
                                {(formData.sizes || []).map((size, index) => (
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

                            <div className="dynamic-section">
                                <div className="section-header-modal">
                                    <h3>{t('products.flavors')}</h3>
                                    <button type="button" className="btn-icon-add" onClick={addFlavor}><Plus size={16} /></button>
                                </div>
                                <div className="flavors-grid-modal">
                                    {(formData.flavors || []).map((flavor, index) => (
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

                            <div className="dynamic-section">
                                <div className="section-header-modal">
                                    <h3>{t('products.extras')}</h3>
                                    <button type="button" className="btn-icon-add" onClick={addExtra}><Plus size={16} /></button>
                                </div>
                                {(formData.extras || []).map((extra, index) => (
                                    <div key={index} className="dynamic-row extras-row-enhanced">
                                        <div className="extra-image-upload">
                                            <label htmlFor={`extra-img-${index}`} className="extra-img-label">
                                                {extraImageFiles[index] ? (
                                                    <img src={URL.createObjectURL(extraImageFiles[index])} alt="extra" className="extra-thumb" />
                                                ) : extra.image ? (
                                                    <img src={extra.image} alt="extra" className="extra-thumb" />
                                                ) : (
                                                    <ImageIcon size={18} />
                                                )}
                                            </label>
                                            <input
                                                id={`extra-img-${index}`}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleExtraImageChange(index, e.target.files[0])}
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                        <input
                                            placeholder={t('products.extraNameAr')}
                                            value={extra.nameAr || extra.name}
                                            onChange={(e) => updateExtra(index, 'nameAr', e.target.value)}
                                        />
                                        <input
                                            placeholder={t('products.extraNameHe')}
                                            value={extra.nameHe || ''}
                                            onChange={(e) => updateExtra(index, 'nameHe', e.target.value)}
                                            dir="rtl"
                                        />
                                        <input
                                            type="number"
                                            placeholder={t('products.price')}
                                            value={extra.price}
                                            onChange={(e) => updateExtra(index, 'price', parseFloat(e.target.value))}
                                        />
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={extra.isDefault}
                                                onChange={(e) => updateExtra(index, 'isDefault', e.target.checked)}
                                            />
                                            <span>{t('products.default')}</span>
                                        </label>
                                        <button type="button" className="btn-remove" onClick={() => removeExtra(index)}><Trash size={16} /></button>
                                    </div>
                                ))}
                            </div>

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
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManager;
