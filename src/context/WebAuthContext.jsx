import React, { createContext, useContext, useState, useEffect } from 'react';
import { webAuth, webDb as db, webFunctions as functions } from '../firebase/config';
import { onAuthStateChanged, signOut, signInWithCustomToken, updateProfile } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const WebAuthContext = createContext();

export const useWebAuth = () => useContext(WebAuthContext);

export const WebAuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isOtpSuccess, setIsOtpSuccess] = useState(false); // Used to trigger post-login actions

    useEffect(() => {
        console.log("WebAuthContext: Initializing onAuthStateChanged for webAuth");
        const unsubscribe = onAuthStateChanged(webAuth, async (user) => {
            console.log("WebAuthContext: State Changed", { hasUser: !!user, uid: user?.uid });
            setCurrentUser(user);
            if (user) {
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        console.log("WebAuthContext: User Data Loaded", userDocSnap.data());
                        setUserData(userDocSnap.data());
                    } else {
                        console.warn("WebAuthContext: User Data Not Found in Firestore");
                    }
                } catch (error) {
                    console.error("WebAuthContext: Error fetching user data:", error);
                }
            } else {
                setUserData(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const openLogin = () => setIsLoginModalOpen(true);
    const closeLogin = () => setIsLoginModalOpen(false);

    const logout = async () => {
        await signOut(webAuth);
    };

    const requestOTP = async (phone) => {
        const requestOTPFn = httpsCallable(functions, 'requestOTP');
        await requestOTPFn({ phone });
    };

    const verifyOTP = async (phone, code) => {
        const verifyOTPFn = httpsCallable(functions, 'verifyOTP');
        const result = await verifyOTPFn({ phone, code });

        if (result.data.success && result.data.token) {
            const userCredential = await signInWithCustomToken(webAuth, result.data.token);

            // Same logic as mobile to sync phone number to Firestore
            const userRef = doc(db, 'users', userCredential.user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                await updateDoc(userRef, {
                    phoneNumber: phone,
                    updatedAt: new Date(),
                });
            } else {
                await setDoc(userRef, {
                    phoneNumber: phone,
                    points: 0,
                    membershipLevel: 'Bronze',
                    createdAt: new Date(),
                });
            }
            return userCredential;
        } else {
            throw new Error(result.data.message || 'Verification failed');
        }
    };

    const updateUserProfileLocation = async (lat, lng, cityId) => {
        if (!currentUser) return;
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const updates = {
                updatedAt: new Date()
            };
            if (lat !== undefined) updates.latitude = lat;
            if (lng !== undefined) updates.longitude = lng;
            if (cityId !== undefined) updates.city = cityId;

            await updateDoc(userRef, updates);
            await refreshUserData();
        } catch (err) {
            console.error("Error updating profile location:", err);
        }
    };

    const refreshUserData = async () => {
        if (currentUser) {
            try {
                const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDocSnap.exists()) {
                    setUserData(userDocSnap.data());
                }
            } catch (error) {
                console.error("Error refreshing user data:", error);
            }
        }
    };

    const updateUserProfile = async (data) => {
        if (!currentUser) return;
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const updates = {
                ...data,
                updatedAt: new Date()
            };
            await updateDoc(userRef, updates);
            await refreshUserData();
        } catch (err) {
            console.error("Error updating profile:", err);
            throw err;
        }
    };

    return (
        <WebAuthContext.Provider value={{
            currentUser,
            userData,
            loading,
            isLoginModalOpen,
            openLogin,
            closeLogin,
            logout,
            refreshUserData,
            requestOTP,
            verifyOTP,
            updateUserProfile,
            updateUserProfileLocation,
            isOtpSuccess,
            setIsOtpSuccess
        }}>
            {children}
        </WebAuthContext.Provider>
    );
};
