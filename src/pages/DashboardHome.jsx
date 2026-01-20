import React from 'react';
import {
    Package,
    Tag,
    ShoppingCart,
    TrendingUp,
    Clock,
    Database,
    RotateCcw,
    Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { seedDatabase, clearDatabase } from '../utils/seedData';
import './DashboardHome.css';

const DashboardHome = () => {
    const { t } = useTranslation();
    const [seeding, setSeeding] = React.useState(false);
    const [clearing, setClearing] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const handleSeed = async () => {
        if (!window.confirm(t('dashboard.seedConfirm'))) return;
        setSeeding(true);
        setMessage('');
        try {
            await seedDatabase();
            setMessage(t('dashboard.seedSuccess'));
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(t('dashboard.seedError'));
        } finally {
            setSeeding(false);
        }
    };

    const handleClear = async () => {
        if (!window.confirm(t('dashboard.clearConfirm'))) return;
        setClearing(true);
        setMessage('');
        try {
            await clearDatabase();
            setMessage(t('dashboard.clearSuccess'));
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(t('dashboard.clearError'));
        } finally {
            setClearing(false);
        }
    };

    const stats = [
        { title: t('dashboard.totalProducts'), value: '42', icon: <Package size={24} />, color: '#D946EF' },
        { title: t('dashboard.totalCategories'), value: '8', icon: <Tag size={24} />, color: '#3B82F6' },
        { title: t('dashboard.todayOrders'), value: '12', icon: <ShoppingCart size={24} />, color: '#10B981' },
        { title: t('dashboard.totalSales'), value: '1,250 שח', icon: <TrendingUp size={24} />, color: '#F59E0B' },
    ];

    return (
        <div className="dashboard-home">
            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-card-premium glass">
                        <div className="stat-icon" style={{ backgroundColor: `${stat.color}1A`, color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div className="stat-content">
                            <h3>{stat.title}</h3>
                            <p>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="quick-actions-grid">
                <div className="quick-action-card glass">
                    <div className="action-info">
                        <h3>{t('dashboard.systemData')}</h3>
                        <p>{t('dashboard.systemDataDesc')}</p>
                    </div>
                    <div className="action-buttons">
                        <button
                            className="seed-btn"
                            onClick={handleSeed}
                            disabled={seeding || clearing}
                        >
                            <Zap size={18} />
                            <span>{seeding ? t('dashboard.seeding') : t('dashboard.seedData')}</span>
                        </button>
                        <button
                            className="clear-btn"
                            onClick={handleClear}
                            disabled={seeding || clearing}
                        >
                            <RotateCcw size={18} />
                            <span>{clearing ? t('dashboard.clearing') : t('dashboard.clearDatabase')}</span>
                        </button>
                    </div>
                    {message && <div className="action-message">{message}</div>}
                </div>

                <div className="recent-activity glass">
                    <div className="section-header">
                        <Clock size={20} />
                        <h2>{t('dashboard.recentActivity')}</h2>
                    </div>
                    <div className="activity-list">
                        <div className="activity-item">
                            <div className="activity-dot"></div>
                            <div className="activity-info">
                                <p>{t('dashboard.newProductAdded')} <strong>آيس كريم شوكولاتة بلجيكية</strong></p>
                                <span>{t('dashboard.hoursAgo', { count: 2 })}</span>
                            </div>
                        </div>
                        <div className="activity-item">
                            <div className="activity-dot"></div>
                            <div className="activity-info">
                                <p>{t('dashboard.bannerUpdated')}</p>
                                <span>{t('dashboard.hoursAgo', { count: 5 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
