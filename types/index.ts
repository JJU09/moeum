export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  profileImage?: string;
  statusMessage?: string;
  streakCount?: number;
  lastAnsweredDate?: string;
  badges?: string[];
  points?: number;
  lastPointDate?: string;
  // 상점 아이템
  ownedItems?: string[];
  equippedBorder?: string;      // 프로필 아이콘 테두리 (avatar_border_*)
  equippedFeedBorder?: string;  // 피드 카드 테두리 (feed_border_*)
  equippedFeedBg?: string;      // 피드 카드 배경 (feed_bg_*)
  equippedNickEffect?: string;  // 닉네임 이펙트 (nick_*)
  equippedBg?: string;          // @deprecated 구 프로필 배경 — 미사용, 하위호환 유지
}

export interface Question {
  id: string;
  text: string;
  date: string; // 'YYYY-MM-DD' 형식
  isCustom?: boolean;
  winnerNickname?: string;
}

export interface Auction {
  participantCount: number;
  status: 'open' | 'processing' | 'closed';
  winningQuestion: string;
  winnerId: string;
  winnerNickname: string;
  createdAt: any; // Firestore Timestamp
}

export interface Bid {
  userId: string;
  questionText: string;
  bidPoints: number;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface Comment {
  id: string;
  answerId: string;
  userId: string;
  nickname: string;
  profileImage?: string;
  content: string;
  createdAt: any; // Firestore Timestamp
}

export interface Answer {
  id: string;
  questionId: string;
  groupId: string;
  userId: string;
  content: string;
  nickname?: string;
  profileImage?: string;
  streakCount?: number;
  equippedNickEffect?: string;   // baked at creation
  equippedBorder?: string;       // baked at creation (avatar border)
  equippedFeedBorder?: string;   // baked at creation (feed card border)
  equippedFeedBg?: string;       // baked at creation (feed card background)
  reactions: {
    "❤️": string[];
    "🥹": string[];
    "😂": string[];
    "👏": string[];
    [key: string]: string[]; // 향후 확장 가능성 또는 기존 데이터 호환성
  };
  createdAt: any; // Firestore Timestamp
  userProfile?: UserProfile; // 클라이언트에서 조인용
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: any; // Firestore Timestamp
  isPinned: boolean;
}
