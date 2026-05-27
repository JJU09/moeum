import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isProfileComplete: boolean;
  completeProfile: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isProfileComplete: false,
  completeProfile: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            // 닉네임이 있고 '이름 없음'이 아니어야 완료된 것으로 간주
            const hasNickname = data.nickname && data.nickname !== '이름 없음';
            setIsProfileComplete(!!hasNickname);
          } else {
            // 문서가 없으면 새로 생성 (Google 로그인 등의 경우)
            // 닉네임이 없으므로 false로 설정하여 profile-setup으로 유도
            await setDoc(userDocRef, {
              email: currentUser.email || '',
              nickname: '', // 닉네임을 비워두어 profile-setup으로 보내도록 함
              profileImage: currentUser.photoURL || '',
              createdAt: new Date().toISOString()
            });
            setIsProfileComplete(false);
          }
        } catch (error) {
          console.error("Error checking user profile:", error);
          setIsProfileComplete(false);
        }
      } else {
        setIsProfileComplete(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const completeProfile = () => {
    setIsProfileComplete(true);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isProfileComplete, completeProfile }}>
      {children}
    </AuthContext.Provider>
  );
};