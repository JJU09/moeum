# 구현 기능 명세 (FEATURES)

이 문서는 모음(Moeum) 앱의 전체 기능 목록과 해당 기능이 구현된 화면 및 파일 위치, 그리고 추후 개발 예정인 기능들을 정리합니다.

## ✅ 구현된 기능 목록 및 파일 위치

### 1. 인증 및 사용자 관리 (Authentication)
사용자 가입, 로그인 및 프로필을 관리합니다.

* **기능 목록**:
  - 이메일 기반 회원가입 및 로그인
  - 사용자 프로필 설정 (닉네임, 프로필 이미지)
  - 자동 로그인 및 세션 관리
* **관련 화면 및 파일**:
  - `app/(auth)/_layout.tsx`: 인증 플로우 라우팅
  - `app/(auth)/login.tsx`: 로그인 화면
  - `app/(auth)/email-login.tsx`: 이메일 로그인 화면
  - `app/(auth)/sign-up.tsx`: 회원가입 화면
  - `app/(auth)/profile-setup.tsx`: 프로필 설정 화면
  - `contexts/AuthContext.tsx`: 인증 상태 전역 관리

### 2. 그룹 관리 (Group Management)
사용자들이 모여 질문을 공유할 수 있는 그룹(가족, 연인, 친구 등)을 관리합니다.

* **기능 목록**:
  - 그룹 생성 및 초대 코드 발급
  - 초대 코드를 통한 그룹 참여
  - 현재 소속된 그룹 정보 및 멤버 목록 조회
* **관련 화면 및 파일**:
  - `app/(tabs)/group.tsx`: 그룹 메인 화면
  - `components/GroupCard.tsx`: 그룹 정보 표시 카드 컴포넌트
  - `contexts/GroupContext.tsx`: 현재 선택된 그룹 상태 관리
  - `lib/group.ts`: 그룹 관련 비즈니스 로직 (Firestore 연동)

### 3. 오늘의 질문 및 답변 (Daily Question & Answers)
매일 새로운 질문이 제공되고, 멤버들이 답변을 작성하고 공유합니다.

* **기능 목록**:
  - 오늘의 질문 조회 (자정 기준 업데이트)
  - 내 답변 작성 및 수정
  - 그룹 멤버들의 답변 피드(목록) 조회
* **관련 화면 및 파일**:
  - `app/(tabs)/index.tsx`: 홈 화면 (질문 및 답변 피드 표시)
  - `components/QuestionCard.tsx`: 질문 표시 컴포넌트
  - `components/AnswerInput.tsx`: 답변 작성/입력 폼 컴포넌트
  - `components/AnswerFeed.tsx`: 멤버들의 답변 목록 표시 컴포넌트
  - `hooks/useTodayQuestion.ts`, `hooks/useTodayAnswers.ts`: 데이터 패칭 훅
  - `lib/question.ts`, `lib/answer.ts`: Firestore 연동 로직

### 4. 아카이브 (Archive)
지난 날짜의 질문과 멤버들의 답변 기록을 모아봅니다.

* **기능 목록**:
  - 캘린더 UI를 통한 과거 날짜 선택
  - 선택한 날짜의 질문 및 전체 답변 상세 조회
* **관련 화면 및 파일**:
  - `app/(tabs)/history.tsx`: 아카이브 캘린더 화면
  - `app/archive/[date].tsx`: 특정 날짜의 상세 기록 화면
  - `hooks/useArchive.ts`, `hooks/useQuestionByDate.ts`: 기록 조회 훅
  - `lib/archive.ts`: 아카이브 비즈니스 로직

### 5. 마이페이지 및 기타 (My Page & Settings)
사용자 설정, 공지사항, 고객지원 기능을 제공합니다.

* **기능 목록**:
  - 내 프로필 정보 확인 및 로그아웃
  - 공지사항 목록 및 상세 조회
  - 고객지원/문의하기 기능
* **관련 화면 및 파일**:
  - `app/(tabs)/my.tsx`: 마이페이지 메인 화면
  - `app/notices/index.tsx`, `app/notices/[id].tsx`: 공지사항 화면
  - `app/support/index.tsx`: 고객지원 화면

---

## 🚀 미구현 및 추후 개발 예정 기능

현재 기획 및 준비 단계에 있으며 향후 업데이트를 통해 제공될 기능들입니다.

1. **소셜 로그인 연동**
   - 카카오톡, 구글, 애플 로그인을 통한 간편 인증 지원
2. **댓글 및 반응(리액션) 기능**
   - 데이터베이스(`comments` 컬렉션) 구조는 마련되어 있으나, UI 상호작용(좋아요, 이모지 반응 등) 고도화 필요
3. **푸시 알림 고도화**
   - 누군가 답변을 작성했을 때 알림
   - 매일 특정 시간에 "오늘의 질문" 리마인드 알림 설정
4. **미디어 첨부 기능**
   - 답변 작성 시 텍스트 외에 사진/이미지 첨부 지원
5. **앱 내 프리미엄 기능**
   - 과거 질문 무제한 열람, 커스텀 질문 만들기 기능 등