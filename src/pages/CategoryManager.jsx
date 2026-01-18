import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Tag as TagIcon,
    X,
    Save,
    Image as ImageIcon
} from 'lucide-react';
import { db } from '../firebase/config';
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
import './CategoryManager.css';

const CategoryManager = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({ nameAr: '', nameHe: '', icon: '' });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const q = query(collection(db, 'categories'), orderBy('name'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories: ", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const categoryData = {
                ...formData,
                name: formData.nameAr // Keep 'name' for compatibility
            };

            if (editingCategory) {
                await updateDoc(doc(db, 'categories', editingCategory.id), categoryData);
            } else {
                await addDoc(collection(db, 'categories'), categoryData);
            }
            setIsModalOpen(false);
            setEditingCategory(null);
            setIsModalOpen(false);
            setEditingCategory(null);
            setFormData({ nameAr: '', nameHe: '', icon: '' });
            fetchCategories();
        } catch (error) {
            console.error("Error saving category: ", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
            try {
                await deleteDoc(doc(db, 'categories', id));
                fetchCategories();
            } catch (error) {
                console.error("Error deleting category: ", error);
            }
        }
    };

    const openModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                nameAr: category.nameAr || category.name || '',
                nameHe: category.nameHe || '',
                icon: category.icon
            });
        } else {
            setEditingCategory(null);
            setFormData({ nameAr: '', nameHe: '', icon: '' });
        }
        setIsModalOpen(true);
    };

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="category-manager">
            <div className="page-header">
                <div className="header-left">
                    <button className="add-btn" onClick={() => openModal()}>
                        <Plus size={20} />
                        <span>إضافة تصنيف جديد</span>
                    </button>
                </div>
                <div className="header-right">
                    <div className="search-bar glass">
                        <Search size={18} color="#9CA3AF" />
                        <input
                            type="text"
                            placeholder="البحث عن تصنيف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="category-grid">
                {loading ? (
                    <div className="loading">جاري التحميل...</div>
                ) : filteredCategories.map((category) => (
                    <div key={category.id} className="category-card glass">
                        <div className="category-icon-box">
                            <span className="cat-emoji">{category.icon || <TagIcon size={24} />}</span>
                        </div>
                        <div className="category-info">
                            <h3>{category.nameAr || category.name}</h3>
                            <p>تصفح المنتجات في هذا القسم</p>
                        </div>
                        <div className="category-actions">
                            <button className="edit-btn" onClick={() => openModal(category)}>
                                <Edit2 size={16} />
                            </button>
                            <button className="delete-btn" onClick={() => handleDelete(category.id)}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass">
                        <div className="modal-header">
                            <h2>{editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>اسم التصنيف (العربية)</label>
                                <input
                                    type="text"
                                    value={formData.nameAr}
                                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                    required
                                    placeholder="مثال: آيس كريم"
                                />
                            </div>
                            <div className="form-group">
                                <label>اسم التصنيف (العبرية)</label>
                                <input
                                    type="text"
                                    value={formData.nameHe}
                                    onChange={(e) => setFormData({ ...formData, nameHe: e.target.value })}
                                    dir="rtl"
                                    placeholder="לדוגמה: גלידה"
                                />
                            </div>
                            <div className="form-group">
                                <label>الأيقونة (إيموجي)</label>
                                <input
                                    type="text"
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    placeholder="مثال: 🍦"
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="save-btn">
                                    <Save size={18} />
                                    <span>{editingCategory ? 'حفظ التعديلات' : 'إضافة'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryManager;
