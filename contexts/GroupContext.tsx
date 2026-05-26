import React, { createContext, useContext, useState, useEffect } from 'react';
import { Group, subscribeToMyGroups } from '../lib/group';
import { useAuth } from './AuthContext';

interface GroupContextType {
  groups: Group[];
  selectedGroup: Group | null;
  setSelectedGroupId: (id: string | null) => void;
  loadingGroups: boolean;
}

const GroupContext = createContext<GroupContextType>({
  groups: [],
  selectedGroup: null,
  setSelectedGroupId: () => {},
  loadingGroups: true,
});

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setSelectedGroupId(null);
      setLoadingGroups(false);
      return;
    }

    const unsubscribe = subscribeToMyGroups(user.uid, (fetchedGroups) => {
      setGroups(fetchedGroups);
      
      if (fetchedGroups.length > 0) {
        // 기존 선택된 그룹이 없거나, 새 목록에 선택된 그룹이 없는 경우 (방출, 삭제 등)
        setSelectedGroupId((prevId) => {
          if (!prevId || !fetchedGroups.find((g) => g.id === prevId)) {
            return fetchedGroups[0].id;
          }
          return prevId;
        });
      } else {
        setSelectedGroupId(null);
      }
      setLoadingGroups(false);
    });

    return () => unsubscribe();
  }, [user]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  return (
    <GroupContext.Provider value={{ groups, selectedGroup, setSelectedGroupId, loadingGroups }}>
      {children}
    </GroupContext.Provider>
  );
}

export const useGroups = () => useContext(GroupContext);