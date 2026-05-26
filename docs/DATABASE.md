# 데이터베이스 스키마 및 규칙 (DATABASE)

모음(Moeum) 프로젝트는 NoSQL 클라우드 데이터베이스인 Firebase Firestore를 사용합니다. 이 문서는 컬렉션 구조, 필드 정보, 보안 규칙, 인덱스 설정을 정의합니다.

## 1. 컬렉션 구조 및 필드 명세

### 1) `users` 컬렉션
사용자 기본 정보를 저장합니다. (Document ID: Firebase Auth UID)

| 필드명 | 타입 | 설명 |
|---|---|---|
| `email` | string | 사용자 이메일 |
| `displayName` | string | 사용자 닉네임 |
| `photoURL` | string (url) | 프로필 이미지 URL (선택) |
| `createdAt` | timestamp | 가입 일시 |
| `groupIds` | array(string) | 소속된 그룹의 ID 목록 |
| `fcmToken` | string | 푸시 알림 수신용 FCM 토큰 (선택) |

### 2) `groups` 컬렉션
사용자들이 모이는 그룹 정보를 저장합니다. (Document ID: 자동 생성)

| 필드명 | 타입 | 설명 |
|---|---|---|
| `name` | string | 그룹명 |
| `inviteCode` | string | 그룹 초대 코드 (유니크 6자리 영숫자 등) |
| `memberIds` | array(string) | 그룹에 속한 사용자 UID 목록 |
| `createdAt` | timestamp | 생성 일시 |
| `createdBy` | string | 생성자 UID |

### 3) `questions` 컬렉션
매일 제공되는 "오늘의 질문" 데이터를 저장합니다. (Document ID: YYYY-MM-DD 형식 권장 또는 자동 생성)

| 필드명 | 타입 | 설명 |
|---|---|---|
| `content` | string | 질문 내용 |
| `date` | string | 질문이 제공되는 날짜 (예: "2023-10-25") |
| `createdAt` | timestamp | 생성 일시 |
| `isActive` | boolean | 현재 활성화 여부 |

### 4) `answers` 컬렉션
사용자들이 질문에 대해 작성한 답변을 저장합니다. (Document ID: 자동 생성)

| 필드명 | 타입 | 설명 |
|---|---|---|
| `questionId` | string | 참조하는 질문 ID (`questions` 컬렉션) |
| `groupId` | string | 답변이 작성된 그룹 ID |
| `userId` | string | 작성자 UID |
| `content` | string | 답변 내용 |
| `createdAt` | timestamp | 작성 일시 |
| `updatedAt` | timestamp | 수정 일시 |
| `date` | string | 답변이 작성된 날짜 (쿼리 최적화 용도) |

### 5) `comments` 컬렉션 (추후 고도화 예정)
답변에 달린 댓글/반응을 저장합니다. (Document ID: 자동 생성)

| 필드명 | 타입 | 설명 |
|---|---|---|
| `answerId` | string | 참조하는 답변 ID |
| `userId` | string | 댓글 작성자 UID |
| `content` | string | 댓글 내용 |
| `createdAt` | timestamp | 작성 일시 |

### 6) `notices` 컬렉션
앱 내 공지사항을 저장합니다. (관리자 전용 쓰기)

| 필드명 | 타입 | 설명 |
|---|---|---|
| `title` | string | 공지사항 제목 |
| `content` | string | 내용 |
| `createdAt` | timestamp | 작성 일시 |
| `isImportant` | boolean | 중요 공지 여부 |

### 7) `inquiries` 컬렉션
사용자의 고객지원/문의 내역을 저장합니다.

| 필드명 | 타입 | 설명 |
|---|---|---|
| `userId` | string | 문의자 UID |
| `title` | string | 문의 제목 |
| `content` | string | 문의 내용 |
| `status` | string | 처리 상태 (예: 'pending', 'resolved') |
| `createdAt` | timestamp | 작성 일시 |

---

## 2. Firestore 보안 규칙 (Security Rules)

데이터베이스 접근을 제어하기 위해 Firebase Console에 아래 규칙을 적용해야 합니다. (`firestore.rules` 파일 참고)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 로그인한 사용자만 접근 가능
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // 자신의 데이터인지 확인
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    match /users/{userId} {
      // 읽기: 누구나 가능 (프로필 조회를 위해) 또는 로그인한 사용자만
      allow read: if isAuthenticated();
      // 쓰기: 본인만 가능
      allow write: if isAuthenticated() && isOwner(userId);
    }

    match /groups/{groupId} {
      allow create: if isAuthenticated();
      // 멤버이거나 초대를 통해 참여하는 경우 업데이트 허용
      allow read, update: if isAuthenticated();
    }

    match /questions/{questionId} {
      allow read: if isAuthenticated();
      allow write: if false; // Cloud Functions 또는 관리자만 쓰기 가능
    }

    match /answers/{answerId} {
      // 답변 읽기는 소속된 그룹 멤버인지 검증 로직이 추가되면 좋음
      allow read: if isAuthenticated();
      // 답변 생성 및 수정은 작성자 본인만
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isAuthenticated() && isOwner(resource.data.userId);
    }
    
    // 기타 컬렉션 규칙...
  }
}
```

---

## 3. 인덱스 (Indexes) 설정

복합 쿼리를 위해 Firestore Console에서 수동으로 인덱스를 생성해야 할 수 있습니다.

**필요한 복합 인덱스 (Composite Indexes)**

1. `answers` 컬렉션
   - 조회 조건: 특정 날짜(`date`)의 특정 그룹(`groupId`) 답변 목록
   - 설정: `groupId` (Ascending) + `date` (Ascending) + `createdAt` (Descending)

2. `answers` 컬렉션
   - 조회 조건: 특정 질문(`questionId`)에 대한 그룹(`groupId`)별 답변 목록
   - 설정: `groupId` (Ascending) + `questionId` (Ascending)

*(참고: 콘솔에서 쿼리 실행 시 에러 메시지로 제공되는 링크를 클릭하면 자동으로 인덱스 생성 화면으로 이동됩니다.)*