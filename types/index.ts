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

export interface Answer {
  id: string;
  questionId: string;
  groupId: string;
  userId: string;
  content: string;
  nickname?: string;
  profileImage?: string;
  reactions: {
    [emoji: string]: string[]; // userId 배열
  };
  createdAt: any; // Firestore Timestamp
  userProfile?: UserProfile; // 클라이언트에서 조인용
}
