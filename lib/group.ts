import { db } from './firebase';
import { UserProfile } from '../types';
import { 
import { logError } from '../lib/logger';
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  runTransaction,
  limit,
  onSnapshot,
  writeBatch
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
    logError('runTransaction failed:', error);
    throw error;
  }
};

export const updateGroupName = async (groupId: string, newName: string): Promise<void> => {
  const groupRef = doc(db, 'groups', groupId);
  await setDoc(groupRef, { name: newName }, { merge: true });
};

export const regenerateInviteCode = async (groupId: string): Promise<string> => {
  const groupRef = doc(db, 'groups', groupId);
  const newCode = await getUniqueInviteCode();
  await setDoc(groupRef, { inviteCode: newCode }, { merge: true });
  return newCode;
};

export const deleteGroup = async (groupId: string): Promise<void> => {
  const groupRef = doc(db, 'groups', groupId);
  const membersRef = collection(db, `groups/${groupId}/members`);
  const membersSnapshot = await getDocs(membersRef);
  
  const batch = writeBatch(db);
  membersSnapshot.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  batch.delete(groupRef);
  await batch.commit();
};

export const leaveGroup = async (groupId: string, userId: string): Promise<void> => {
  const groupRef = doc(db, 'groups', groupId);
  
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) {
    throw new Error('그룹이 존재하지 않습니다.');
  }
  
  const data = groupSnap.data();
  if (data.createdBy === userId) {
    await deleteGroup(groupId);
    return;
  }

  const memberRef = doc(db, `groups/${groupId}/members`, userId);

  await runTransaction(db, async (transaction) => {
    const docSnapshot = await transaction.get(groupRef);
    if (!docSnapshot.exists()) {
      throw new Error('그룹이 존재하지 않습니다.');
    }

    const currentData = docSnapshot.data();
    const memberCount = currentData.memberCount || 0;
    const memberIds = currentData.memberIds || [];

    if (!memberIds.includes(userId)) {
      throw new Error('그룹 멤버가 아닙니다.');
    }

    transaction.update(groupRef, {
      memberCount: Math.max(0, memberCount - 1),
      memberIds: memberIds.filter((id: string) => id !== userId)
    });

    transaction.delete(memberRef);
  });
};

export const getGroupMembers = async (groupId: string): Promise<UserProfile[]> => {
  // 1. 그룹 정보 가져오기 (createdBy를 알기 위해)
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  
  if (!groupSnap.exists()) {
    throw new Error('그룹을 찾을 수 없습니다.');
  }
  const createdBy = groupSnap.data().createdBy;

  // 2. 멤버 목록 가져오기
  const membersRef = collection(db, `groups/${groupId}/members`);
  const snapshot = await getDocs(membersRef);
  const userIds = snapshot.docs.map(docSnap => docSnap.id);
  
  if (userIds.length === 0) return [];
  
  const members: UserProfile[] = [];
  
  await Promise.all(userIds.map(async (uid) => {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      members.push({ id: userSnap.id, ...userSnap.data() } as UserProfile);
    }
  }));
  
  // 3. 정렬: 방장이 맨 위, 나머지는 다국어 닉네임 정렬 기준 적용
  members.sort((a, b) => {
    if (a.id === createdBy) return -1;
    if (b.id === createdBy) return 1;
    
    // 닉네임이 없을 경우를 대비한 안전한 처리
    const nameA = a.nickname || '';
    const nameB = b.nickname || '';
    return nameA.localeCompare(nameB, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });
  
  return members;
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