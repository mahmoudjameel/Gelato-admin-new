import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useWebAuth } from '../../context/WebAuthContext';
import { X, ClipboardList, Clock, CheckCircle2, Package, Truck, ChevronRight, Loader2 } from 'lucide-react';
import './WebOrders.css';

const WebOrders = ({ isOpen, onClose }) => {
    const { t, i18n } = useTranslation();
    const { currentUser } = useWebAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const isRtl = i18n.language === 'ar' || i18n.language === 'he';

    useEffect(() => {
        if (!currentUser || !isOpen) return;

        const q = query(
            collection(db, 'orders'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(o => o.status !== 'payment_draft');
            setOrders(data);
            setLoading(false);
        }, (error) => {
            console.error("Orders Listener Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, isOpen]);

    if (!isOpen) return null;

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending': return { label: t('web.pending'), color: '#F59E0B', icon: <Clock size={16} /> };
            case 'processing': return { label: t('web.preparing'), color: '#3B82F6', icon: <Package size={16} /> };
            case 'ready': return { label: t('web.ready'), color: '#10B981', icon: <CheckCircle2 size={16} /> };
            case 'shipped': return { label: t('web.delivering'), color: '#8B5CF6', icon: <Truck size={16} /> };
            case 'completed': return { label: t('web.completed'), color: '#10B981', icon: <CheckCircle2 size={16} /> };
            case 'cancelled': return { label: t('web.cancelled'), color: '#EF4444', icon: <X size={16} /> };
            default: return { label: status, color: '#6B7280', icon: <ClipboardList size={16} /> };
        }
    };

    return (
        <div className={`web-orders-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div className={`web-orders-drawer ${isRtl ? 'rtl' : 'ltr'}`} onClick={e => e.stopPropagation()}>
                <div className="orders-header">
                    <div className="header-title">
                        <ClipboardList size={24} color="#9FD6C7" />
                        <h2>{t('web.myOrders')}</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="orders-content">
                    {loading ? (
                        <div className="loading-state">
                            <Loader2 className="spinner" />
                            <p>{t('web.loadingOrders')}</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="empty-state">
                            <ClipboardList size={48} color="#eee" />
                            <p>{t('web.noOrdersYet')}</p>
                        </div>
                    ) : (
                        <div className="orders-list">
                            {orders.map(order => {
                                const statusInfo = getStatusInfo(order.status);
                                const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);

                                return (
                                    <div key={order.id} className="order-card">
                                        <div className="order-card-header">
                                            <span className="order-number">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</span>
                                            <span className="order-date">
                                                {date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'he-IL', {
                                                    day: 'numeric',
                                                    month: 'short'
                                                })}
                                            </span>
                                        </div>

                                        <div className="order-card-body">
                                            <div className="order-status" style={{ color: statusInfo.color }}>
                                                {statusInfo.icon}
                                                <span>{statusInfo.label}</span>
                                            </div>
                                            <div className="order-total">
                                                {order.totalAmount} {t('web.sar')}
                                            </div>
                                        </div>

                                        <div className="order-items-preview">
                                            {order.items?.map((item, idx) => {
                                                const itemName = i18n.language === 'ar' ? (item.nameAr || item.name) :
                                                    i18n.language === 'he' ? (item.nameHe || item.name) : item.name;
                                                return <span key={idx}>{itemName}{idx < order.items.length - 1 ? ', ' : ''}</span>;
                                            })}
                                        </div>

                                        {/* Status Progress Bar for active orders */}
                                        {['pending', 'processing', 'ready', 'shipped'].includes(order.status) && (
                                            <div className="status-progress-container">
                                                <div className="progress-track">
                                                    <div
                                                        className="progress-fill"
                                                        style={{
                                                            width: order.status === 'pending' ? '10%' :
                                                                order.status === 'processing' ? '40%' :
                                                                    order.status === 'ready' ? '70%' : '90%',
                                                            backgroundColor: statusInfo.color
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WebOrders;
