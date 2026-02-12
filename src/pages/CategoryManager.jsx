import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Tag as TagIcon,
    X,
    Save,
    Image as ImageIcon,
    GripVertical
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase/config';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    writeBatch
} from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './CategoryManager.css';

const CategoryManager = () => {
    const { t } = useTranslation();
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
            // First attempt to fetch ordered by 'order'
            let q = query(collection(db, 'categories'), orderBy('order'));
            let querySnapshot = await getDocs(q);
            let data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

            // Check if any categories are missing the 'order' field
            // (Firestore orderBy skips documents missing the field)
            const allSnap = await getDocs(collection(db, 'categories'));
            if (allSnap.size !== querySnapshot.size) {
                const allData = allSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                const missingOrder = allData.filter(cat => cat.order === undefined);

                if (missingOrder.length > 0) {
                    const batch = writeBatch(db);
                    const existingMaxOrder = data.length > 0 ? Math.max(...data.map(c => c.order || 0)) : -1;

                    missingOrder.forEach((cat, index) => {
                        const newOrder = existingMaxOrder + 1 + index;
                        batch.update(doc(db, 'categories', cat.id), { order: newOrder });
                    });

                    await batch.commit();
                    // Refetch after batch update
                    q = query(collection(db, 'categories'), orderBy('order'));
                    querySnapshot = await getDocs(q);
                    data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                }
            }

            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories: ", error);
        } finally {
            setLoading(false);
        }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const items = Array.from(categories);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update local state first for responsiveness
        const updatedItems = items.map((item, index) => ({ ...item, order: index }));
        setCategories(updatedItems);

        try {
            const batch = writeBatch(db);
            updatedItems.forEach((item, index) => {
                const docRef = doc(db, 'categories', item.id);
                batch.update(docRef, { order: index });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error updating category order: ", error);
            alert(t('common.errorSave') || 'Error updating order');
            fetchCategories(); // Revert to server state on error
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const categoryData = {
                nameAr: formData.nameAr || '',
                nameHe: formData.nameHe || '',
                icon: formData.icon || '',
                name: formData.nameAr || '' // Keep 'name' for compatibility
            };

            if (editingCategory) {
                await updateDoc(doc(db, 'categories', editingCategory.id), categoryData);
            } else {
                // Assign order to new category (at the end)
                const maxOrder = categories.length > 0
                    ? Math.max(...categories.map(c => c.order || 0))
                    : -1;
                categoryData.order = maxOrder + 1;
                await addDoc(collection(db, 'categories'), categoryData);
            }
            setIsModalOpen(false);
            setEditingCategory(null);
            setFormData({ nameAr: '', nameHe: '', icon: '' });
            fetchCategories();
            alert(t('common.successSave') || 'Category saved successfully');
        } catch (error) {
            console.error("Error saving category: ", error);
            alert(t('common.errorSave') || 'Error saving category');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('categories.deleteConfirm'))) {
            try {
                await deleteDoc(doc(db, 'categories', id));
                fetchCategories();
                alert(t('common.successDelete') || 'Category deleted successfully');
            } catch (error) {
                console.error("Error deleting category: ", error);
                alert(t('common.errorDelete') || 'Error deleting category');
            }
        }
    };

    const openModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                nameAr: category.nameAr || category.name || '',
                nameHe: category.nameHe || '',
                icon: category.icon || ''
            });
        } else {
            setEditingCategory(null);
            setFormData({ nameAr: '', nameHe: '', icon: '' });
        }
        setIsModalOpen(true);
    };

    const filteredCategories = categories.filter(cat => {
        const name = cat.nameAr || cat.name || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="category-manager">
            <div className="page-header">
                <div className="header-left">
                    <button className="add-btn" onClick={() => openModal()}>
                        <Plus size={20} />
                        <span>{t('categories.addNew')}</span>
                    </button>
                </div>
                <div className="header-right">
                    <div className="search-bar glass">
                        <Search size={18} color="#9CA3AF" />
                        <input
                            type="text"
                            placeholder={t('categories.searchCategories')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="categories-list" direction="vertical">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="category-grid"
                        >
                            {loading ? (
                                <div className="loading">{t('common.loading')}</div>
                            ) : filteredCategories.map((category, index) => (
                                <Draggable
                                    key={category.id}
                                    draggableId={category.id}
                                    index={index}
                                    isDragDisabled={!!searchTerm} // Disable drag when searching
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`category-card glass ${snapshot.isDragging ? 'dragging' : ''}`}
                                        >
                                            <div className="category-card-header">
                                                <div
                                                    {...provided.dragHandleProps}
                                                    className="drag-handle"
                                                    title={t('categories.reorder')}
                                                >
                                                    <GripVertical size={20} color="#9CA3AF" />
                                                </div>
                                                <div className="category-icon-box">
                                                    <span className="cat-emoji">{category.icon || <TagIcon size={24} />}</span>
                                                </div>
                                            </div>
                                            <div className="category-info">
                                                <h3>{category.nameAr || category.name}</h3>
                                                <p>{t('categories.browseProducts')}</p>
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
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass">
                        <div className="modal-header">
                            <h2>{editingCategory ? t('categories.editCategory') : t('categories.addNew')}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>{t('categories.nameAr')}</label>
                                <input
                                    type="text"
                                    value={formData.nameAr}
                                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                    required
                                    placeholder={t('categories.placeholderAr')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('categories.nameHe')}</label>
                                <input
                                    type="text"
                                    value={formData.nameHe}
                                    onChange={(e) => setFormData({ ...formData, nameHe: e.target.value })}
                                    dir="rtl"
                                    placeholder={t('categories.placeholderHe')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('categories.icon')}</label>
                                <input
                                    type="text"
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    placeholder={t('categories.placeholderIcon')}
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="save-btn">
                                    <Save size={18} />
                                    <span>{editingCategory ? t('common.save') : t('common.add')}</span>
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

