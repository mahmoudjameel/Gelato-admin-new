import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const DashboardLayout = () => {
    return (
        <div className="dashboard-container">
            <Sidebar />
            <main className="main-content">
                <header className="main-header glass">
                    <div className="header-info">
                        <h2>لوحة التحكم</h2>
                        <p>أهلاً بك مجدداً في نظام إدارة Gelato Houset</p>
                    </div>
                    <div className="header-actions">
                        {/* User Profile / Notifications can go here */}
                        <div className="user-profile">
                            <div className="avatar">A</div>
                            <span className="user-name">المدير العام</span>
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
