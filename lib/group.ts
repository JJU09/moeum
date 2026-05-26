import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  runTransaction,
  limit,
  onSnapshot
} from 'firebase/firestore';

export interface Group {
  id: string;
  name: string;
  thumbnailImage: string;
  inviteCode: string;
  createdBy: string;
  createdAt: any;
  memberCount: number;
  memberIds: string[];
}

const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getUniqueInviteCode = async (): Promise<string> => {
  let isUnique = false;
  let code = '';
  const groupsRef = collection(db, 'groups');

  while (!isUnique) {
    code = generateInviteCode();
    const q = query(groupsRef, where('inviteCode', '==', code), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      isUnique = true;
    }
  }

  return code;
};

export const createGroup = async (name: string, userId: string): Promise<string> => {
  const groupsRef = collection(db, 'groups');
  const newGroupRef = doc(groupsRef);
  const inviteCode = await getUniqueInviteCode();

  await setDoc(newGroupRef, {
    name,
    thumbnailImage: '', // 임시 이미지 처리
    inviteCode,
    createdBy: userId,
    createdAt: serverTimestamp(),
    memberCount: 1,
    memberIds: [userId]
  });

  const memberRef = doc(db, `groups/${newGroupRef.id}/members`, userId);
  await setDoc(memberRef, {
    joinedAt: serverTimestamp()
  });

  return newGroupRef.id;
};

export const joinGroupWithCode = async (code: string, userId: string): Promise<string | null> => {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('inviteCode', '==', code.toUpperCase()), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('유효하지 않은 초대 코드입니다.');
  }

  const groupDoc = snapshot.docs[0];
  const groupId = groupDoc.id;
  const groupRef = doc(db, 'groups', groupId);
  const memberRef = doc(db, `groups/${groupId}/members`, userId);

  try {
    await runTransaction(db, async (transaction) => {
      const docSnapshot = await transaction.get(groupRef);
      if (!docSnapshot.exists()) {
        throw new Error('그룹이 존재하지 않습니다.');
      }

      const data = docSnapshot.data();
      const memberCount = data.memberCount || 0;
      const memberIds = data.memberIds || [];

      if (memberIds.includes(userId)) {
        throw new Error('이미 참여한 그룹입니다.');
      }

      if (memberCount >= 50) {
        throw new Error('그룹 정원이 초과되었습니다. (최대 50명)');
      }

      transaction.update(groupRef, {
        memberCount: memberCount + 1,
        memberIds: [...memberIds, userId]
      });

      transaction.set(memberRef, {
        joinedAt: serverTimestamp()
      });
    });

    return groupId;
  } catch (error: any) {
    console.error('runTransaction failed:', error);
    throw error;
  }
};

export const subscribeToMyGroups = (userId: string, callback: (groups: Group[]) => void) => {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('memberIds', 'array-contains', userId));

  return onSnapshot(q, (snapshot) => {
    const groups: Group[] = [];
    snapshot.forEach((doc) => {
      groups.push({ id: doc.id, ...doc.data() } as Group);
    });
    // 최신 생성순 또는 적절한 정렬 필요시 프론트엔드에서 처리
    callback(groups);
  });
};