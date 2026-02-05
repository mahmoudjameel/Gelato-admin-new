import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Tag, Layers } from 'lucide-react';
import './ProductLayout.css';

const ProductLayout = () => {
    const { t } = useTranslation();

    const tabs = [
        { path: '', end: true, label: t('sidebar.products'), icon: <Package size={18} /> },
        { path: 'extras', end: false, label: t('menuManagement.extras'), icon: <Tag size={18} /> },
        { path: 'extra-groups', end: false, label: t('menuManagement.extraGroups'), icon: <Layers size={18} /> },
    ];

    return (
        <div className="product-layout">
            <nav className="product-layout-nav" aria-label={t('products.title')}>
                {tabs.map(({ path, end, label, icon }) => (
                    <NavLink
                        key={path || 'list'}
                        to={path}
                        end={end}
                        className={({ isActive }) => `product-layout-tab ${isActive ? 'active' : ''}`}
                    >
                        <span className="tab-icon">{icon}</span>
                        <span className="tab-label">{label}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="product-layout-content">
                <Outlet />
            </div>
        </div>
    );
};

export default ProductLayout;
