import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Save,
    Layers,
    Check
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
import './ExtraGroupsManager.css';

const ExtraGroupsManager = () => {
    const { t } = useTranslation();
    const [groups, setGroups] = useState([]);
    const [extras, setExtras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        nameAr: '',
        nameHe: '',
        extraIds: []
    });
    // Extras defined inside the group (manually created for this group)
    const [groupExtras, setGroupExtras] = useState([
        { id: null, nameAr: '', nameHe: '', price: '', image: '', file: null }
    ]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [gSnap, eSnap] = await Promise.all([
                getDocs(query(collection(db, 'extraGroups'), orderBy('nameAr'))),
                getDocs(query(collection(db, 'extras'), orderBy('nameAr')))
            ]);
            setGroups(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setExtras(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching extra groups / extras:', error);
        } finally {
            setLoading(false);
        }
    };

    const uploadImage = async (file) => {
        const storageRef = ref(storage, `extras/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nameAr.trim()) return;

        setUploading(true);
        try {
            const basePayload = {
                nameAr: formData.nameAr.trim(),
                nameHe: formData.nameHe.trim()
            };

            // 1) Create or update group (without extras for now)
            let groupId = editingGroup?.id || null;
            if (groupId) {
                await updateDoc(doc(db, 'extraGroups', groupId), basePayload);
            } else {
                const groupRef = await addDoc(collection(db, 'extraGroups'), {
                    ...basePayload,
                    extraIds: []
                });
                groupId = groupRef.id;
            }

            // 2) Create / update extras that belong to this group
            const validExtras = (groupExtras || []).filter(
                (ex) => ex.nameAr && String(ex.nameAr).trim() !== ''
            );

            const extraIds = [];
            const embeddedExtras = [];

            for (const ex of validExtras) {
                let imageUrl = ex.image || '';
                if (ex.file) {
                    try {
                        imageUrl = await uploadImage(ex.file);
                    } catch (err) {
                        console.error('Error uploading extra image:', err);
                    }
                }

                const payload = {
                    nameAr: ex.nameAr.trim(),
                    nameHe: (ex.nameHe || '').trim(),
                    price: parseFloat(ex.price) || 0,
                    image: imageUrl || '',
                    groupId
                };

                let extraId;
                if (ex.id) {
                    await updateDoc(doc(db, 'extras', ex.id), payload);
                    extraId = ex.id;
                } else {
                    const extraRef = await addDoc(collection(db, 'extras'), payload);
                    extraId = extraRef.id;
                }

                extraIds.push(extraId);
                embeddedExtras.push({
                    id: extraId,
                    nameAr: payload.nameAr,
                    nameHe: payload.nameHe,
                    price: payload.price,
                    image: payload.image
                });
            }

            // 3) Update group with its extras
            if (groupId) {
                await updateDoc(doc(db, 'extraGroups', groupId), {
                    extraIds,
                    extras: embeddedExtras
                });
            }

            handleCloseModal();
            fetchData();
        } catch (error) {
            console.error('Error saving extra group:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('extraGroups.deleteConfirm'))) return;
        try {
            await deleteDoc(doc(db, 'extraGroups', id));
            fetchData();
        } catch (error) {
            console.error('Error deleting extra group:', error);
        }
    };

    const handleCloseModal = () => {
            setIsModalOpen(false);
            setEditingGroup(null);
            setFormData({ nameAr: '', nameHe: '', extraIds: [] });
            setGroupExtras([{ id: null, nameAr: '', nameHe: '', price: '', image: '', file: null }]);
    };

    const openModal = (group = null) => {
        if (group) {
            setEditingGroup(group);
            setFormData({
                nameAr: group.nameAr || '',
                nameHe: group.nameHe || '',
                extraIds: Array.isArray(group.extraIds) ? [...group.extraIds] : []
            });

            // Build editable extras for this group
            let initialExtras = [];
            if (Array.isArray(group.extras) && group.extras.length > 0) {
                initialExtras = group.extras.map((ex) => ({
                    id: ex.id || null,
                    nameAr: ex.nameAr || '',
                    nameHe: ex.nameHe || '',
                    price: ex.price != null ? String(ex.price) : '',
                    image: ex.image || '',
                    file: null
                }));
            } else if (Array.isArray(group.extraIds) && group.extraIds.length > 0) {
                initialExtras = group.extraIds
                    .map((id) => extras.find((e) => e.id === id))
                    .filter(Boolean)
                    .map((ex) => ({
                        id: ex.id,
                        nameAr: ex.nameAr || '',
                        nameHe: ex.nameHe || '',
                        price: ex.price != null ? String(ex.price) : '',
                        image: ex.image || '',
                        file: null
                    }));
            }

            if (initialExtras.length === 0) {
                initialExtras = [{ id: null, nameAr: '', nameHe: '', price: '', image: '', file: null }];
            }
            setGroupExtras(initialExtras);
        } else {
            setEditingGroup(null);
            setFormData({ nameAr: '', nameHe: '', extraIds: [] });
            setGroupExtras([{ id: null, nameAr: '', nameHe: '', price: '', image: '', file: null }]);
        }
        setIsModalOpen(true);
    };

    // Handlers for extras defined inside the group
    const updateGroupExtraField = (index, field, value) => {
        setGroupExtras(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const addExtraRow = () => {
        setGroupExtras(prev => [...prev, { id: null, nameAr: '', nameHe: '', price: '', image: '', file: null }]);
    };

    const removeExtraRow = (index) => {
        setGroupExtras(prev => prev.filter((_, i) => i !== index));
    };

    const handleExtraImageChange = (index, file) => {
        if (!file) return;
        const previewUrl = URL.createObjectURL(file);
        setGroupExtras(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], file, image: previewUrl };
            return copy;
        });
    };

    const filteredGroups = groups.filter(g =>
        (g.nameAr && g.nameAr.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (g.nameHe && g.nameHe && g.nameHe.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="extra-groups-manager">
            <div className="page-header">
                <div className="header-left">
                    <h1>{t('extraGroups.title')}</h1>
                    <p className="subtitle">{t('extraGroups.subtitle')}</p>
                    <button type="button" className="add-btn" onClick={() => openModal()}>
                        <Plus size={20} />
                        <span>{t('extraGroups.addGroup')}</span>
                    </button>
                </div>
                <div className="header-right">
                    <div className="search-bar glass">
                        <Search size={18} color="#9CA3AF" />
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading">{t('common.loading')}</div>
            ) : filteredGroups.length === 0 ? (
                <div className="empty-state">{t('extraGroups.noGroups')}</div>
            ) : (
                <div className="groups-grid">
                    {filteredGroups.map((group) => {
                        const count = Array.isArray(group.extraIds) ? group.extraIds.length : 0;
                        const extraNames = (group.extraIds || [])
                            .map(id => extras.find(e => e.id === id))
                            .filter(Boolean)
                            .slice(0, 3)
                            .map(e => e.nameAr)
                            .join('، ');
                        return (
                            <div key={group.id} className="group-card glass">
                                <div className="group-card-header">
                                    <Layers size={24} className="group-icon" />
                                    <div className="group-info">
                                        <h3>{group.nameAr}</h3>
                                        {group.nameHe && <span className="name-he">{group.nameHe}</span>}
                                    </div>
                                </div>
                                <div className="group-meta">
                                    <span className="count-badge">{count} {t('extraGroups.extrasCount')}</span>
                                    {extraNames && <p className="extras-preview">{extraNames}{count > 3 ? '...' : ''}</p>}
                                </div>
                                <div className="group-actions">
                                    <button type="button" className="edit-btn" onClick={() => openModal(group)} title={t('common.edit')}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button type="button" className="delete-btn" onClick={() => handleDelete(group.id)} title={t('common.delete')}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass modal-extra-groups">
                        <div className="modal-header">
                            <h2>{editingGroup ? t('extraGroups.editGroup') : t('extraGroups.addGroup')}</h2>
                            <button type="button" onClick={handleCloseModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>{t('extraGroups.nameAr')}</label>
                                <input
                                    type="text"
                                    value={formData.nameAr}
                                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                    placeholder={t('extraGroups.nameArPlaceholder')}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('extraGroups.nameHe')}</label>
                                <input
                                    type="text"
                                    value={formData.nameHe}
                                    onChange={(e) => setFormData({ ...formData, nameHe: e.target.value })}
                                    placeholder={t('extraGroups.nameHePlaceholder')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('extraGroups.selectExtras')}</label>
                                <p className="help-text">{t('extraGroups.selectExtrasHelp')}</p>
                                <div className="extras-checkbox-list">
                                    {groupExtras.map((ex, index) => (
                                        <div key={ex.id || index} className="extra-inline-row">
                                            <div className="extra-image-cell">
                                                {ex.image ? (
                                                    <img src={ex.image} alt={ex.nameAr || 'extra'} className="extra-thumb" />
                                                ) : (
                                                    <span className="extra-thumb placeholder">+</span>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleExtraImageChange(index, e.target.files?.[0])}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                className="extra-input name-ar"
                                                placeholder={t('extraGroups.extraNameArPlaceholder')}
                                                value={ex.nameAr}
                                                onChange={(e) => updateGroupExtraField(index, 'nameAr', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="extra-input name-he"
                                                placeholder={t('extraGroups.extraNameHePlaceholder')}
                                                value={ex.nameHe}
                                                onChange={(e) => updateGroupExtraField(index, 'nameHe', e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                className="extra-input price"
                                                placeholder={t('extraGroups.extraPricePlaceholder')}
                                                value={ex.price}
                                                onChange={(e) => updateGroupExtraField(index, 'price', e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={() => removeExtraRow(index)}
                                                title={t('common.delete')}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="add-inner-extra-btn"
                                        onClick={addExtraRow}
                                    >
                                        <Plus size={16} />
                                        <span>{t('extraGroups.addInnerExtra')}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="cancel-btn" onClick={handleCloseModal}>{t('common.cancel')}</button>
                                <button type="submit" className="save-btn" disabled={uploading}>
                                    {uploading ? t('common.loading') : <><Save size={18} /><span>{editingGroup ? t('common.save') : t('common.add')}</span></>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExtraGroupsManager;
