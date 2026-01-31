import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    collection,
    getDoc,
    doc,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    ArrowRight,
    Bike,
    User,
    Phone,
    Mail,
    Package,
    CheckCircle,
    XCircle,
    Clock,
    Truck,
    ShoppingBag,
    CreditCard,
    Receipt
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './DriverDetails.css';

const ACTIVE_STATUSES = ['pending', 'processing', 'ready', 'shipped'];
const COMPLETED_STATUS = 'completed';
const CANCELLED_STATUS = 'cancelled';

const DriverDetails = () => {
    const { driverId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [driver, setDriver] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!driverId) return;

        const loadDriver = async () => {
            try {
                const driverSnap = await getDoc(doc(db, 'drivers', driverId));
                if (!driverSnap.exists()) {
                    setError(i18n.language === 'ar' ? 'السائق غير موجود' : 'הנהג לא נמצא');
                    setDriver(null);
                    return;
                }
                setDriver({ id: driverSnap.id, ...driverSnap.data() });
            } catch (err) {
                console.error('Error loading driver:', err);
                setError(i18n.language === 'ar' ? 'حدث خطأ في تحميل بيانات السائق' : 'שגיאה בטעינת נתוני הנהג');
            }
        };

        loadDriver();
    }, [driverId, i18n.language]);

    useEffect(() => {
        if (!driverId) return;

        const q = query(
            collection(db, 'orders'),
            where('assignedDriverId', '==', driverId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return tb - ta;
            });
            setOrders(list);
            setLoading(false);
        }, (err) => {
            console.error('Error listening to orders:', err);
            setOrders([]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [driverId]);

    const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status || ''));
    const completedOrders = orders.filter((o) => o.status === COMPLETED_STATUS);
    const cancelledOrders = orders.filter((o) => o.status === CANCELLED_STATUS);

    const formatDate = (timestamp) => {
        if (!timestamp) return '—';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'he-IL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending':
                return { label: t('orders.statusPending'), icon: <Clock size={14} />, color: '#F59E0B', bg: '#FEF3C7' };
            case 'processing':
                return { label: t('orders.statusProcessing'), icon: <ShoppingBag size={14} />, color: '#3B82F6', bg: '#DBEAFE' };
            case 'ready':
                return { label: t('orders.statusReady'), icon: <Package size={14} />, color: '#F97316', bg: '#FFEDD5' };
            case 'shipped':
                return { label: t('orders.statusShipped'), icon: <Truck size={14} />, color: '#8B5CF6', bg: '#EDE9FE' };
            case 'completed':
                return { label: t('orders.statusCompleted'), icon: <CheckCircle size={14} />, color: '#10B981', bg: '#D1FAE5' };
            case 'cancelled':
                return { label: t('orders.statusCancelled'), icon: <XCircle size={14} />, color: '#EF4444', bg: '#FEE2E2' };
            default:
                return { label: status || '—', icon: <Clock size={14} />, color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    const sumTotal = (list) => list.reduce((acc, o) => acc + (parseFloat(o.totalAmount) || 0), 0).toFixed(2);
    const sumSubtotal = (list) => list.reduce((acc, o) => acc + (parseFloat(o.subtotal) || (parseFloat(o.totalAmount) || 0) - (parseFloat(o.deliveryFee) || 0) - (parseFloat(o.tax) || 0)), 0).toFixed(2);
    const sumDeliveryFee = (list) => list.reduce((acc, o) => acc + (parseFloat(o.deliveryFee) || 0), 0).toFixed(2);
    const sumTax = (list) => list.reduce((acc, o) => acc + (parseFloat(o.tax) || 0), 0).toFixed(2);

    const OrderTable = ({ list, sectionKey, emptyKey, icon: Icon }) => (
        <div className="driver-details-section glass-inner">
            <h3 className="section-title">
                <Icon size={20} />
                {t(sectionKey)} ({list.length})
            </h3>
            {list.length === 0 ? (
                <p className="section-empty">{t(emptyKey)}</p>
            ) : (
                <>
                    <div className="orders-table-wrap">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>{t('orders.orderNumber')}</th>
                                    <th>{t('orders.date')}</th>
                                    <th>{t('orders.customer')}</th>
                                    <th>{t('orders.subtotal')}</th>
                                    <th>{t('orders.tax')}</th>
                                    <th>{t('orders.deliveryFee')}</th>
                                    <th>{t('orders.totalAmount')}</th>
                                    <th>{t('orders.payment')}</th>
                                    <th>{t('orders.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((order) => {
                                    const statusInfo = getStatusInfo(order.status);
                                    const subtotal = order.subtotal != null ? order.subtotal : (parseFloat(order.totalAmount) || 0) - (parseFloat(order.deliveryFee) || 0) - (parseFloat(order.tax) || 0);
                                    return (
                                        <tr key={order.id}>
                                            <td><span className="order-num">#{order.orderNumber || order.id.slice(-6)}</span></td>
                                            <td><span className="date-cell">{formatDate(order.createdAt)}</span></td>
                                            <td>{order.customerName || t('orders.anonymous')}</td>
                                            <td className="amount">{subtotal.toFixed ? subtotal.toFixed(2) : Number(subtotal).toFixed(2)} ₪</td>
                                            <td className="amount">{order.tax != null ? Number(order.tax).toFixed(2) : '0.00'} ₪</td>
                                            <td className="amount">{order.deliveryFee != null ? Number(order.deliveryFee).toFixed(2) : '0.00'} ₪</td>
                                            <td className="amount total-cell">{order.totalAmount != null ? Number(order.totalAmount).toFixed(2) : '0.00'} ₪</td>
                                            <td>{order.paymentMethod === 'cash' ? t('orders.cash') : (order.paymentMethod === 'card' ? t('orders.card') : '—')}</td>
                                            <td>
                                                <span className="status-badge" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                                    {statusInfo.icon}
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="section-summary">
                        <div className="summary-row">
                            <span>{t('driverDetails.ordersCount')}:</span>
                            <strong>{list.length}</strong>
                        </div>
                        <div className="summary-row">
                            <span>{t('orders.subtotal')}:</span>
                            <span>{sumSubtotal(list)} ₪</span>
                        </div>
                        <div className="summary-row">
                            <span>{t('orders.tax')}:</span>
                            <span>{sumTax(list)} ₪</span>
                        </div>
                        <div className="summary-row">
                            <span>{t('orders.deliveryFee')}:</span>
                            <span>{sumDeliveryFee(list)} ₪</span>
                        </div>
                        <div className="summary-row total">
                            <span>{t('orders.totalAmount')}:</span>
                            <span>{sumTotal(list)} ₪</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    if (error) {
        return (
            <div className="driver-details-container">
                <div className="driver-details-error">
                    <p>{error}</p>
                    <button className="back-btn" onClick={() => navigate('/dashboard/drivers')}>
                        <ArrowRight size={18} />
                        {t('common.back')}
                    </button>
                </div>
            </div>
        );
    }

    if (!driver && !loading) {
        return (
            <div className="driver-details-container">
                <div className="driver-details-error">
                    <p>{i18n.language === 'ar' ? 'السائق غير موجود' : 'הנהג לא נמצא'}</p>
                    <button className="back-btn" onClick={() => navigate('/dashboard/drivers')}>
                        <ArrowRight size={18} />
                        {t('common.back')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="driver-details-container">
            <div className="driver-details-header">
                <button className="back-btn" onClick={() => navigate('/dashboard/drivers')}>
                    <ArrowRight size={20} />
                    {t('common.back')}
                </button>
                <h1>{t('driverDetails.title')}</h1>
            </div>

            {loading && !driver ? (
                <div className="loading-block">{i18n.language === 'ar' ? 'جاري تحميل التفاصيل...' : 'טוען פרטים...'}</div>
            ) : (
                <>
                    {driver && (
                        <div className="driver-card glass-inner">
                            <div className="driver-card-header">
                                <div className="driver-avatar-lg">
                                    <Bike size={32} />
                                </div>
                                <div className="driver-info">
                                    <h2>{driver.name}</h2>
                                    {driver.phone && (
                                        <p className="driver-meta">
                                            <Phone size={16} />
                                            <span style={{ direction: 'ltr', display: 'inline-block' }}>{driver.phone}</span>
                                        </p>
                                    )}
                                    {driver.email && (
                                        <p className="driver-meta">
                                            <Mail size={16} />
                                            {driver.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="driver-stats">
                                <div className="stat-box active">
                                    <Receipt size={20} />
                                    <span className="stat-value">{activeOrders.length}</span>
                                    <span className="stat-label">{t('driverDetails.activeOrders')}</span>
                                </div>
                                <div className="stat-box completed">
                                    <CheckCircle size={20} />
                                    <span className="stat-value">{completedOrders.length}</span>
                                    <span className="stat-label">{t('driverDetails.completedOrders')}</span>
                                </div>
                                <div className="stat-box cancelled">
                                    <XCircle size={20} />
                                    <span className="stat-value">{cancelledOrders.length}</span>
                                    <span className="stat-label">{t('driverDetails.cancelledOrders')}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="driver-orders-grid">
                        <OrderTable
                            list={activeOrders}
                            sectionKey="driverDetails.activeOrders"
                            emptyKey="driverDetails.noActiveOrders"
                            icon={Truck}
                        />
                        <OrderTable
                            list={completedOrders}
                            sectionKey="driverDetails.completedOrders"
                            emptyKey="driverDetails.noCompletedOrders"
                            icon={CheckCircle}
                        />
                        <OrderTable
                            list={cancelledOrders}
                            sectionKey="driverDetails.cancelledOrders"
                            emptyKey="driverDetails.noCancelledOrders"
                            icon={XCircle}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default DriverDetails;
