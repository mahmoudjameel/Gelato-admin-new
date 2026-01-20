import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import he from './he.json';

const resources = {
    ar: { translation: ar },
    he: { translation: he }
};

// Get saved language or default to Arabic
const savedLanguage = localStorage.getItem('adminLanguage') || 'ar';

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: savedLanguage,
        fallbackLng: 'ar',
        interpolation: {
            escapeValue: false
        }
    });

// Save language changes to localStorage
i18n.on('languageChanged', (lng) => {
    localStorage.setItem('adminLanguage', lng);
    document.documentElement.dir = lng === 'ar' || lng === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
});

// Set initial direction
document.documentElement.dir = savedLanguage === 'ar' || savedLanguage === 'he' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLanguage;

export default i18n;
