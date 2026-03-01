import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useWebStoreData = () => {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [extras, setExtras] = useState([]);
    const [extraGroups, setExtraGroups] = useState([]);
    const [storeInfo, setStoreInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                // Fetch Categories
                console.log("Fetching Categories...");
                const catsQuery = query(
                    collection(db, 'categories'),
                    orderBy('order', 'asc')
                );
                const catsSnapshot = await getDocs(catsQuery);
                const fetchedCats = catsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log(`Fetched ${fetchedCats.length} Categories`);

                // Fetch Products
                console.log("Fetching Products...");
                const prodsQuery = query(
                    collection(db, 'products'),
                    where('isDeleted', '==', false)
                );
                const prodsSnapshot = await getDocs(prodsQuery);
                const fetchedProds = prodsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log(`Fetched ${fetchedProds.length} Products`);

                // Fetch Extras
                const extrasQuery = query(collection(db, 'extras'));
                const extrasSnapshot = await getDocs(extrasQuery);
                const fetchedExtras = extrasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Fetch Extra Groups
                const extraGroupsQuery = query(collection(db, 'extraGroups'));
                const extraGroupsSnapshot = await getDocs(extraGroupsQuery);
                const fetchedExtraGroups = extraGroupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Fetch Store Info
                const storeDoc = await getDoc(doc(db, 'store', 'profile'));
                if (storeDoc.exists()) {
                    setStoreInfo(storeDoc.data());
                }

                setCategories(fetchedCats);
                setProducts(fetchedProds);
                setExtras(fetchedExtras);
                setExtraGroups(fetchedExtraGroups);
            } catch (error) {
                console.error("Error fetching web store data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    return { categories, products, extras, extraGroups, storeInfo, loading };
};
