import { db } from '../firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const MOCK_CATEGORIES = [
    { id: 'icecream', name: 'Ice Cream', nameAr: 'آيس كريم', nameHe: 'גלידה', icon: '🍦' },
    { id: 'softserve', name: 'Soft Serve', nameAr: 'سوفت سيرف', nameHe: 'גלידה אמריקאית', icon: '🍦' },
    { id: 'frozenyogurt', name: 'Frozen Yogurt', nameAr: 'فروزن يوجرت', nameHe: 'פרוזן יוגורט', icon: '🍧' },
    { id: 'gelato', name: 'Gelato', nameAr: 'جيلاتي', nameHe: 'ג\'לטו', icon: '🍨' },
    { id: 'sorbet', name: 'Sorbet', nameAr: 'سوربيت', nameHe: 'סורבה', icon: '🍧' },
    { id: 'crepes', name: 'Crepes', nameAr: 'كريب', nameHe: 'קרפ', icon: '🥞' },
    { id: 'waffles', name: 'Waffles', nameAr: 'وافل', nameHe: 'וופל', icon: '🧇' },
    { id: 'pancakes', name: 'Pancakes', nameAr: 'بان كيك', nameHe: 'פנקייק', icon: '🥞' },
    { id: 'minipancakes', name: 'Mini Pancakes', nameAr: 'ميني بان كيك', nameHe: 'מיני פנקייק', icon: '🥞' },
    { id: 'milkshakes', name: 'Milkshakes', nameAr: 'ميلك شيك', nameHe: 'מילקשייק', icon: '🥤' },
    { id: 'smoothies', name: 'Smoothies', nameAr: 'سموثي', nameHe: 'סמוזי', icon: '🍹' },
    { id: 'freshjuice', name: 'Fresh Juice', nameAr: 'عصير طازج', nameHe: 'מיץ טרי', icon: '🍊' },
    { id: 'icedcoffee', name: 'Iced Coffee', nameAr: 'قهوة مثلجة', nameHe: 'אייס קפה', icon: '🧋' },
    { id: 'hotcoffee', name: 'Hot Coffee', nameAr: 'قهوة ساخنة', nameHe: 'קפה חם', icon: '☕' },
    { id: 'bubbletea', name: 'Bubble Tea', nameAr: 'شاي الفقاعات', nameHe: 'באבל תיי', icon: '🧋' },
    { id: 'acaibowls', name: 'Acai Bowls', nameAr: 'أساي', nameHe: 'אסאי', icon: '🥣' },
    { id: 'fruitsalad', name: 'Fruit Salad', nameAr: 'سلطة فواكه', nameHe: 'סלט פירות', icon: '🥗' },
    { id: 'parfaits', name: 'Parfaits', nameAr: 'بارفيه', nameHe: 'פרפה', icon: '🥙' },
    { id: 'cookies', name: 'Cookies', nameAr: 'كوكيز', nameHe: 'עוגיות', icon: '🍪' },
    { id: 'brownies', name: 'Brownies', nameAr: 'براوني', nameHe: 'בראוניז', icon: '🍫' }
];

const MOCK_PRODUCTS = [
    {
        name: 'Vanilla Bean Ice Cream',
        nameAr: 'آيس كريم فانيليا',
        nameHe: 'גלידת וניל',
        description: 'Classic vanilla bean ice cream made with real vanilla pods.',
        descriptionAr: 'آيس كريم فانيليا كلاسيكي مصنوع من أعواد الفانيليا الحقيقية.',
        descriptionHe: 'גלידת וניל קלאסית עשויה מקלות וניל אמיתיים.',
        price: 15,
        category: 'icecream',
        image: 'https://images.unsplash.com/photo-1549395156-e0c1fe6fc7a5?w=800',
        rating: 4.8,
        sizes: [
            { name: '1 Scoop', nameAr: 'بولة واحدة', nameHe: 'כדור אחד', price: 0, isDefault: true },
            { name: '2 Scoops', nameAr: 'بولتين', nameHe: 'שני כדורים', price: 8, isDefault: false },
            { name: '3 Scoops', nameAr: '3 بولات', nameHe: 'שלושה כדורים', price: 15, isDefault: false }
        ],
        flavors: [
            { name: 'Vanilla', nameAr: 'فانيليا', nameHe: 'וניל' },
            { name: 'French Vanilla', nameAr: 'فانيليا فرنسية', nameHe: 'וניל צרפתי' }
        ],
        extras: [
            { name: 'Sprinkles', nameAr: 'حبيبات ملونة', nameHe: 'סוכריות צבעוניות', price: 2, isDefault: false, image: 'https://images.unsplash.com/photo-1512485800893-b08ec1ea59b1?w=200' },
            { name: 'Choco Sauce', nameAr: 'صوص شوكولاتة', nameHe: 'רוטב שוקולד', price: 3, isDefault: false, image: 'https://images.unsplash.com/photo-1622321528441-306fc6ceee2f?w=200' }
        ]
    },
    {
        name: 'Chocolate Soft Serve',
        nameAr: 'سوفت سيرف شوكولاتة',
        nameHe: 'גלידה אמריקאית שוקולד',
        description: 'Smooth and creamy chocolate soft serve ice cream.',
        descriptionAr: 'آيس كريم شوكولاتة ناعم وكريمي.',
        descriptionHe: 'גלידה אמריקאית שוקולד חלקה וקרמית.',
        price: 12,
        category: 'softserve',
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800',
        rating: 4.7,
        sizes: [
            { name: 'Small', nameAr: 'صغير', nameHe: 'קטן', price: 0, isDefault: true },
            { name: 'Medium', nameAr: 'وسط', nameHe: 'בינוני', price: 4, isDefault: false },
            { name: 'Large', nameAr: 'كبير', nameHe: 'גדול', price: 6, isDefault: false }
        ],
        flavors: [
            { name: 'Chocolate', nameAr: 'شوكولاتة', nameHe: 'שוקולד' },
            { name: 'Twist', nameAr: 'ميكس', nameHe: 'מעורב' }
        ],
        extras: [
            { name: 'Wafer', nameAr: 'ويفر', nameHe: 'וופל', price: 2, isDefault: false, image: 'https://images.unsplash.com/photo-1571506165871-ee72a35bc9d4?w=200' }
        ]
    },
    {
        name: 'Berry Blast Froyo',
        nameAr: 'فروزن يوجرت توت',
        nameHe: 'פרוזן יוגורט פירות יער',
        description: 'Low-fat frozen yogurt swirled with mixed berries.',
        descriptionAr: 'زبادي مثلج قليل الدسم ممزوج بالتوت المشكل.',
        descriptionHe: 'יוגורט מוקפא דל שומן בטעם פירות יער.',
        price: 18,
        category: 'frozenyogurt',
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
        rating: 4.9,
        sizes: [
            { name: 'Cup Small', nameAr: 'كوب صغير', nameHe: 'כוס קטנה', price: 0, isDefault: true },
            { name: 'Cup Large', nameAr: 'كوب كبير', nameHe: 'כוס גדולה', price: 5, isDefault: false }
        ],
        flavors: [
            { name: 'Original Tart', nameAr: 'اصلي لاذع', nameHe: 'טבעי חמוץ' },
            { name: 'Strawberry', nameAr: 'فراولة', nameHe: 'תות' }
        ],
        extras: [
            { name: 'Granola', nameAr: 'جرانولا', nameHe: 'גרנולה', price: 3, isDefault: false, image: 'https://images.unsplash.com/photo-1517093602195-b40af9688b46?w=200' },
            { name: 'Fresh Fruit', nameAr: 'فواكه طازجة', nameHe: 'פירות טריים', price: 5, isDefault: false, image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=200' }
        ]
    },
    {
        name: 'Pistachio Gelato',
        nameAr: 'جيلاتي فستق',
        nameHe: 'ג\'לטו פיסטוק',
        description: 'Authentic Italian gelato made with roasted pistachios.',
        descriptionAr: 'جيلاتي إيطالي أصلي مصنوع من الفستق المحمص.',
        descriptionHe: 'ג\'לטו איטלקי אותנטי עשוי מפיסטוקים קלויים.',
        price: 20,
        category: 'gelato',
        image: 'https://images.unsplash.com/photo-1557142046-c704a3adf364?w=800',
        rating: 4.9,
        sizes: [
            { name: 'Small Cup', nameAr: 'كوب صغير', nameHe: 'כוס קטנה', price: 0, isDefault: true },
            { name: 'Large Cup', nameAr: 'كوب كبير', nameHe: 'כוס גדולה', price: 5, isDefault: false },
            { name: 'Waffle Cone', nameAr: 'بسكويت وافل', nameHe: 'גביע וופל', price: 3, isDefault: false }
        ],
        flavors: [
            { name: 'Pistachio', nameAr: 'فستق', nameHe: 'פיסטוק' },
            { name: 'Hazelnut', nameAr: 'بندق', nameHe: 'אגוזי לוז' }
        ],
        extras: []
    },
    {
        name: 'Lemon Basil Sorbet',
        nameAr: 'سوربيت ليمون وريحان',
        nameHe: 'סורבה לימון ובזיליקום',
        description: 'Zesty lemon sorbet with a hint of fresh basil.',
        descriptionAr: 'سوربيت ليمون منعش مع لمسة من الريحان الطازج.',
        descriptionHe: 'סורבה לימון מרענן עם נגיעת בזיליקום טרי.',
        price: 16,
        category: 'sorbet',
        image: 'https://images.unsplash.com/photo-1517093602195-b40af9688b46?w=800',
        rating: 4.6,
        sizes: [
            { name: 'Scoop', nameAr: 'بولة', nameHe: 'כדור', price: 0, isDefault: true }
        ],
        flavors: [
            { name: 'Lemon', nameAr: 'ليمون', nameHe: 'לימון' },
            { name: 'Raspberry', nameAr: 'توت العليق', nameHe: 'פטל' }
        ],
        extras: []
    },
    {
        name: 'Nutella Strawberry Crepe',
        nameAr: 'كريب نوتيلا وفراولة',
        nameHe: 'קרפ נוטלה ותותים',
        description: 'Freshly made crepe filled with Nutella and strawberries.',
        descriptionAr: 'كريب طازج محشو بالنوتيلا والفراولة.',
        descriptionHe: 'קרפ טרי במילוי נוטלה ותותים.',
        price: 26,
        category: 'crepes',
        image: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=800',
        rating: 4.8,
        flavors: [],
        extras: [
            { name: 'Extra Nutella', nameAr: 'نوتيلا إضافية', nameHe: 'תוספת נוטלה', price: 4, isDefault: false, image: 'https://images.unsplash.com/photo-1499636138143-bd649043ea52?w=200' },
            { name: 'Extra Banana', nameAr: 'موز إضافي', nameHe: 'תוספת בננה', price: 2, isDefault: false, image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200' },
            { name: 'Whipped Cream', nameAr: 'كريمة مخفوقة', nameHe: 'קצפת', price: 3, isDefault: false, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=200' }
        ]
    },
    {
        name: 'Lotus Biscoff Waffle',
        nameAr: 'وافل لوتس',
        nameHe: 'וופל לוטוס',
        description: 'Belgian waffle topped with Lotus Biscoff spread and crumbs.',
        descriptionAr: 'وافل بلجيكي مغطى بصلصة اللوتس وفتات البسكويت.',
        descriptionHe: 'וופל בלגי מכוסה בממרח לוטוס ופירורי ביסקוויט.',
        price: 28,
        category: 'waffles',
        image: 'https://images.unsplash.com/photo-1568051243851-f9b136146905?w=800',
        rating: 4.9,
        extras: [
            { name: 'Vanilla Scoop', nameAr: 'بولة فانيليا', nameHe: 'כדור וניל', price: 6, isDefault: false, image: 'https://images.unsplash.com/photo-1549395156-e0c1fe6fc7a5?w=200' },
            { name: 'Extra Sauce', nameAr: 'صوص إضافي', nameHe: 'רוטב נוסף', price: 3, isDefault: false, image: 'https://images.unsplash.com/photo-1499636138143-bd649043ea52?w=200' }
        ]
    },
    {
        name: 'Blueberry Pancakes',
        nameAr: 'بان كيك التوت',
        nameHe: 'פנקייק אוכמניות',
        description: 'Fluffy pancakes served with blueberry compote and syrup.',
        descriptionAr: 'بان كيك هش يقدم مع كومبوت التوت والشراب.',
        descriptionHe: 'פנקייקים אווריריים מוגשים עם קומפוט אוכמניות וסירופ.',
        price: 30,
        category: 'pancakes',
        image: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800',
        rating: 4.7,
        extras: [
            { name: 'Maple Syrup', nameAr: 'شراب القيقب', nameHe: 'סירופ מייפל', price: 0, isDefault: true, image: 'https://images.unsplash.com/photo-1589301760576-41f4724dad72?w=200' },
            { name: 'Butter', nameAr: 'زبدة', nameHe: 'חמאה', price: 0, isDefault: true, image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200' }
        ]
    },
    {
        name: 'Pistachio Mini Pancakes',
        nameAr: 'ميني بان كيك فستق',
        nameHe: 'מיני פנקייק פיסטוק',
        description: 'Bite-sized pancakes drenched in pistachio sauce.',
        descriptionAr: 'قطع بان كيك صغيرة مغطاة بصوص الفستق.',
        descriptionHe: 'מיני פנקייקים מכוסים ברוטב פיסטוק.',
        price: 25,
        category: 'minipancakes',
        image: 'https://images.unsplash.com/photo-1598214886806-c87b84b7078b?w=800',
        rating: 4.8,
        sizes: [
            { name: '10 Pcs', nameAr: '10 قطع', nameHe: '10 יחידות', price: 0, isDefault: true },
            { name: '15 Pcs', nameAr: '15 قطعة', nameHe: '15 יחידות', price: 8, isDefault: false }
        ]
    },
    {
        name: 'Oreo Milkshake',
        nameAr: 'ميلك شيك أوريو',
        nameHe: 'מילקשייק אוראו',
        description: 'Creamy milkshake blended with Oreo cookies.',
        descriptionAr: 'ميلك شيك كريمي ممزوج بقطع الأوريو.',
        descriptionHe: 'מילקשייק שמנת מעורבב עם עוגיות אוראו.',
        price: 22,
        category: 'milkshakes',
        image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800',
        rating: 4.9,
        sizes: [
            { name: 'Classic', nameAr: 'عادي', nameHe: 'רגיל', price: 0, isDefault: true },
            { name: 'Large', nameAr: 'كبير', nameHe: 'גדול', price: 6, isDefault: false }
        ],
        flavors: [
            { name: 'Oreo', nameAr: 'أوريو', nameHe: 'אוראו' }
        ],
        extras: [
            { name: 'Whipped Cream', nameAr: 'كريمة مخفوقة', nameHe: 'קצפת', price: 0, isDefault: true, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=200' }
        ]
    },
    {
        name: 'Tropical Paradise Smoothie',
        nameAr: 'سموثي تروبيكال بارادايس',
        nameHe: 'סמוזי טרופי',
        description: 'Blend of mango, pineapple, and banana.',
        descriptionAr: 'مزيج من المانجو والأناناس والموز.',
        descriptionHe: 'תערובת של מנגו, אננס ובננה.',
        price: 20,
        category: 'smoothies',
        image: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800',
        rating: 4.8,
        flavors: [],
        extras: [
            { name: 'Chia Seeds', nameAr: 'بذور الشيا', nameHe: 'זרעי צ\'יה', price: 2, isDefault: false }
        ]
    },
    {
        name: 'Fresh Orange Juice',
        nameAr: 'عصير برتقال طازج',
        nameHe: 'מיץ תפוזים טרי',
        description: '100% freshly squeezed orange juice.',
        descriptionAr: 'عصير برتقال معصور طازج 100%.',
        descriptionHe: '100% מיץ תפוזים סחוט טרי.',
        price: 15,
        category: 'freshjuice',
        image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800',
        rating: 4.9,
        sizes: [
            { name: 'Medium', nameAr: 'وسط', nameHe: 'בינוני', price: 0, isDefault: true },
            { name: 'Large', nameAr: 'كبير', nameHe: 'גדול', price: 5, isDefault: false }
        ]
    },
    {
        name: 'Iced Spanish Latte',
        nameAr: 'سبانيش لاتي مثلج',
        nameHe: 'ספרדיש לאטה קר',
        description: 'Espresso with sweet condensed milk and ice.',
        descriptionAr: 'إسبريسو مع حليب مكثف محلى وثلج.',
        descriptionHe: 'אספרסו עם חלב מרוכז מתוק וקרח.',
        price: 24,
        category: 'icedcoffee',
        image: 'https://images.unsplash.com/photo-1517701604599-bb29b5c73311?w=800',
        rating: 4.8,
        flavors: [
            { name: 'Classic', nameAr: 'كلاسيك', nameHe: 'קלאסי' },
            { name: 'Rose', nameAr: 'ورد', nameHe: 'ורדים' },
            { name: 'Saffron', nameAr: 'زعفران', nameHe: 'זעפרן' }
        ],
        extras: [
            { name: 'Extra Shot', nameAr: 'إسبريسو إضافي', nameHe: 'תוספת אספרסו', price: 4, isDefault: false }
        ]
    },
    {
        name: 'Cappuccino',
        nameAr: 'كابتشينو',
        nameHe: 'קפוצ\'ינו',
        description: 'Espresso with steamed milk and thick foam.',
        descriptionAr: 'إسبريسو مع حليب مبخر ورغوة كثيفة.',
        descriptionHe: 'אספרסו עם חלב מוקצף וקצף סמיך.',
        price: 18,
        category: 'hotcoffee',
        image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800',
        rating: 4.7,
        sizes: [
            { name: 'Single', nameAr: 'سنجل', nameHe: 'יחיד', price: 0, isDefault: true },
            { name: 'Double', nameAr: 'دبل', nameHe: 'כפול', price: 4, isDefault: false }
        ],
        flavors: [
            { name: 'Vanilla Sugar', nameAr: 'سكر فانيليا', nameHe: 'סוכר וניל' },
            { name: 'Caramel', nameAr: 'كراميل', nameHe: 'קרמל' }
        ],
        extras: []
    },
    {
        name: 'Brown Sugar Bubble Tea',
        nameAr: 'شاي فقاعات براون شوجر',
        nameHe: 'באבל תיי סוכר חום',
        description: 'Milk tea with brown sugar syrup and tapioca pearls.',
        descriptionAr: 'شاي بالحليب مع شراب السكر البني وحبيبات التابيوكا.',
        descriptionHe: 'תה חלב עם סירופ סוכר חום ופניני טפיוקה.',
        price: 25,
        category: 'bubbletea',
        image: 'https://images.unsplash.com/photo-1558857563-b3710332e5f8?w=800',
        rating: 4.9,
        extras: [
            { name: 'Extra Tapioca', nameAr: 'تابيوكا إضافية', nameHe: 'תוספת טפיוקה', price: 3, isDefault: false },
            { name: 'Pudding', nameAr: 'بودنج', nameHe: 'פודינג', price: 4, isDefault: false }
        ]
    },
    {
        name: 'Classic Acai Bowl',
        nameAr: 'طبق أساي كلاسيك',
        nameHe: 'קערת אסאי קלאסית',
        description: 'Acai base topped with banana, granola, and honey.',
        descriptionAr: 'قاعدة أساي مغطاة بالموز والجرانولا والعسل.',
        descriptionHe: 'בסיס אסאי מכוסה בבננה, גרנולה ודבש.',
        price: 35,
        category: 'acaibowls',
        image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
        rating: 4.8,
        extras: [
            { name: 'Peanut Butter', nameAr: 'زبدة الفول السوداني', nameHe: 'חמאת בוטנים', price: 3, isDefault: false },
            { name: 'Protein Powder', nameAr: 'مسحوق بروتين', nameHe: 'אבקת חלבון', price: 5, isDefault: false }
        ]
    },
    {
        name: 'Exotic Fruit Salad',
        nameAr: 'سلطة فواكه استوائية',
        nameHe: 'סלט פירות אקזוטי',
        description: 'Mix of kiwi, mango, pineapple, and berries.',
        descriptionAr: 'خليط من الكيوي والمانجو والأناناس والموز.',
        descriptionHe: 'תערובת של קיווי, מנגו, אננס ופירות יער.',
        price: 22,
        category: 'fruitsalad',
        image: 'https://images.unsplash.com/photo-1519996521430-02b798c1d85f?w=800',
        rating: 4.7
    },
    {
        name: 'Strawberry Yogurt Parfait',
        nameAr: 'بارفيه زبادي وفراولة',
        nameHe: 'פרפה יוגורט ותות',
        description: 'Layers of yogurt, granola, and fresh strawberry sauce.',
        descriptionAr: 'طبقات من الزبادي والجرانولا وصوص الفراولة الطازج.',
        descriptionHe: 'שכבות של יוגורט, גרנולה ורוטב תות טרי.',
        price: 20,
        category: 'parfaits',
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
        rating: 4.6
    },
    {
        name: 'Choco Chip Cookie',
        nameAr: 'كوكيز رقائق الشوكولاتة',
        nameHe: 'עוגיית שוקולד צ\'יפס',
        description: 'Large, chewy cookie loaded with chocolate chips.',
        descriptionAr: 'كوكيز كبيرة وطرية مليئة برقائق الشوكولاتة.',
        descriptionHe: 'עוגייה גדולה ורכה עמוסה בשוקולד צ\'יפס.',
        price: 10,
        category: 'cookies',
        image: 'https://images.unsplash.com/photo-1499636138143-bd649043ea52?w=800',
        rating: 4.9
    },
    {
        name: 'Triple Chocolate Brownie',
        nameAr: 'براوني تريبل شوكليت',
        nameHe: 'בראוניז טריפל שוקולד',
        description: 'Fudgy brownie with white, milk, and dark chocolate chunks.',
        descriptionAr: 'براوني غني بقطع الشوكولاتة البيضاء وبالحليب والداكنة.',
        descriptionHe: 'בראוני פאדג\'י עם שברי שוקולד לבן, חלב ומריר.',
        price: 12,
        category: 'brownies',
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800',
        rating: 4.9
    }
];

const MOCK_BANNERS = [
    {
        title: 'Discount 20% on Crepes',
        titleAr: 'خصم 20% على كل الكريب',
        titleHe: '20% הנחה על כל הקרפים',
        subtitle: 'Limited Time Offer - Enjoy our French Crepes',
        subtitleAr: 'لفترة محدودة - استمتع بأشهى أنواع الكريب الفرنسي',
        subtitleHe: 'לזמן מוגבל - תיהנו מהקרפים הצרפתיים הטעימים ביותר',
        badge: 'Exclusive',
        image: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=1200'
    },
    {
        title: 'New Summer Flavors',
        titleAr: 'نكهات صيفية جديدة',
        titleHe: 'טעמי קיץ חדשים',
        subtitle: 'Try our refreshing Mango & Passion Fruit',
        subtitleAr: 'جرب آيس كريم المانجو والباشن فروت المنعش',
        subtitleHe: 'נסו את גלידת המנגו והפסיפלורה המרעננת',
        badge: 'New',
        image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=1200'
    }
];

export const seedDatabase = async () => {
    try {
        console.log("Starting Seeding Process...");

        // 1. Seed Categories
        console.log("Seeding Categories...");
        for (const cat of MOCK_CATEGORIES) {
            await addDoc(collection(db, 'categories'), cat);
        }

        // 2. Seed Banners
        console.log("Seeding Banners...");
        for (const banner of MOCK_BANNERS) {
            await addDoc(collection(db, 'banner'), banner);
        }

        // 3. Seed Products
        console.log("Seeding Products...");
        for (const prod of MOCK_PRODUCTS) {
            await addDoc(collection(db, 'products'), prod);
        }

        console.log("Seeding Completed Successfully!");
        return true;
    } catch (error) {
        console.error("Seeding Error:", error);
        throw error;
    }
};

export const clearDatabase = async () => {
    try {
        console.log("Clearing Database...");
        const collections = ['categories', 'products', 'banner'];

        for (const collName of collections) {
            const querySnapshot = await getDocs(collection(db, collName));
            const deletePromises = querySnapshot.docs.map(docSnapshot =>
                deleteDoc(doc(db, collName, docSnapshot.id))
            );
            await Promise.all(deletePromises);
            console.log(`Cleared ${collName}`);
        }
        return true;
    } catch (error) {
        console.error("Clear Database Error:", error);
        throw error;
    }
};
