import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Send } from 'lucide-react';
import './LegalPage.css';

const ContactPage = () => {
    const { t, i18n } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission here
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setFormData({ name: '', email: '', message: '' });
        }, 3000);
    };

    return (
        <div className="legal-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="legal-container contact-container">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} />
                    <span>{i18n.language === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}</span>
                </Link>

                <h1 className="legal-title">
                    {i18n.language === 'ar' ? 'اتصل بنا' : 'Contact Us'}
                </h1>

                <div className="contact-content">
                    <div className="contact-info">
                        <div className="contact-item">
                            <div className="contact-icon">
                                <Mail size={24} />
                            </div>
                            <div>
                                <h3>{i18n.language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</h3>
                                <p>info@gelatohouse.com</p>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-icon">
                                <Phone size={24} />
                            </div>
                            <div>
                                <h3>{i18n.language === 'ar' ? 'الهاتف' : 'Phone'}</h3>
                                <p>+972-50-123-4567</p>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-icon">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h3>{i18n.language === 'ar' ? 'العنوان' : 'Address'}</h3>
                                <p>{i18n.language === 'ar' ? 'تل أبيب، إسرائيل' : 'Tel Aviv, Israel'}</p>
                            </div>
                        </div>
                    </div>

                    <form className="contact-form" onSubmit={handleSubmit}>
                        <h2>{i18n.language === 'ar' ? 'أرسل لنا رسالة' : 'Send us a Message'}</h2>
                        
                        {submitted && (
                            <div className="success-message">
                                {i18n.language === 'ar' 
                                    ? 'شكراً لك! تم إرسال رسالتك بنجاح.' 
                                    : 'Thank you! Your message has been sent successfully.'}
                            </div>
                        )}

                        <div className="form-group">
                            <label>{i18n.language === 'ar' ? 'الاسم' : 'Name'}</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>{i18n.language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>{i18n.language === 'ar' ? 'الرسالة' : 'Message'}</label>
                            <textarea
                                rows="5"
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                required
                            />
                        </div>

                        <button type="submit" className="submit-btn">
                            <Send size={18} />
                            <span>{i18n.language === 'ar' ? 'إرسال' : 'Send'}</span>
                        </button>
                    </form>
                </div>

                <div className="legal-footer">
                    <p>© 2024 Gelato House. {i18n.language === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
