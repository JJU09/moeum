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
          
          if (!userDoc.exists()) {
            // 새 로그인: 사용자 문서가 없으면 기본값으로 생성
            await setDoc(userDocRef, {
              email: currentUser.email || '',
              nickname: currentUser.displayName || '이름 없음',
              profileImage: currentUser.photoURL || '',
              createdAt: new Date().toISOString()
            });
            // 생성 직후엔 프로필이 완성된 상태로 간주하거나,
            // 닉네임 등을 입력받는 profile-setup 화면으로 보내려면 false로 둡니다.
            // 여기서는 MVP 정책에 따라 문서가 있으면 true (혹은 false)로 결정
            // (isProfileComplete는 profile-setup 완료 여부를 나타내므로 false가 맞을 수도 있음)
            // 지시사항에 따라: "문서 생성 후 isProfileComplete 체크"
            setIsProfileComplete(true);
          } else {
            setIsProfileComplete(true);
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