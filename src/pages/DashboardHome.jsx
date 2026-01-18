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
import { seedDatabase, clearDatabase } from '../utils/seedData';
import './DashboardHome.css';

const DashboardHome = () => {
    const [seeding, setSeeding] = React.useState(false);
    const [clearing, setClearing] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const handleSeed = async () => {
        if (!window.confirm('هل تريد إضافة البيانات التجريبية إلى قاعدة البيانات؟')) return;
        setSeeding(true);
        setMessage('');
        try {
            await seedDatabase();
            setMessage('تم إضافة البيانات بنجاح!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('حدث خطأ أثناء إضافة البيانات.');
        } finally {
            setSeeding(false);
        }
    };

    const handleClear = async () => {
        if (!window.confirm('تحذير: سيتم حذف جميع المنتجات والتصنيفات والبانرات. هل أنت متأكد؟')) return;
        setClearing(true);
        setMessage('');
        try {
            await clearDatabase();
            setMessage('تم مسح البيانات بنجاح!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('حدث خطأ أثناء مسح البيانات.');
        } finally {
            setClearing(false);
        }
    };

    const stats = [
        { title: 'إجمالي المنتجات', value: '42', icon: <Package size={24} />, color: '#D946EF' },
        { title: 'التصنيفات', value: '8', icon: <Tag size={24} />, color: '#3B82F6' },
        { title: 'طلبات اليوم', value: '12', icon: <ShoppingCart size={24} />, color: '#10B981' },
        { title: 'إجمالي المبيعات', value: '1,250 שח', icon: <TrendingUp size={24} />, color: '#F59E0B' },
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
                        <h3>بيانات النظام</h3>
                        <p>استخدم هذه الأدوات لتهيئة قاعدة البيانات بالبيانات التجريبية أو مسحها بالكامل.</p>
                    </div>
                    <div className="action-buttons">
                        <button
                            className="seed-btn"
                            onClick={handleSeed}
                            disabled={seeding || clearing}
                        >
                            <Zap size={18} />
                            <span>{seeding ? 'جاري الإضافة...' : 'إضافة بيانات تجريبية'}</span>
                        </button>
                        <button
                            className="clear-btn"
                            onClick={handleClear}
                            disabled={seeding || clearing}
                        >
                            <RotateCcw size={18} />
                            <span>{clearing ? 'جاري المسح...' : 'مسح قاعدة البيانات'}</span>
                        </button>
                    </div>
                    {message && <div className="action-message">{message}</div>}
                </div>

                <div className="recent-activity glass">
                    <div className="section-header">
                        <Clock size={20} />
                        <h2>آخر النشاطات</h2>
                    </div>
                    <div className="activity-list">
                        <div className="activity-item">
                            <div className="activity-dot"></div>
                            <div className="activity-info">
                                <p>تم إضافة منتج جديد <strong>آيس كريم شوكولاتة بلجيكية</strong></p>
                                <span>منذ ساعتين</span>
                            </div>
                        </div>
                        <div className="activity-item">
                            <div className="activity-dot"></div>
                            <div className="activity-info">
                                <p>تم تحديث بانر الصفحة الرئيسية</p>
                                <span>منذ 5 ساعات</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
