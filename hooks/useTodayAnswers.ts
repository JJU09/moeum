import { useState, useEffect, useMemo } from 'react';
import { Answer, UserProfile } from '../types';
import { subscribeToAnswers } from '../lib/answer';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useTodayAnswers(
  groupId: string | null | undefined,
  questionId: string | null | undefined,
  userId: string | null | undefined
) {
  const [rawAnswers, setRawAnswers] = useState<Answer[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  // ── 1. 답변 실시간 구독 (프로필 조인 없이 원시 데이터만)
  useEffect(() => {
    if (!groupId || !questionId) {
      setRawAnswers([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const unsubscribe = subscribeToAnswers(groupId, questionId, (newAnswers) => {
      if (isMounted) {
        setRawAnswers(newAnswers);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [groupId, questionId]);

  // ── 2. 각 답변 작성자의 유저 문서를 실시간 구독
  // 상점에서 아이템을 장착하면 즉시 피드에 반영되도록 onSnapshot 사용
  // userIdsKey: 유저 집합이 바뀔 때만 재구독 (새 답변 작성 등)
  const userIdsKey = useMemo(
    () => [...new Set(rawAnswers.map(a => a.userId))].sort().join(','),
    [rawAnswers]
  );

  useEffect(() => {
    if (!userIdsKey) return;
    const uniqueUserIds = userIdsKey.split(',').filter(Boolean);
    if (uniqueUserIds.length === 0) return;

    const unsubscribes = uniqueUserIds.map(uid =>
      onSnapshot(doc(db, 'users', uid), (snap) => {
        if (snap.exists()) {
          setUserProfiles(prev => ({
            ...prev,
            [uid]: snap.data() as UserProfile,
          }));
        }
      })
    );

    return () => unsubscribes.forEach(u => u());
  }, [userIdsKey]);

  // ── 3. 원시 답변 + 실시간 유저 프로필 병합
  const answers = useMemo(
    () =>
      rawAnswers.map(answer => ({
        ...answer,
        userProfile: userProfiles[answer.userId]
          ? { ...(answer.userProfile ?? {}), ...userProfiles[answer.userId] }
          : answer.userProfile,
      })),
    [rawAnswers, userProfiles]
  );

  const hasAnswered = useMemo(
    () => !!userId && answers.some(a => a.userId === userId),
    [answers, userId]
  );

  return { answers, loading, hasAnswered };
}
