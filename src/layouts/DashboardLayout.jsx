import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Moon, Sun, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toggleTheme, getStoredTheme } from '../utils/theme';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDark, setIsDark] = useState(getStoredTheme() === 'dark');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            setCurrentUser(user);
        }
    }, []);

    const handleToggleTheme = () => {
        const newTheme = toggleTheme();
        setIsDark(newTheme === 'dark');
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const getUserDisplayName = () => {
        if (!currentUser) return t('dashboard.adminRole');
        return currentUser.displayName || currentUser.email.split('@')[0];
    };

    const getAvatarText = () => {
        const name = getUserDisplayName();
        return name.charAt(0).toUpperCase();
    };

    return (
        <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="main-content">
                <header className="main-header glass">
                    <div className="header-right">
                        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <div className="header-info">
                            <h2>{t('dashboard.title')}</h2>
                            <p>{t('dashboard.welcome')}</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button
                            className="theme-toggle-btn"
                            onClick={handleToggleTheme}
                            aria-label="Toggle Theme"
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <div className="user-profile">
                            <div className="avatar">{getAvatarText()}</div>
                            <div className="user-info">
                                <span className="user-name">{getUserDisplayName()}</span>
                            </div>
                            <button className="header-logout-btn" onClick={handleLogout} title={t('common.logout')}>
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="content-area">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
