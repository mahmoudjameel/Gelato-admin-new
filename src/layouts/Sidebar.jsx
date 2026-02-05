import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';
import {
    LayoutDashboard,
    Tag,
    Package,
    Image as ImageIcon,
    LogOut,
    ShoppingBag,
    Store,
    Users,
    Bell,
    Ticket,
    X,
    MapPin,
    Bike
} from 'lucide-react';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const menuItems = [
        { title: t('sidebar.dashboard'), icon: <LayoutDashboard size={20} />, path: '' },
        { title: t('sidebar.orders'), icon: <ShoppingBag size={20} />, path: 'orders' },
        { title: t('sidebar.categories'), icon: <Tag size={20} />, path: 'categories' },
        { title: t('sidebar.products'), icon: <Package size={20} />, path: 'products' },
        { title: t('sidebar.users'), icon: <Users size={20} />, path: 'users' },
        { title: t('sidebar.promoCodes'), icon: <Ticket size={20} />, path: 'promos' },
        { title: t('sidebar.drivers'), icon: <Bike size={20} />, path: 'drivers' },

        { title: t('sidebar.notifications'), icon: <Bell size={20} />, path: 'alerts' },
        { title: t('sidebar.cities'), icon: <MapPin size={20} />, path: 'cities' },
        { title: t('sidebar.analytics'), icon: <ImageIcon size={20} />, path: 'banner' },
        { title: t('sidebar.store'), icon: <Store size={20} />, path: 'store' },
    ];

    const toggleLanguage = () => {
        const newLang = i18n.language === 'ar' ? 'he' : 'ar';
        i18n.changeLanguage(newLang);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <aside className={`sidebar glass ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <h1 className="logo-text">
                    <span style={{ color: 'var(--gelato-mint)' }}>Gelato</span>{' '}
                    <span style={{ color: 'var(--gelato-pink)' }}>House</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--muted-foreground)' }}> Admin</span>
                </h1>
                <button className="mobile-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                            if (window.innerWidth <= 768) onClose();
                        }}
                    >
                        <span className="icon">{item.icon}</span>
                        <span className="title">{item.title}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="lang-toggle-btn" onClick={toggleLanguage}>
                    <span className="lang-icon">{i18n.language === 'ar' ? '🇮🇱' : '🇸🇦'}</span>
                    <span>{i18n.language === 'ar' ? 'עברית' : 'العربية'}</span>
                </button>
                <button className="logout-btn" onClick={handleLogout}>
                    <LogOut size={20} />
                    <span>{t('common.logout')}</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
