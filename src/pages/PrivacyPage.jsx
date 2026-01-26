import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './LegalPage.css';

const PrivacyPage = () => {
    const { t, i18n } = useTranslation();

    return (
        <div className="legal-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="legal-container">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} />
                    <span>{i18n.language === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}</span>
                </Link>

                <h1 className="legal-title">
                    {i18n.language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                </h1>

                <div className="legal-content">
                    <section>
                        <h2>{i18n.language === 'ar' ? '1. جمع المعلومات' : '1. Information Collection'}</h2>
                        <p>
                            {i18n.language === 'ar'
                                ? 'نجمع المعلومات التي تقدمها لنا مباشرة عند استخدام تطبيق Gelato House، بما في ذلك اسمك وعنوانك ورقم هاتفك ومعلومات الدفع.'
                                : 'We collect information that you provide directly to us when using the Gelato House application, including your name, address, phone number, and payment information.'}
                        </p>
                    </section>

                    <section>
                        <h2>{i18n.language === 'ar' ? '2. استخدام المعلومات' : '2. Use of Information'}</h2>
                        <p>
                            {i18n.language === 'ar'
                                ? 'نستخدم المعلومات التي نجمعها لمعالجة طلباتك وتقديم الخدمات المطلوبة وتحسين تجربتك مع التطبيق.'
                                : 'We use the information we collect to process your orders, provide requested services, and improve your experience with the application.'}
                        </p>
                    </section>

                    <section>
                        <h2>{i18n.language === 'ar' ? '3. حماية المعلومات' : '3. Information Protection'}</h2>
                        <p>
                            {i18n.language === 'ar'
                                ? 'نحن نستخدم تدابير أمنية متقدمة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو الكشف أو التدمير.'
                                : 'We use advanced security measures to protect your personal information from unauthorized access, disclosure, or destruction.'}
                        </p>
                    </section>

                    <section>
                        <h2>{i18n.language === 'ar' ? '4. مشاركة المعلومات' : '4. Information Sharing'}</h2>
                        <p>
                            {i18n.language === 'ar'
                                ? 'لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك مع مقدمي الخدمات الذين يساعدوننا في تشغيل التطبيق.'
                                : 'We do not sell or rent your personal information to third parties. We may share your information with service providers who help us operate the application.'}
                        </p>
                    </section>

                    <section>
                        <h2>{i18n.language === 'ar' ? '5. حقوقك' : '5. Your Rights'}</h2>
                        <p>
                            {i18n.language === 'ar'
                                ? 'لديك الحق في الوصول إلى معلوماتك الشخصية وتعديلها أو حذفها في أي وقت من خلال إعدادات التطبيق.'
                                : 'You have the right to access, modify, or delete your personal information at any time through the application settings.'}
                        </p>
                    </section>
                </div>

                <div className="legal-footer">
                    <p>© 2024 Gelato House. {i18n.language === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPage;
