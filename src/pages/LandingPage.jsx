import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Moon,
    Sun,
    Globe,
    Smartphone,
    CreditCard,
    Award,
    Zap,
    ChefHat,
    ShoppingBag,
    Mail,
    Phone,
    MapPin,
    Download,
    ShoppingCart,
    Heart,
    Clock,
    Shield,
    Star,
    Users,
    Truck,
    Menu as MenuIcon,
    X
} from 'lucide-react';
import { seedData } from '../data/seedData';
import { toggleTheme, getStoredTheme } from '../utils/theme';
import { AppleIcon, GooglePlayIcon, InstagramIcon, FacebookIcon, TwitterIcon } from '../components/AppStoreIcons';
import './LandingPage.css';

const LandingPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [isDark, setIsDark] = useState(getStoredTheme() === 'dark');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleToggleTheme = () => {
        const newTheme = toggleTheme();
        setIsDark(newTheme === 'dark');
    };

    const toggleLang = () => {
        const newLang = i18n.language === 'ar' ? 'he' : 'ar';
        i18n.changeLanguage(newLang);
        // Both Arabic and Hebrew use RTL
        document.dir = 'rtl';
    };

    // Ensure RTL on mount
    useEffect(() => {
        if (i18n.language === 'ar' || i18n.language === 'he') {
            document.dir = 'rtl';
        }
    }, [i18n.language]);

    // Services and Features
    const services = [
        {
            icon: <Award size={48} className="text-primary" />,
            titleAr: 'برنامج ولاء مميز',
            titleHe: 'תוכנית נאמנות ייחודית',
            descAr: 'اكسب النقاط مع كل طلب واستبدلها بمنتجات مجانية وخصومات حصرية. احصل على عضوية ذهبية وفضية مع مزايا خاصة.',
            descHe: 'צברו נקודות עם כל הזמנה והמירו אותן למוצרים חינם והנחות בלעדיות. קבלו חברות זהב וכסף עם הטבות מיוחדות.'
        },
        {
            icon: <Truck size={48} className="text-warning" />,
            titleAr: 'توصيل فائق السرعة',
            titleHe: 'משלוח סופר מהיר',
            descAr: 'نضمن وصول طلبك طازجاً وفي الوقت المحدد بفضل شبكة التوصيل الذكية. توصيل مجاني للطلبات الكبيرة.',
            descHe: 'אנו מבטיחים שההזמנה תגיע טרייה ובזמן בזכות רשת המשלוחים החכמה. משלוח חינם להזמנות גדולות.'
        },
        {
            icon: <ChefHat size={48} className="text-success" />,
            titleAr: 'جودة عالية',
            titleHe: 'איכות גבוהה',
            descAr: 'جيلاتو طازج يومياً مصنوع بيد خبراء إيطاليين. نستخدم أفضل المكونات الطبيعية بدون إضافات صناعية.',
            descHe: 'גלידה טרייה מדי יום המיוצרת בידי מומחים איטלקיים. אנו משתמשים במרכיבים הטבעיים הטובים ביותר ללא תוספים מלאכותיים.'
        },
        {
            icon: <CreditCard size={48} className="text-info" />,
            titleAr: 'خيارات دفع آمنة',
            titleHe: 'אפשרויות תשלום מאובטחות',
            descAr: 'ادفع بأمان عبر Apple Pay، البطاقات الائتمانية، أو نقداً عند الاستلام. جميع المعاملات مشفرة وآمنة.',
            descHe: 'שלמו בבטחה באמצעות Apple Pay, כרטיסי אשראי או במזומן בעת קבלה. כל העסקאות מוצפנות ומאובטחות.'
        },
        {
            icon: <Star size={48} className="text-primary" />,
            titleAr: 'تقييمات ممتازة',
            titleHe: 'דירוגים מעולים',
            descAr: 'أكثر من 10,000 عميل سعيد. تقييم 4.9/5 نجوم بناءً على آلاف المراجعات الإيجابية.',
            descHe: 'יותר מ-10,000 לקוחות מרוצים. דירוג 4.9/5 כוכבים על בסיס אלפי ביקורות חיוביות.'
        },
        {
            icon: <Clock size={48} className="text-warning" />,
            titleAr: 'متاح 24/7',
            titleHe: 'זמין 24/7',
            descAr: 'اطلب في أي وقت من اليوم. نحن متاحون على مدار الساعة لتلبية احتياجاتك.',
            descHe: 'הזמינו בכל שעה ביום. אנו זמינים 24 שעות ביממה כדי לספק את צרכיכם.'
        }
    ];

    const steps = [
        {
            step: '01',
            icon: <Download size={32} />,
            titleAr: 'حمل التطبيق',
            titleHe: 'הורידו את האפליקציה',
            descAr: 'حمّل تطبيق Gelato House مجاناً من متجر أبل أو جوجل بلاي. التسجيل سريع وسهل.',
            descHe: 'הורידו את אפליקציית Gelato House בחינם מ-App Store או Google Play. ההרשמה מהירה וקלה.'
        },
        {
            step: '02',
            icon: <ShoppingCart size={32} />,
            titleAr: 'اختر طلبك',
            titleHe: 'בחרו את ההזמנה',
            descAr: 'تصفح القائمة المتنوعة من الجيلاتو والآيس كريم. اختر النكهات والأحجام والإضافات المفضلة لديك.',
            descHe: 'דפדפו בתפריט המגוון של גלידה וגלידות. בחרו את הטעמים, הגדלים והתוספות האהובים עליכם.'
        },
        {
            step: '03',
            icon: <CreditCard size={32} />,
            titleAr: 'ادفع بسهولة',
            titleHe: 'שלמו בקלות',
            descAr: 'اختر طريقة الدفع المناسبة لك. دفع آمن ومشفر مع خيارات متعددة.',
            descHe: 'בחרו את שיטת התשלום המתאימה לכם. תשלום מאובטח ומוצפן עם אפשרויות מרובות.'
        },
        {
            step: '04',
            icon: <Truck size={32} />,
            titleAr: 'استلم طلبك',
            titleHe: 'קבלו את ההזמנה',
            descAr: 'استرخِ بينما نقوم بتحضير طلبك طازجاً وتوصيله إلى باب منزلك في الوقت المحدد.',
            descHe: 'הירגעו בזמן שאנו מכינים את ההזמנה שלכם טרייה ומעבירים אותה עד לפתח דלתכם בזמן.'
        }
    ];

    return (
        <div className="landing-page" dir="rtl">

            {/* Header */}
            <header className="landing-header glass">
                <div className="container header-content">
                    <Link to="/" className="logo-section">
                        <div className="logo-icon-bg">
                            <img
                                src="/gelato-logo.png"
                                alt="Gelato House"
                                className="logo-img"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <span className="logo-fallback" style={{ fontSize: '1.5rem', display: 'none' }}>🍦</span>
                        </div>
                        <div className="logo-text-wrapper branding-text">
                            <span className="logo-text main-brand">Gelato</span>
                            <span className="logo-text-secondary sub-brand">House</span>
                        </div>
                    </Link>

                    <nav className="nav-menu">
                        <Link to="/" className="nav-link">
                            {i18n.language === 'ar' ? 'الرئيسية' : 'בית'}
                        </Link>
                        <Link to="/contact" className="nav-link">
                            {i18n.language === 'ar' ? 'اتصل بنا' : 'צור קשר'}
                        </Link>
                    </nav>

                    <div className="nav-actions-desktop">
                        <button className="icon-btn" onClick={handleToggleTheme} aria-label="Toggle Theme">
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button className="icon-btn lang-btn" onClick={toggleLang} aria-label="Toggle Language">
                            <Globe size={20} />
                            <span className="lang-code">{i18n.language === 'ar' ? 'עברית' : 'العربية'}</span>
                        </button>
                        <button className="login-link-btn" onClick={() => navigate('/login')}>
                            <LayoutDashboard size={18} />
                            <span>{i18n.language === 'ar' ? 'دخول الإدارة' : 'כניסת מנהל'}</span>
                        </button>
                    </div>

                    <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={28} /> : <MenuIcon size={28} />}
                    </button>
                </div>
            </header>

            {/* Mobile Drawer */}
            <div className={`mobile-drawer ${isMenuOpen ? 'open' : ''}`}>
                <div className="drawer-overlay" onClick={() => setIsMenuOpen(false)}></div>
                <div className="drawer-content glass">
                    <div className="drawer-header">
                        <div className="logo-text-wrapper branding-text">
                            <span className="logo-text main-brand">Gelato</span>
                            <span className="logo-text-secondary sub-brand">House</span>
                        </div>
                        <button className="close-btn" onClick={() => setIsMenuOpen(false)}><X size={24} /></button>
                    </div>

                    <nav className="drawer-nav">
                        <Link to="/" className="drawer-link" onClick={() => setIsMenuOpen(false)}>
                            {i18n.language === 'ar' ? 'الرئيسية' : 'بيت'}
                        </Link>
                        <Link to="/contact" className="drawer-link" onClick={() => setIsMenuOpen(false)}>
                            {i18n.language === 'ar' ? 'اتصل بنا' : 'צור קשר'}
                        </Link>
                        <Link to="/terms" className="drawer-link" onClick={() => setIsMenuOpen(false)}>
                            {i18n.language === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}
                        </Link>
                        <Link to="/privacy" className="drawer-link" onClick={() => setIsMenuOpen(false)}>
                            {i18n.language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                        </Link>
                    </nav>

                    <div className="drawer-actions">
                        <button className="drawer-btn theme-btn" onClick={handleToggleTheme}>
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                            <span>{i18n.language === 'ar' ? (isDark ? 'الوضع الفاتح' : 'الوضع المظلم') : (isDark ? 'Light Mode' : 'Dark Mode')}</span>
                        </button>

                        <button className="drawer-btn lang-btn" onClick={toggleLang}>
                            <Globe size={20} />
                            <span>{i18n.language === 'ar' ? 'עברית' : 'العربية'}</span>
                        </button>

                        <button className="drawer-login-btn" onClick={() => { setIsMenuOpen(false); navigate('/login'); }}>
                            <LayoutDashboard size={20} />
                            <span>{i18n.language === 'ar' ? 'دخول الإدارة' : 'כניסת מנהל'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="container hero-container">
                    <div className="hero-text">
                        <div className="badge-pill">
                            <Award size={14} />
                            <span>{i18n.language === 'ar' ? 'متجر الجيلاتو رقم #1' : '#1 Gelato Shop'}</span>
                        </div>
                        <h1 className="hero-title">
                            {i18n.language === 'ar'
                                ? <>استمتع بأشهى <span className="highlight-text">الجيلاتو والآيس كريم</span> الطازج</>
                                : <>תהנו מהגלידה והגלידות <span className="highlight-text">הטריות והטעימות</span> ביותר</>}
                        </h1>
                        <p className="hero-subtitle">
                            {i18n.language === 'ar'
                                ? 'اكتشف عالماً من النكهات الإيطالية الأصيلة. جيلاتو طازج يومياً، وافل مقرمش، ومثلجات فاخرة. اطلب الآن واستمتع بالطعم الرائع في أي وقت.'
                                : 'גלו עולם של טעמים איטלקיים אותנטיים. גלידה טרייה מדי יום, וופלים פריכים וגלידות יוקרתיות. הזמינו עכשיו ותהנו מהטעם המדהים בכל שעה.'}
                        </p>

                        <div className="app-buttons">
                            <a href="#" className="store-btn apple">
                                <AppleIcon size={32} />
                                <div className="btn-content">
                                    <span className="small-text">{i18n.language === 'ar' ? 'حمّل من' : 'הורד מ'}</span>
                                    <span className="big-text">App Store</span>
                                </div>
                            </a>
                            <a href="#" className="store-btn google">
                                <GooglePlayIcon size={32} />
                                <div className="btn-content">
                                    <span className="small-text">{i18n.language === 'ar' ? 'احصل عليه من' : 'קבל מ'}</span>
                                    <span className="big-text">Google Play</span>
                                </div>
                            </a>
                        </div>
                    </div>

                    <div className="hero-image-wrapper">
                        {/* Abstract background blobs */}
                        <div className="blob blob-1"></div>
                        <div className="blob blob-2"></div>

                        <div className="phone-frame floating">
                            <img
                                src="/app-screenshot.png"
                                alt="App Screen"
                                className="app-screen"
                            />
                            {/* Floating Cards */}
                            <div className="float-card card-1 glass">
                                <div className="icon-circle bg-orange"><Zap size={18} color="white" /></div>
                                <div>
                                    <div className="bold">{i18n.language === 'ar' ? 'سريع' : 'Fast'}</div>
                                    <div className="tiny">{i18n.language === 'ar' ? 'توصيل' : 'Delivery'}</div>
                                </div>
                            </div>
                            <div className="float-card card-2 glass">
                                <div className="icon-circle bg-pink"><Award size={18} color="white" /></div>
                                <div>
                                    <div className="bold">4.9/5</div>
                                    <div className="tiny">{i18n.language === 'ar' ? 'تقييم' : 'Rating'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section className="services-section">
                <div className="container">
                    <div className="section-head text-center">
                        <h2 className="section-heading">
                            {i18n.language === 'ar' ? 'خدماتنا وميزاتنا' : 'השירותים והתכונות שלנו'}
                        </h2>
                        <p className="section-subheading">
                            {i18n.language === 'ar'
                                ? 'نقدم لك تجربة استثنائية مع أفضل الخدمات والميزات'
                                : 'אנו מציעים לכם חוויה יוצאת דופן עם השירותים והתכונות הטובים ביותר'}
                        </p>
                    </div>

                    <div className="services-grid">
                        {services.map((service, i) => (
                            <div className="service-card" key={i}>
                                <div className="service-icon-wrapper">
                                    {service.icon}
                                </div>
                                <h3>{i18n.language === 'ar' ? service.titleAr : service.titleHe}</h3>
                                <p>{i18n.language === 'ar' ? service.descAr : service.descHe}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="steps-section">
                <div className="container">
                    <div className="section-head text-center">
                        <h2 className="section-heading">
                            {i18n.language === 'ar' ? 'كيف يعمل التطبيق؟' : 'איך האפליקציה עובדת?'}
                        </h2>
                        <p className="section-subheading">
                            {i18n.language === 'ar'
                                ? 'عملية بسيطة وسريعة لطلب الجيلاتو المفضل لديك'
                                : 'תהליך פשוט ומהיר להזמנת הגלידה האהובה עליכם'}
                        </p>
                    </div>

                    <div className="steps-wrapper">
                        {steps.map((s, i) => (
                            <div className="step-item" key={i}>
                                <div className="step-number-wrapper">
                                    <div className="step-number">{s.step}</div>
                                    <div className="step-icon">{s.icon}</div>
                                </div>
                                <h3>{i18n.language === 'ar' ? s.titleAr : s.titleHe}</h3>
                                <p>{i18n.language === 'ar' ? s.descAr : s.descHe}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container cta-container">
                    <div className="cta-content">
                        <h2>{i18n.language === 'ar' ? 'جاهز لتجربة الطعم الرائع؟' : 'מוכנים לטעום את הקסם?'}</h2>
                        <p>{i18n.language === 'ar' ? 'حمّل التطبيق الآن وانضم لآلاف العملاء السعداء. ابدأ رحلتك مع Gelato House اليوم!' : 'הורידו את האפליקציה עכשיו והצטרפו לאלפי לקוחות מרוצים. התחילו את המסע שלכם עם Gelato House היום!'}</p>
                        <div className="app-buttons scale-down">
                            <a href="#" className="store-btn apple dark-mode-btn">
                                <AppleIcon size={28} />
                                <div className="btn-content">
                                    <span className="small-text">{i18n.language === 'ar' ? 'حمّل من' : 'הורד מ'}</span>
                                    <span className="big-text">App Store</span>
                                </div>
                            </a>
                            <a href="#" className="store-btn google dark-mode-btn">
                                <GooglePlayIcon size={28} />
                                <div className="btn-content">
                                    <span className="small-text">{i18n.language === 'ar' ? 'احصل عليه من' : 'קבל מ'}</span>
                                    <span className="big-text">Google Play</span>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="main-footer">
                <div className="container footer-inner">
                    <div className="footer-brand">
                        <div className="footer-logo">
                            <img
                                src="/gelato-logo.png"
                                alt="Gelato House"
                                style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <span style={{ fontSize: '1.5rem', display: 'none' }}>🍦</span>
                        </div>
                        <div className="footer-brand-text branding-text">
                            <h3 className="main-brand">Gelato House</h3>
                            <p>{i18n.language === 'ar' ? 'وجهتك الأولى للسعادة والطعم الرائع.' : 'היעד שלكم לאושר וטעמים מדהימים.'}</p>
                        </div>
                    </div>

                    <div className="footer-sections">
                        <div className="footer-section">
                            <h4>{i18n.language === 'ar' ? 'روابط سريعة' : 'Quick Links'}</h4>
                            <div className="footer-links">
                                <Link to="/" className="footer-link">
                                    {i18n.language === 'ar' ? 'الصفحة الرئيسية' : 'Home'}
                                </Link>
                                <Link to="/contact" className="footer-link">
                                    {i18n.language === 'ar' ? 'اتصل بنا' : 'Contact Us'}
                                </Link>
                            </div>
                        </div>

                        <div className="footer-section">
                            <h4>{i18n.language === 'ar' ? 'معلومات قانونية' : 'Legal'}</h4>
                            <div className="footer-links">
                                <Link to="/terms" className="footer-link">
                                    {i18n.language === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}
                                </Link>
                                <Link to="/privacy" className="footer-link">
                                    {i18n.language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                                </Link>
                            </div>
                        </div>

                        <div className="footer-section">
                            <h4>{i18n.language === 'ar' ? 'تابعنا' : 'עקבו אחרינו'}</h4>
                            <div className="footer-social">
                                <a href="#" className="social-link" aria-label="Instagram">
                                    <InstagramIcon size={20} />
                                </a>
                                <a href="#" className="social-link" aria-label="Facebook">
                                    <FacebookIcon size={20} />
                                </a>
                                <a href="#" className="social-link" aria-label="Twitter">
                                    <TwitterIcon size={20} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <div className="container">
                        <p>© 2024 Gelato House. {i18n.language === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
