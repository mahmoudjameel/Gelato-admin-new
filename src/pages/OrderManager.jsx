import React, { useState, useEffect } from 'react';
import {
    Search,
    Eye,
    CheckCircle,
    Clock,
    Truck,
    XCircle,
    ShoppingBag,
    MoreVertical,
    ChevronDown,
    Calendar,
    User,
    MapPin,
    CreditCard,
    Phone,
    ExternalLink,
    Package
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase/config';
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    addDoc
} from 'firebase/firestore';
import './OrderManager.css';

const OrderManager = () => {
    const { t, i18n } = useTranslation();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // Set up real-time listener for orders
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching orders: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const sendNotification = async (order, newStatus) => {
        if (!order.userId) return;

        let title = t('orders.notificationTitle');
        let message = t('orders.notificationMessage', { orderId: order.orderNumber || order.id.slice(-6).toUpperCase() });
        let icon = "notifications-outline";

        const isPickup = (order.orderType || order.deliveryType) === 'pickup';

        switch (newStatus) {
            case 'processing':
                title = t('orders.notifProcessingTitle');
                message = t('orders.notifProcessingMsg', { orderId: order.orderNumber || order.id.slice(-6).toUpperCase() });
                icon = "pizza-outline";
                break;
            case 'ready':
                title = isPickup ? t('orders.notifReadyPickupTitle') : t('orders.notifReadyTitle');
                message = isPickup
                    ? t('orders.notifReadyPickupMsg', { orderId: order.orderNumber || order.id.slice(-6).toUpperCase() })
                    : t('orders.notifReadyMsg', { orderId: order.orderNumber || order.id.slice(-6).toUpperCase() });
                icon = "cube-outline";
                break;
            case 'shipped':
            case 'delivering':
                title = t('orders.notifShippedTitle');
                message = t('orders.notifShippedMsg', { orderId: order.orderNumber || order.id.slice(-6).toUpperCase() });
                icon = "bicycle-outline";
                break;
            case 'completed':
                title = isPickup ? t('orders.notifCompletedPickupTitle') : t('orders.notifCompletedTitle');
                message = isPickup
                    ? t('orders.notifCompletedPickupMsg')
                    : t('orders.notifCompletedMsg');
                icon = "checkmark-circle-outline";
                break;
            case 'cancelled':
                title = t('orders.notifCancelledTitle');
                message = t('orders.notifCancelledMsg', { orderId: order.orderNumber || order.id.slice(-6).toUpperCase() });
                icon = "close-circle-outline";
                break;
            default:
                return; // Don't notify for other states or pending
        }

        try {
            await addDoc(collection(db, `users/${order.userId}/notifications`), {
                title,
                message,
                type: 'order',
                orderId: order.id,
                read: false,
                createdAt: new Date(),
                icon
            });
        } catch (error) {
            console.error("Error sending notification:", error);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        // Optimistic Update: Update local state immediately
        const previousOrders = [...orders];
        const previousSelectedOrder = selectedOrder ? { ...selectedOrder } : null;

        // Find the full order object for notification
        const orderToUpdate = orders.find(o => o.id === orderId);

        setOrders(current => current.map(order =>
            order.id === orderId ? { ...order, status: newStatus } : order
        ));

        if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }

        try {
            await updateDoc(doc(db, 'orders', orderId), { status: newStatus });

            // Send Notification if order exists
            if (orderToUpdate) {
                // We pass the updated status, but need to be careful using 'orderToUpdate' which has old status
                // But sendNotification only needs userId and id, which don't change.
                sendNotification(orderToUpdate, newStatus);
            }

        } catch (error) {
            console.error("Error updating order status: ", error);
            // Rollback on error
            setOrders(previousOrders);
            if (previousSelectedOrder) setSelectedOrder(previousSelectedOrder);
            alert(t('orders.errorUpdate'));
        }
    };

    const updateOrderType = async (orderId, newType) => {
        // Optimistic Update
        const previousOrders = [...orders];
        const previousSelectedOrder = selectedOrder ? { ...selectedOrder } : null;

        setOrders(current => current.map(order =>
            order.id === orderId ? { ...order, orderType: newType } : order
        ));

        if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(prev => ({ ...prev, orderType: newType }));
        }

        try {
            await updateDoc(doc(db, 'orders', orderId), { orderType: newType });
        } catch (error) {
            console.error("Error updating order type: ", error);
            setOrders(previousOrders);
            if (previousSelectedOrder) setSelectedOrder(previousSelectedOrder);
            alert(t('orders.errorType'));
        }
    };

    const getStatusInfo = (status, orderType) => {
        const isPickup = orderType === 'pickup';
        switch (status) {
            case 'pending':
                return { label: t('orders.statusPending'), icon: <Clock size={14} />, color: '#F59E0B', bg: '#FEF3C7' };
            case 'processing':
                return { label: t('orders.statusProcessing'), icon: <ShoppingBag size={14} />, color: '#3B82F6', bg: '#DBEAFE' };
            case 'ready':
                return { label: isPickup ? t('orders.statusReadyPickup') : t('orders.statusReady'), icon: <Package size={14} />, color: '#F97316', bg: '#FFEDD5' };
            case 'shipped':
                return { label: t('orders.statusShipped'), icon: <Truck size={14} />, color: '#8B5CF6', bg: '#EDE9FE' };
            case 'completed':
                return { label: isPickup ? t('orders.statusReceived') : t('orders.statusCompleted'), icon: <CheckCircle size={14} />, color: '#10B981', bg: '#D1FAE5' };
            case 'cancelled':
                return { label: t('orders.statusCancelled'), icon: <XCircle size={14} />, color: '#EF4444', bg: '#FEE2E2' };
            default:
                return { label: status, icon: <Clock size={14} />, color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    const openModal = (order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const filteredOrders = orders.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatDate = (timestamp) => {
        if (!timestamp) return t('orders.notAvailable');
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'he-IL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="order-manager">
            <div className="page-header">
                <div className="header-left">
                    <h1>{t('orders.title')}</h1>
                    <p>{t('orders.subtitle')}</p>
                </div>
                <div className="header-right">
                    <div className="search-bar glass">
                        <Search size={18} color="#9CA3AF" />
                        <input
                            type="text"
                            placeholder={t('orders.searchOrders')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="data-table-container glass">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t('orders.orderNumber')}</th>
                            <th>{t('orders.customer')}</th>
                            <th>{t('orders.date')}</th>
                            <th>{t('orders.total')}</th>
                            <th>{t('orders.status')}</th>
                            <th>{t('orders.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="loading">{t('common.loading')}</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan="6" className="empty">{t('common.noData')}</td></tr>
                        ) : filteredOrders.map((order) => {
                            const statusInfo = getStatusInfo(order.status || 'pending', order.orderType || order.deliveryType);
                            return (
                                <tr key={order.id}>
                                    <td><span className="order-id">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</span></td>
                                    <td>
                                        <div className="customer-cell">
                                            {order.customerPhoto ? (
                                                <img src={order.customerPhoto} alt="" className="customer-avatar-img" />
                                            ) : (
                                                <div className="customer-avatar">{order.customerName?.charAt(0) || 'C'}</div>
                                            )}
                                            <span>{order.customerName || t('orders.anonymous')}</span>
                                        </div>
                                    </td>
                                    <td><span className="date-cell">{formatDate(order.createdAt)}</span></td>
                                    <td><span className="price-tag">{order.totalAmount || 0} ₪</span></td>
                                    <td>
                                        <span className="status-badge" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                            {statusInfo.icon}
                                            {statusInfo.label}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="view-btn" onClick={() => openModal(order)} title={t('orders.viewDetails')}>
                                                <Eye size={18} />
                                            </button>
                                            <div className="status-dropdown">
                                                <select
                                                    value={order.status || 'pending'}
                                                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                                    className="status-select-hidden"
                                                >
                                                    <option value="pending">{t('orders.statusPending')}</option>
                                                    <option value="processing">{t('orders.statusProcessing')}</option>
                                                    <option value="ready">{t('orders.statusReady')}</option>
                                                    <option value="shipped">{t('orders.statusShipped')}</option>
                                                    <option value="completed">{t('common.confirm')}</option>
                                                    <option value="cancelled">{t('orders.statusCancelled')}</option>
                                                </select>
                                                <button className="action-btn-circle" title={t('orders.changeStatus')}>
                                                    <MoreVertical size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isModalOpen && selectedOrder && (
                <div className="modal-overlay">
                    <div className="modal-content glass modal-xl">
                        <div className="modal-header">
                            <div className="modal-title-box">
                                <h2>{t('orders.orderDetails')} #{selectedOrder.orderNumber || selectedOrder.id.slice(-6).toUpperCase()}</h2>
                                <span className="modal-date">{formatDate(selectedOrder.createdAt)}</span>
                            </div>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><XCircle size={24} /></button>
                        </div>

                        <div className="modal-grid">
                            <div className="modal-col-main">
                                <div className="order-items-section glass-inner">
                                    <h3><ShoppingBag size={18} /> {t('orders.requestedItems')}</h3>
                                    <div className="items-list">
                                        {selectedOrder.items?.map((item, idx) => (
                                            <div key={idx} className="order-item-card">
                                                <div className="item-img-box">
                                                    {item.image ? <img src={item.image} alt={item.name} /> : <div className="img-placeholder"><Package size={20} /></div>}
                                                </div>
                                                <div className="item-info">
                                                    <h4>{item.name}</h4>
                                                    <div className="item-details-list">
                                                        {item.selectedSize && (
                                                            <div className="detail-tag size">
                                                                <span className="detail-label">{t('orders.size')}:</span>
                                                                <span className="detail-value">
                                                                    {typeof item.selectedSize === 'object'
                                                                        ? (item.selectedSize.label || item.selectedSize.name)
                                                                        : item.selectedSize}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {item.selectedFlavors && item.selectedFlavors.length > 0 && (
                                                            <div className="detail-tag flavors">
                                                                <span className="detail-label">{t('orders.flavors')}:</span>
                                                                <span className="detail-value">{item.selectedFlavors.join('، ')}</span>
                                                            </div>
                                                        )}
                                                        {item.selectedExtras && item.selectedExtras.length > 0 && (
                                                            <div className="detail-tag extras-list">
                                                                <span className="detail-label">{t('orders.extras')}:</span>
                                                                <div className="extras-chips">
                                                                    {item.selectedExtras.map((extra, eIdx) => {
                                                                        const isObj = typeof extra === 'object' && extra !== null;
                                                                        const name = isObj ? extra.name : extra;
                                                                        const img = isObj ? extra.image : null;
                                                                        return (
                                                                            <div key={eIdx} className="extra-chip">
                                                                                {img && <img src={img} alt={name} className="extra-chip-img" />}
                                                                                <span>{name}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(!item.selectedExtras || item.selectedExtras.length === 0) && !item.selectedFlavors && (
                                                            <span className="no-extras-text">{t('orders.noExtras')}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="item-pricing">
                                                    <span className="item-qty">x{item.quantity}</span>
                                                    <span className="item-price">{item.price * item.quantity} ₪</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="order-summary">
                                        <div className="summary-row">
                                            <span>{t('orders.subtotal')}:</span>
                                            <span>{selectedOrder.subtotal || selectedOrder.totalAmount} ₪</span>
                                        </div>
                                        <div className="summary-row">
                                            <span>{t('orders.deliveryFee')}:</span>
                                            <span>{selectedOrder.deliveryFee || 0} ₪</span>
                                        </div>
                                        <div className="summary-row total">
                                            <span>{t('orders.totalAmount')}:</span>
                                            <span>{selectedOrder.totalAmount} ₪</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-col-side">
                                <div className="info-section glass-inner">
                                    <h3><User size={18} /> {t('orders.customerInfo')}</h3>
                                    <div className="customer-detail-header">
                                        {selectedOrder.customerPhoto && <img src={selectedOrder.customerPhoto} alt="" className="detail-avatar" />}
                                        <div className="info-content">
                                            <p><strong>{t('orders.name')}:</strong> {selectedOrder.customerName || t('orders.anonymous')}</p>
                                            <p><strong>{t('orders.phone')}:</strong> {selectedOrder.address?.phone || selectedOrder.customerEmail || t('common.noData')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="info-section glass-inner">
                                    <h3><Truck size={18} /> {t('orders.orderType')}</h3>
                                    <div className="order-type-selector">
                                        <div className="type-select-wrapper">
                                            <div className="type-display">
                                                {selectedOrder.orderType === 'pickup' ? <ShoppingBag size={18} /> : <Truck size={18} />}
                                                <span>{selectedOrder.orderType === 'pickup' ? t('orders.pickup') : t('orders.delivery')}</span>
                                                <ChevronDown size={16} style={{ marginRight: 'auto', opacity: 0.5 }} />
                                            </div>
                                            <select
                                                value={selectedOrder.orderType || 'delivery'}
                                                onChange={(e) => updateOrderType(selectedOrder.id, e.target.value)}
                                                className="type-select-input"
                                            >
                                                <option value="delivery">{t('orders.delivery')}</option>
                                                <option value="pickup">{t('orders.pickup')}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="info-section glass-inner">
                                    <h3><MapPin size={18} /> {t('orders.deliveryAddress')}</h3>
                                    <div className="info-content">
                                        {selectedOrder.address ? (
                                            <>
                                                <p><strong>{selectedOrder.address.title}:</strong> {selectedOrder.address.details}</p>
                                                <p><strong>{t('orders.phone')}:</strong> {selectedOrder.address.phone}</p>
                                                {selectedOrder.address.latitude && (
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.address.latitude},${selectedOrder.address.longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="map-link-btn"
                                                    >
                                                        <ExternalLink size={14} /> {t('orders.viewOnMap')}
                                                    </a>
                                                )}
                                            </>
                                        ) : (
                                            <p>{t('orders.storePickup')}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="info-section glass-inner">
                                    <h3><CreditCard size={18} /> {t('orders.payment')}</h3>
                                    <div className="info-content">
                                        <p><strong>{t('orders.method')}:</strong> {selectedOrder.paymentMethod === 'cash' ? t('orders.cash') : t('orders.card')}</p>
                                        <p><strong>{t('orders.status')}:</strong> {selectedOrder.paymentStatus === 'paid' ? t('orders.paid') : t('orders.unpaid')}</p>
                                    </div>
                                </div>

                                <div className="status-update-box glass-inner">
                                    <h3>{t('orders.updateStatus')}</h3>
                                    <div className="status-buttons">
                                        {['pending', 'processing', 'ready', 'shipped', 'completed', 'cancelled']
                                            .filter(status => {
                                                const isPickup = (selectedOrder.orderType || selectedOrder.deliveryType) === 'pickup';
                                                if (isPickup && status === 'shipped') return false;
                                                return true;
                                            })
                                            .map(status => {
                                                const info = getStatusInfo(status, selectedOrder.orderType || selectedOrder.deliveryType);
                                                return (
                                                    <button
                                                        key={status}
                                                        className={`status-btn-option ${selectedOrder.status === status ? 'active' : ''}`}
                                                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                                                        style={{
                                                            '--status-color': info.color,
                                                            '--status-bg': info.bg,
                                                            borderColor: selectedOrder.status === status ? info.color : 'transparent'
                                                        }}
                                                    >
                                                        {info.icon}
                                                        <span>{info.label}</span>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderManager;
