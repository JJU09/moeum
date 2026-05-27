export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  profileImage?: string;
  statusMessage?: string;
  streakCount?: number;
  lastAnsweredDate?: string;
  badges?: string[];
}

export interface Question {
  id: string;
  text: string;
  date: string; // 'YYYY-MM-DD' 형식
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
