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

        let title = "تحديث طلبك";
        let message = `تغيرت حالة طلبك #${order.id.slice(-6).toUpperCase()}`;
        let icon = "notifications-outline";

        switch (newStatus) {
            case 'processing':
                title = "جاري التحضير 👨‍🍳";
                message = `بدأنا في تحضير طلبك #${order.id.slice(-6).toUpperCase()}. استعد للطعم الرائع!`;
                icon = "pizza-outline";
                break;
            case 'ready':
                title = "طلبك جاهز! 🛍️";
                message = `طلبك #${order.id.slice(-6).toUpperCase()} أصبح جاهزاً الآن.`;
                icon = "cube-outline";
                break;
            case 'shipped':
            case 'delivering':
                title = "طلبك في الطريق 🛵";
                message = `طلبك #${order.id.slice(-6).toUpperCase()} خرج للتوصيل. يرجى الاستعداد للاستلام.`;
                icon = "bicycle-outline"; // Ionicon name mapping
                break;
            case 'completed':
                title = "تم التوصيل 🎉";
                message = `نتمنى أن تستمتع بطلبك! شكراً لاختيارك جيلاتو هاوس.`;
                icon = "checkmark-circle-outline";
                break;
            case 'cancelled':
                title = "تم إلغاء الطلب ❌";
                message = `نأسف، تم إلغاء طلبك #${order.id.slice(-6).toUpperCase()}. يرجى التواصل معنا للمساعدة.`;
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
            alert("حدث خطأ أثناء تحديث حالة الطلب. تم استعادة الحالة السابقة.");
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
            alert("حدث خطأ أثناء تحديث نوع الطلب.");
        }
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending':
                return { label: 'قيد الانتظار', icon: <Clock size={14} />, color: '#F59E0B', bg: '#FEF3C7' };
            case 'processing':
                return { label: 'جاري التحضير', icon: <ShoppingBag size={14} />, color: '#3B82F6', bg: '#DBEAFE' };
            case 'ready':
                return { label: 'جاهز', icon: <Package size={14} />, color: '#F97316', bg: '#FFEDD5' };
            case 'shipped':
                return { label: 'جاري التوصيل', icon: <Truck size={14} />, color: '#8B5CF6', bg: '#EDE9FE' };
            case 'completed':
                return { label: 'مكتمل', icon: <CheckCircle size={14} />, color: '#10B981', bg: '#D1FAE5' };
            case 'cancelled':
                return { label: 'ملغي', icon: <XCircle size={14} />, color: '#EF4444', bg: '#FEE2E2' };
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
        if (!timestamp) return 'غير متوفر';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('ar-EG', {
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
                    <h1>إدارة الطلبات</h1>
                    <p>تتبع وإدارة طلبات العملاء في الوقت الفعلي</p>
                </div>
                <div className="header-right">
                    <div className="search-bar glass">
                        <Search size={18} color="#9CA3AF" />
                        <input
                            type="text"
                            placeholder="البحث عن طريق رقم الطلب أو اسم العميل..."
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
                            <th>رقم الطلب</th>
                            <th>العميل</th>
                            <th>التاريخ</th>
                            <th>المبلغ الإجمالي</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="loading">جاري التحميل...</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan="6" className="empty">لا يوجد طلبات حالياً</td></tr>
                        ) : filteredOrders.map((order) => {
                            const statusInfo = getStatusInfo(order.status || 'pending');
                            return (
                                <tr key={order.id}>
                                    <td><span className="order-id">#{order.id.slice(-6).toUpperCase()}</span></td>
                                    <td>
                                        <div className="customer-cell">
                                            {order.customerPhoto ? (
                                                <img src={order.customerPhoto} alt="" className="customer-avatar-img" />
                                            ) : (
                                                <div className="customer-avatar">{order.customerName?.charAt(0) || 'ع'}</div>
                                            )}
                                            <span>{order.customerName || 'عميل مجهول'}</span>
                                        </div>
                                    </td>
                                    <td><span className="date-cell">{formatDate(order.createdAt)}</span></td>
                                    <td><span className="price-tag">{order.totalAmount || 0} שח</span></td>
                                    <td>
                                        <span className="status-badge" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                            {statusInfo.icon}
                                            {statusInfo.label}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="view-btn" onClick={() => openModal(order)} title="عرض التفاصيل">
                                                <Eye size={18} />
                                            </button>
                                            <div className="status-dropdown">
                                                <select
                                                    value={order.status || 'pending'}
                                                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                                    className="status-select-hidden"
                                                >
                                                    <option value="pending">قيد الانتظار</option>
                                                    <option value="processing">جاري التحضير</option>
                                                    <option value="ready">جاهز</option>
                                                    <option value="shipped">جاري التوصيل</option>
                                                    <option value="completed">مكتمل</option>
                                                    <option value="cancelled">ملغي</option>
                                                </select>
                                                <button className="action-btn-circle" title="تغيير الحالة">
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
                                <h2>تفاصيل الطلب #{selectedOrder.id.slice(-6).toUpperCase()}</h2>
                                <span className="modal-date">{formatDate(selectedOrder.createdAt)}</span>
                            </div>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><XCircle size={24} /></button>
                        </div>

                        <div className="modal-grid">
                            <div className="modal-col-main">
                                <div className="order-items-section glass-inner">
                                    <h3><ShoppingBag size={18} /> العناصر المطلوبة</h3>
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
                                                                <span className="detail-label">الحجم:</span>
                                                                <span className="detail-value">
                                                                    {typeof item.selectedSize === 'object'
                                                                        ? (item.selectedSize.label || item.selectedSize.name)
                                                                        : item.selectedSize}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {item.selectedFlavors && item.selectedFlavors.length > 0 && (
                                                            <div className="detail-tag flavors">
                                                                <span className="detail-label">النكهات:</span>
                                                                <span className="detail-value">{item.selectedFlavors.join('، ')}</span>
                                                            </div>
                                                        )}
                                                        {item.selectedExtras && item.selectedExtras.length > 0 && (
                                                            <div className="detail-tag extras-list">
                                                                <span className="detail-label">الإضافات:</span>
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
                                                            <span className="no-extras-text">بدون إضافات أو نكهات خاصة</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="item-pricing">
                                                    <span className="item-qty">x{item.quantity}</span>
                                                    <span className="item-price">{item.price * item.quantity} שח</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="order-summary">
                                        <div className="summary-row">
                                            <span>المجموع الفرعي:</span>
                                            <span>{selectedOrder.subtotal || selectedOrder.totalAmount} שח</span>
                                        </div>
                                        <div className="summary-row">
                                            <span>رسوم التوصيل:</span>
                                            <span>{selectedOrder.deliveryFee || 0} שח</span>
                                        </div>
                                        <div className="summary-row total">
                                            <span>الإجمالي الكلي:</span>
                                            <span>{selectedOrder.totalAmount} שח</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-col-side">
                                <div className="info-section glass-inner">
                                    <h3><User size={18} /> العميل</h3>
                                    <div className="customer-detail-header">
                                        {selectedOrder.customerPhoto && <img src={selectedOrder.customerPhoto} alt="" className="detail-avatar" />}
                                        <div className="info-content">
                                            <p><strong>الاسم:</strong> {selectedOrder.customerName || 'غير متوفر'}</p>
                                            <p><strong>الهاتف:</strong> {selectedOrder.address?.phone || selectedOrder.customerEmail || 'غير متوفر'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="info-section glass-inner">
                                    <h3><Truck size={18} /> نوع الطلب</h3>
                                    <div className="order-type-selector">
                                        <div className="type-select-wrapper">
                                            <div className="type-display">
                                                {selectedOrder.orderType === 'pickup' ? <ShoppingBag size={18} /> : <Truck size={18} />}
                                                <span>{selectedOrder.orderType === 'pickup' ? 'استلام' : 'توصيل'}</span>
                                                <ChevronDown size={16} style={{ marginRight: 'auto', opacity: 0.5 }} />
                                            </div>
                                            <select
                                                value={selectedOrder.orderType || 'delivery'}
                                                onChange={(e) => updateOrderType(selectedOrder.id, e.target.value)}
                                                className="type-select-input"
                                            >
                                                <option value="delivery">توصيل</option>
                                                <option value="pickup">استلام</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="info-section glass-inner">
                                    <h3><MapPin size={18} /> عنوان التوصيل</h3>
                                    <div className="info-content">
                                        {selectedOrder.address ? (
                                            <>
                                                <p><strong>{selectedOrder.address.title}:</strong> {selectedOrder.address.details}</p>
                                                <p><strong>الهاتف:</strong> {selectedOrder.address.phone}</p>
                                                {selectedOrder.address.latitude && (
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.address.latitude},${selectedOrder.address.longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="map-link-btn"
                                                    >
                                                        <ExternalLink size={14} /> عرض على الخريطة
                                                    </a>
                                                )}
                                            </>
                                        ) : (
                                            <p>استلام من المتجر</p>
                                        )}
                                    </div>
                                </div>

                                <div className="info-section glass-inner">
                                    <h3><CreditCard size={18} /> الدفع</h3>
                                    <div className="info-content">
                                        <p><strong>الطريقة:</strong> {selectedOrder.paymentMethod === 'cash' ? 'نقداً' : 'بطاقة ائتمان'}</p>
                                        <p><strong>الحالة:</strong> {selectedOrder.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}</p>
                                    </div>
                                </div>

                                <div className="status-update-box glass-inner">
                                    <h3>تحديث حالة الطلب</h3>
                                    <div className="status-buttons">
                                        {['pending', 'processing', 'ready', 'shipped', 'completed', 'cancelled'].map(status => {
                                            const info = getStatusInfo(status);
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
