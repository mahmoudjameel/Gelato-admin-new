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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            const payload = {
                nameAr: formData.nameAr.trim(),
                nameHe: formData.nameHe.trim(),
                extraIds: formData.extraIds || []
            };
            if (editingGroup) {
                await updateDoc(doc(db, 'extraGroups', editingGroup.id), payload);
            } else {
                await addDoc(collection(db, 'extraGroups'), payload);
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
    };

    const openModal = (group = null) => {
        if (group) {
            setEditingGroup(group);
            setFormData({
                nameAr: group.nameAr || '',
                nameHe: group.nameHe || '',
                extraIds: Array.isArray(group.extraIds) ? [...group.extraIds] : []
            });
        } else {
            setEditingGroup(null);
            setFormData({ nameAr: '', nameHe: '', extraIds: [] });
        }
        setIsModalOpen(true);
    };

    const toggleExtraInGroup = (extraId) => {
        const current = formData.extraIds || [];
        const next = current.includes(extraId)
            ? current.filter(id => id !== extraId)
            : [...current, extraId];
        setFormData({ ...formData, extraIds: next });
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
                                    {extras.map((extra) => {
                                        const checked = (formData.extraIds || []).includes(extra.id);
                                        return (
                                            <label key={extra.id} className={`extra-check-item ${checked ? 'checked' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleExtraInGroup(extra.id)}
                                                />
                                                <span className="extra-name">{extra.nameAr}</span>
                                                <span className="extra-price">{extra.price} ₪</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {extras.length === 0 && <p className="no-extras-msg">{t('extraGroups.noExtrasYet')}</p>}
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
