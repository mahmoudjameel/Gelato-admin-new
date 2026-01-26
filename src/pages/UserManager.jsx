import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, setDoc, serverTimestamp, where, updateDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '../firebase/config';
import app from '../firebase/config'; // Import the default app to get config
import { Trash2, Eye, X, Phone, Mail, Calendar, User, Clock, Plus, Shield, Briefcase, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './UserManager.css';

const UserManager = () => {
    const { t, i18n } = useTranslation();
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [isEditingPoints, setIsEditingPoints] = useState(false);
    const [newPoints, setNewPoints] = useState(0);
    const [userOrderCount, setUserOrderCount] = useState(0);
    const [isSavingPoints, setIsSavingPoints] = useState(false);
    const [loyaltySettings, setLoyaltySettings] = useState(null);

    // Add User State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        username: '',
        password: '',
        displayName: '',
        phoneNumber: '',
        role: 'customer' // Default role
    });

    // Filter State
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        fetchUsers();
        fetchLoyaltySettings();
    }, []);

    const fetchLoyaltySettings = async () => {
        try {
            const docSnap = await getDocs(query(collection(db, 'settings'), where('__name__', '==', 'loyalty')));
            if (!docSnap.empty) {
                setLoyaltySettings(docSnap.docs[0].data());
            }
        } catch (error) {
            console.error("Error fetching loyalty settings:", error);
        }
    };

    useEffect(() => {
        if (roleFilter === 'all') {
            setFilteredUsers(users);
        } else {
            setFilteredUsers(users.filter(user => (user.role || 'customer') === roleFilter));
        }
    }, [users, roleFilter]);

    const fetchUsers = async () => {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef);
            const snapshot = await getDocs(q);

            const usersList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side sorting by createdAt desc for now
            usersList.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            setUsers(usersList);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setIsAddingUser(true);

        let secondaryApp = null;
        try {
            // Initialize a secondary Firebase app to create user without logging out admin
            secondaryApp = initializeApp(app.options, 'SecondaryApp');
            const secondaryAuth = getAuth(secondaryApp);

            // Only 'cashier' uses username-based store email. Others use real email.
            let authEmail = newUser.email;
            if (newUser.role === 'cashier' && newUser.username) {
                authEmail = `${newUser.username.toLowerCase()}@store.local`;
            }

            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, newUser.password);
            const uid = userCredential.user.uid;

            // Create user document in Firestore
            await setDoc(doc(db, 'users', uid), {
                displayName: newUser.displayName,
                email: authEmail,
                username: newUser.role === 'cashier' ? newUser.username : null,
                phoneNumber: newUser.phoneNumber,
                role: newUser.role,
                createdAt: serverTimestamp(),
                photoURL: null,
                lastLoginAt: null
            });

            await signOut(secondaryAuth);

            const roleName = t(`users.roles.${newUser.role}`);
            alert(t('users.successAddWithRole', { role: roleName }));
            setIsAddModalOpen(false);
            setNewUser({ email: '', username: '', password: '', displayName: '', phoneNumber: '', role: 'customer' });
            fetchUsers();

        } catch (error) {
            console.error('Error creating user:', error);
            alert(t('users.errorAdd', { error: error.message }));
        } finally {
            setIsAddingUser(false);
            if (secondaryApp) {
                try {
                    await deleteApp(secondaryApp);
                } catch (err) {
                    console.log('Error deleting secondary app', err);
                }
            }
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm(t('users.deleteConfirm'))) return;

        setIsDeleteLoading(true);
        try {
            await deleteDoc(doc(db, 'users', userId));
            const updatedUsers = users.filter(user => user.id !== userId);
            setUsers(updatedUsers);
            if (selectedUser?.id === userId) setSelectedUser(null);
        } finally {
            setIsDeleteLoading(false);
        }
    };

    useEffect(() => {
        if (selectedUser) {
            fetchUserOrderCount(selectedUser.id);
            setNewPoints(selectedUser.points || 0);
            setIsEditingPoints(false);
        }
    }, [selectedUser]);

    const fetchUserOrderCount = async (userId) => {
        try {
            const q = query(collection(db, 'orders'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            setUserOrderCount(snapshot.size);
        } catch (error) {
            console.error('Error fetching user order count:', error);
            setUserOrderCount(0);
        }
    };

    const handleSavePoints = async () => {
        if (!selectedUser) return;
        setIsSavingPoints(true);
        try {
            const userRef = doc(db, 'users', selectedUser.id);
            const updates = { points: Number(newPoints) };

            // Permanent Level logic for manual adjustment
            if (loyaltySettings) {
                let currentLevel = selectedUser.membershipLevel || 'Bronze';
                let newLevel = currentLevel;
                const pointsValue = Number(newPoints);

                if (pointsValue >= (loyaltySettings.goldThreshold || 3000)) {
                    newLevel = 'Gold';
                } else if (pointsValue >= (loyaltySettings.silverThreshold || 1000)) {
                    if (currentLevel !== 'Gold') newLevel = 'Silver';
                }

                if (newLevel !== currentLevel) {
                    updates.membershipLevel = newLevel;
                }
            }

            await updateDoc(userRef, updates);

            // Update local state
            setUsers(current => current.map(u =>
                u.id === selectedUser.id ? { ...u, ...updates } : u
            ));
            setSelectedUser(prev => ({ ...prev, ...updates }));
            setIsEditingPoints(false);
            alert(t('common.save'));
        } catch (error) {
            console.error('Error saving points:', error);
            alert(t('common.error'));
        } finally {
            setIsSavingPoints(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'he-IL';
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString(locale);
        }
        return new Date(timestamp).toLocaleDateString(locale);
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'he-IL';
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        }
        return new Date(timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    };

    const getRoleBadge = (role) => {
        const r = role || 'customer';
        switch (r) {
            case 'admin': return <span className="role-badge admin"><Shield size={12} /> {t('users.roles.admin')}</span>;
            case 'cashier': return <span className="role-badge cashier"><Briefcase size={12} /> {t('users.roles.cashier')}</span>;
            case 'accountant': return <span className="role-badge accountant"><Calculator size={12} /> {t('users.roles.accountant')}</span>;
            default: return <span className="role-badge customer"><User size={12} /> {t('users.roleCustomer')}</span>;
        }
    };

    if (loading) {
        return <div className="loading-container">{t('users.loadingUsers')}</div>;
    }

    return (
        <div className="user-manager-container">
            <div className="page-header">
                <div className="header-title">
                    <h1>{t('users.title', { count: users.length })}</h1>
                </div>
                <button className="add-user-btn" onClick={() => setIsAddModalOpen(true)}>
                    <Plus size={20} />
                    <span>{t('users.addUserBtn')}</span>
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${roleFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setRoleFilter('all')}
                >
                    {t('users.allTab')}
                </button>
                <button
                    className={`filter-tab ${roleFilter === 'admin' ? 'active' : ''}`}
                    onClick={() => setRoleFilter('admin')}
                >
                    <Shield size={16} /> {t('users.adminsTab')}
                </button>
                <button
                    className={`filter-tab ${roleFilter === 'cashier' ? 'active' : ''}`}
                    onClick={() => setRoleFilter('cashier')}
                >
                    <Briefcase size={16} /> {t('users.cashiersTab')}
                </button>
                <button
                    className={`filter-tab ${roleFilter === 'accountant' ? 'active' : ''}`}
                    onClick={() => setRoleFilter('accountant')}
                >
                    <Calculator size={16} /> {t('users.accountantsTab')}
                </button>
                <button
                    className={`filter-tab ${roleFilter === 'customer' ? 'active' : ''}`}
                    onClick={() => setRoleFilter('customer')}
                >
                    <User size={16} /> {t('users.customersTab')}
                </button>
            </div>

            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>{t('users.tableUser')}</th>
                            <th>{t('users.tableRole')}</th>
                            <th>{t('users.tableEmail')}</th>
                            <th>{t('users.tablePhone')}</th>
                            <th>{t('users.tableDate')}</th>
                            <th>{t('users.tableActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <tr key={user.id} onClick={() => setSelectedUser(user)} className="clickable-row">
                                    <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
                                        ) : (
                                            <div className="user-avatar" style={{ backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                                <User size={16} />
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span>{user.displayName || t('users.noName')}</span>
                                            {user.username && <small style={{ color: '#9ca3af' }}>@{user.username}</small>}
                                        </div>
                                    </td>
                                    <td>{getRoleBadge(user.role)}</td>
                                    <td>{user.email || '-'}</td>
                                    <td style={{ direction: 'ltr', textAlign: 'right' }}>{user.phoneNumber || '-'}</td>
                                    <td>{formatDate(user.createdAt)}</td>
                                    <td>
                                        <div className="actions-cell" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                className="icon-btn view-btn"
                                                onClick={() => setSelectedUser(user)}
                                                title={t('common.actions')}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                className="icon-btn delete-btn"
                                                onClick={() => handleDeleteUser(user.id)}
                                                disabled={isDeleteLoading}
                                                title={t('common.delete')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="no-users">{t('users.noUsers')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={() => setIsAddModalOpen(false)}>
                            <X size={20} />
                        </button>

                        <div className="modal-header">
                            <h2>{t('users.addModalTitle')}</h2>
                        </div>

                        <form onSubmit={handleAddUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>{t('users.fullName')}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newUser.displayName}
                                        onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                                        required
                                        placeholder={t('users.fullNamePlaceholder')}
                                    />
                                </div>

                                {newUser.role === 'cashier' ? (
                                    <div className="form-group">
                                        <label>{t('users.username')}</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={newUser.username}
                                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value.replace(/\s/g, '') })}
                                            required
                                            placeholder={t('users.usernamePlaceholder')}
                                        />
                                        <small className="form-help">{t('users.usernameTooltip')}</small>
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label>{t('users.emailLogin')}</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            required
                                            placeholder={t('users.emailPlaceholder')}
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>{t('users.password')}</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        required
                                        minLength={6}
                                        placeholder="******"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>{t('users.phoneOptional')}</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={newUser.phoneNumber}
                                        onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                                        placeholder="05xxxxxxxx"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>{t('users.roleSelection')}</label>
                                    <div className="role-selector">
                                        <label className={`role-option ${newUser.role === 'customer' ? 'selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value="customer"
                                                checked={newUser.role === 'customer'}
                                                onChange={() => setNewUser({ ...newUser, role: 'customer' })}
                                            />
                                            <User size={18} />
                                            <span>{t('users.roleCustomer')}</span>
                                        </label>
                                        <label className={`role-option ${newUser.role === 'cashier' ? 'selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value="cashier"
                                                checked={newUser.role === 'cashier'}
                                                onChange={() => setNewUser({ ...newUser, role: 'cashier' })}
                                            />
                                            <Briefcase size={18} />
                                            <span>{t('users.roleCashier')}</span>
                                        </label>
                                        <label className={`role-option ${newUser.role === 'accountant' ? 'selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value="accountant"
                                                checked={newUser.role === 'accountant'}
                                                onChange={() => setNewUser({ ...newUser, role: 'accountant' })}
                                            />
                                            <Calculator size={18} />
                                            <span>{t('users.roleAccountant')}</span>
                                        </label>
                                        <label className={`role-option ${newUser.role === 'admin' ? 'selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value="admin"
                                                checked={newUser.role === 'admin'}
                                                onChange={() => setNewUser({ ...newUser, role: 'admin' })}
                                            />
                                            <Shield size={18} />
                                            <span>{t('users.roleAdminTitle')}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="submit"
                                    className="add-user-submit-btn"
                                    disabled={isAddingUser}
                                >
                                    {isAddingUser ? t('users.adding') : t('users.saveAndAdd')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Details Modal (Existing) */}
            {selectedUser && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={() => setSelectedUser(null)}>
                            <X size={20} />
                        </button>

                        <div className="modal-header">
                            <div className="modal-avatar-container">
                                {selectedUser.photoURL ? (
                                    <img src={selectedUser.photoURL} alt={selectedUser.displayName} className="modal-avatar" />
                                ) : (
                                    <div className="modal-avatar placeholder">
                                        <User size={40} />
                                    </div>
                                )}
                            </div>
                            <h2>{selectedUser.displayName || t('users.noName')}</h2>
                            <span className="user-id">{t('users.userId')}: {selectedUser.id}</span>
                            <div style={{ marginTop: '10px' }}>
                                {getRoleBadge(selectedUser.role)}
                            </div>
                        </div>

                        <div className="modal-body">
                            <div className="info-group">
                                <label><Mail size={16} /> {t('users.email')}</label>
                                <p>{selectedUser.email || '-'}</p>
                            </div>

                            <div className="info-group">
                                <label><Phone size={16} /> {t('users.phone')}</label>
                                <p style={{ direction: 'ltr', textAlign: 'right' }}>{selectedUser.phoneNumber || '-'}</p>
                            </div>

                            <div className="info-group">
                                <label><Calendar size={16} /> {t('users.tableDate')}</label>
                                <p>{formatDate(selectedUser.createdAt)} {formatTime(selectedUser.createdAt)}</p>
                            </div>

                            <div className="info-group">
                                <label><Clock size={16} /> {t('users.lastSeen')}</label>
                                <p>{selectedUser.lastLoginAt ? `${formatDate(selectedUser.lastLoginAt)} ${formatTime(selectedUser.lastLoginAt)}` : '-'}</p>
                            </div>

                            <div className="loyalty-stats-section">
                                <div className="stat-box">
                                    <label>{t('users.totalOrders')}</label>
                                    <div className="stat-value">{userOrderCount}</div>
                                </div>
                                <div className="stat-box">
                                    <label>{t('users.loyaltyPoints')}</label>
                                    {isEditingPoints ? (
                                        <div className="edit-points-form">
                                            <input
                                                type="number"
                                                value={newPoints}
                                                onChange={(e) => setNewPoints(e.target.value)}
                                                className="points-input"
                                            />
                                            <div className="edit-actions">
                                                <button onClick={handleSavePoints} disabled={isSavingPoints} className="save-points-btn">
                                                    {isSavingPoints ? t('common.loading') : t('users.savePoints')}
                                                </button>
                                                <button onClick={() => setIsEditingPoints(false)} className="cancel-points-btn">
                                                    {t('common.cancel')}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="points-display">
                                            <div className="stat-value points">{selectedUser.points || 0}</div>
                                            <button onClick={() => setIsEditingPoints(true)} className="edit-points-link">
                                                {t('users.editPoints')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="delete-user-btn"
                                onClick={() => handleDeleteUser(selectedUser.id)}
                            >
                                <Trash2 size={16} />
                                {t('users.deleteBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManager;
