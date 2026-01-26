import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toggleTheme, getStoredTheme } from '../utils/theme';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const { t } = useTranslation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDark, setIsDark] = useState(getStoredTheme() === 'dark');

    const handleToggleTheme = () => {
        const newTheme = toggleTheme();
        setIsDark(newTheme === 'dark');
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
                            <div className="avatar">A</div>
                            <span className="user-name">{t('dashboard.adminRole')}</span>
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
