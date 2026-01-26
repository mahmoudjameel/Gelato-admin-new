import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './LegalPage.css';

const TermsPage = () => {
    const { t, i18n } = useTranslation();

    return (
        <div className="legal-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="legal-container">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} />
                    <span>{i18n.language === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}</span>
                </Link>

                <h1 className="legal-title">
                    {i18n.language === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}
                </h1>

                <div className="legal-content">
                    <section>
                        <h2>{i18n.language === 'ar' ? '1. القبول' : '1. Acceptance'}</h2>
                        <p>
                            {i18n.language === 'ar' 
                                ? 'باستخدام تطبيق Gelato House، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، فيرجى عدم استخدام التطبيق.'
                                : 'By using the Gelato House application, you agree to be bound by these terms and conditions. If you do not agree to any part of these terms, please do not use the application.'}
                        </p>
                    </section>

                    <section>
                        <h2>{i18n.language === 'ar' ? '2. استخدام التطبيق' : '2. Use of Application'}</h2>
                        <p>
                            {i18n.language === 'ar'
                                ? 'يُسمح لك باستخدام تطبيق Gelato House للأغراض الشخصية والتجارية المشروعة فقط. لا يجوز لك استخدام التطبيق لأي غرض غير قانوني أو غير مصرح به.'
                                : 'You are permitted to use the Gelato House application only for lawful personal and commercial purposes. You may not use the application for any illegal or unauthorized purpose.'}
                        </p>
                    </section>

                    <section>
                        <h2>{i18n.language === 'ar' ? '3. الطلبات والدفع' : '3. Orders and Payment'}</h2>
                        <p>
                            {i18n.language === 'ar'
                                ? 'جميع الطلبات خاضعة للتوفر. نحتفظ بالحق في رفض أو إلغاء أي طلب لأي سبب كان. يجب أن تكون جميع معلومات الدفع دقيقة وكاملة.'
                                : 'All orders are subject to availability. We reserve the right to refuse or cancel any order for any reason. All payment information must be accurate and complete.'}
                        </p>
                    </section>

                    <section>
                        <h2>{i18n.language === 'ar' ? '4. الخصوصية' : '4. Privacy'}</h2>
                        <p>
                            {i18n.language === 'ar'
                                ? 'نحن نحمي خصوصيتك. يرجى مراجعة سياسة الخصوصية الخاصة بنا لفهم كيفية جمع واستخدام معلوماتك.'
                                : 'We protect your privacy. Please review our Privacy Policy to understand how we collect and use your information.'}
                        </p>
                    </section>

                    <section>
                        <h2>{i18n.language === 'ar' ? '5. التعديلات' : '5. Modifications'}</h2>
                        <p>
                            {i18n.language === 'ar'
                                ? 'نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إشعارك بأي تغييرات من خلال التطبيق.'
                                : 'We reserve the right to modify these terms at any time. You will be notified of any changes through the application.'}
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

export default TermsPage;
