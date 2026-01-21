import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const REWARD_PRODUCTS = [
    {
        nameAr: 'عبوة آيس كريم عائلية (1 كيلو)',
        nameHe: 'מארז גלידה משפחתי (1 ק"ג)',
        descriptionAr: 'تشكيلة من النكهات الرائعة تكفي لـ 6-8 أشخاص، مثالية للجمعات العائلية.',
        descriptionHe: 'מבחר טעמים נהדרים המספיקים ל-6-8 אנשים, מושלם למפגשים משפחתיים.',
        price: 0,
        loyaltyPointsPrice: 2000,
        category: 'icecream',
        image: 'https://images.unsplash.com/photo-1501443762994-82bd5dabb892?w=800',
        rating: '5.0',
        classification: 'A',
        flavors: [
            { nameAr: 'فانيليا', nameHe: 'וניל' },
            { nameAr: 'شوكولاتة', nameHe: 'שוקולד' },
            { nameAr: 'فراولة', nameHe: 'תות' }
        ],
        sizes: [
            { nameAr: '1 كيلو', nameHe: '1 ק"ג', price: 0, isDefault: true }
        ],
        extras: []
    },
    {
        nameAr: 'وافل النوتيلا الملكي باشن',
        nameHe: 'וופל נוטלה מלכותי פאשן',
        descriptionAr: 'وافل بلجيكي مقرمش مغطى بطبقة سخية من النوتيلا وقطع الفواكه الطازجة مع 3 بولات آيس كريم.',
        descriptionHe: 'וופל בלגי פריך מצופה בשכבה נדיבה של נוטלה ופירות טריים עם 3 כדורי גלידה.',
        price: 0,
        loyaltyPointsPrice: 850,
        category: 'sweets',
        image: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800',
        rating: '4.9',
        classification: 'B',
        flavors: [],
        sizes: [
            { nameAr: 'حجم كبير', nameHe: 'גדול', price: 0, isDefault: true }
        ],
        extras: [
            { nameAr: 'صوص إضافي', nameHe: 'תוספת רוטב', price: 0, isDefault: false }
        ]
    },
    {
        nameAr: 'كريب اللوتس المقرمش',
        nameHe: 'קרפ לוטוס קראנץ׳',
        descriptionAr: 'كريب رقيق محشو بزبذة اللوتس وبسكويت اللوتس المطحون مع صوص الكراميل.',
        descriptionHe: 'קרפ דק במילוי חמאת לוטוס ועוגיות לוטוס טחונות עם רוטב קרמל.',
        price: 0,
        loyaltyPointsPrice: 650,
        category: 'crepe',
        image: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=800',
        rating: '4.8',
        classification: 'C',
        flavors: [],
        sizes: [],
        extras: []
    },
    {
        nameAr: 'ميلك شيك أوريو بوم',
        nameHe: 'מילקשייק אוריו בום',
        descriptionAr: 'ميلك شيك كثيف ومنعش مع قطع الأوريو الحقيقية وكريمة الخفق.',
        descriptionHe: 'מילקשייק סמיך ומרענן עם חתיכות אוריו אמיתיות וקצפת.',
        price: 0,
        loyaltyPointsPrice: 500,
        category: 'drinks',
        image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800',
        rating: '4.7',
        classification: 'D',
        flavors: [],
        sizes: [],
        extras: []
    },
    {
        nameAr: 'سلطة فواكه استوائية بالجيلاتو',
        nameHe: 'סלט פירות טרופי עם ג׳לטו',
        descriptionAr: 'مجموعة من الفواكه الموسمية الطازجة تعلوها بولة آيس كريم مانجو وبولة ليمون.',
        descriptionHe: 'מבחר פירות העונה טריים עם כדור גלידת מנגו וכדור לימון.',
        price: 0,
        loyaltyPointsPrice: 450,
        category: 'sweets',
        image: 'https://images.unsplash.com/photo-1512414777092-a9bd91d28923?w=800',
        rating: '4.9',
        classification: 'B',
        flavors: [],
        sizes: [],
        extras: []
    }
];

export const seedRewards = async () => {
    let addedCount = 0;
    let skippedCount = 0;

    for (const product of REWARD_PRODUCTS) {
        // Check if product already exists to avoid duplicates
        const q = query(
            collection(db, 'products'),
            where('nameAr', '==', product.nameAr)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            await addDoc(collection(db, 'products'), {
                ...product,
                name: product.nameAr, // For compatibility
                description: product.descriptionAr,
                createdAt: new Date().toISOString()
            });
            addedCount++;
        } else {
            skippedCount++;
        }
    }

    return { addedCount, skippedCount };
};

export const seedDatabase = seedRewards;

export const clearDatabase = async () => {
    const snapshot = await getDocs(collection(db, 'products'));
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'products', docSnap.id)));
    await Promise.all(deletePromises);
    return { deletedCount: snapshot.docs.length };
};
