import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Tag,
    Package,
    Image as ImageIcon,
    LogOut,
    ChevronLeft,
    ShoppingBag,
    Store,
    Users,
    Bell,
    Ticket,
    X
} from 'lucide-react';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const menuItems = [
        { title: 'لوحة التحكم', icon: <LayoutDashboard size={20} />, path: '/' },
        { title: 'الطلبات', icon: <ShoppingBag size={20} />, path: '/orders' },
        { title: 'التصنيفات', icon: <Tag size={20} />, path: '/categories' },
        { title: 'المنتجات', icon: <Package size={20} />, path: '/products' },
        { title: 'المستخدمين', icon: <Users size={20} />, path: '/users' },
        { title: 'أكواد الخصم', icon: <Ticket size={20} />, path: '/promos' },
        { title: 'تنبيهات عامة', icon: <Bell size={20} />, path: '/alerts' },
        { title: 'البانر', icon: <ImageIcon size={20} />, path: '/banner' },
        { title: 'بروفايل المتجر', icon: <Store size={20} />, path: '/store' },
    ];

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
                <h1 className="logo-text">Gelato House <span>Admin</span></h1>
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
                <button className="logout-btn" onClick={handleLogout}>
                    <LogOut size={20} />
                    <span>تسجيل الخروج</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
