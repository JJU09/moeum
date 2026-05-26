# 모음 (Moeum)

모음은 가족, 친구, 연인 등 소중한 사람들과 함께 일상을 공유하고 소통할 수 있는 그룹 기반의 질문/답변 플랫폼입니다. 매일 제공되는 질문에 답변하며 서로에 대해 더 깊이 알아갈 수 있습니다.

## 🛠 기술 스택

- **프레임워크**: Expo (v56.0.0), React Native
- **언어**: TypeScript
- **백엔드/데이터베이스**: Firebase (Authentication, Firestore, Cloud Functions, Cloud Messaging)
- **상태 관리/라우팅**: Expo Router
- **주요 라이브러리**: `@react-native-firebase/*`, `date-fns`, `react-native-calendars`

## 🚀 시작하기

### 사전 요구사항
- Node.js 설치 (v18 이상 권장)
- npm 또는 yarn 패키지 매니저
- Expo CLI (`npm install -g expo-cli`)
- Firebase 프로젝트 생성 및 설정 (자세한 내용은 `docs/ENV_SETUP.md` 참고)

### 설치 및 실행

1. 레포지토리를 클론합니다.
   ```bash
   git clone https://github.com/JJU09/moeum.git
   cd moeum
   ```

2. 패키지를 설치합니다.
   ```bash
   npm install
   ```

3. 환경변수를 설정합니다. (`.env.example`을 복사하여 `.env.local` 생성)
   ```bash
   cp .env.example .env.local
   ```
   > 환경변수 상세 설정 방법은 `docs/ENV_SETUP.md`를 확인하세요.

4. 앱을 실행합니다.
   ```bash
   npm start
   # 또는
   npm run ios
   npm run android
   ```

## 📁 프로젝트 구조

```
moeum/
├── app/                  # Expo Router 기반의 화면(Screen) 컴포넌트
│   ├── (auth)/           # 인증 관련 화면 (로그인, 회원가입, 프로필 설정 등)
│   ├── (tabs)/           # 메인 탭 화면 (홈, 그룹, 내 정보, 기록 등)
│   ├── archive/          # 아카이브 관련 화면
│   ├── notices/          # 공지사항 관련 화면
│   └── support/          # 고객지원 관련 화면
├── components/           # 재사용 가능한 UI 컴포넌트
├── constants/            # 테마, 색상 등 상수 정의
├── contexts/             # React Context API (AuthContext, GroupContext 등)
├── docs/                 # 프로젝트 문서
├── functions/            # Firebase Cloud Functions 코드
├── hooks/                # Custom React Hooks
├── lib/                  # 비즈니스 로직 및 Firebase 서비스 연동 유틸리티
├── types/                # TypeScript 타입 정의
└── assets/               # 이미지, 폰트 등 정적 리소스
```

## ⚙️ 환경변수 설정 방법

앱 실행 및 배포를 위해 루트 디렉토리의 `.env.local`과 Cloud Functions를 위한 `functions/.env` 설정이 필요합니다. 
상세한 환경변수 설정 가이드와 Firebase 연동 방법은 [ENV_SETUP.md](./docs/ENV_SETUP.md) 문서를 참고해 주세요.

## 📦 배포 방법

### 1. 앱 배포 (EAS Build)
Expo Application Services (EAS)를 사용하여 빌드합니다.

```bash
# EAS CLI 설치 및 로그인
npm install -g eas-cli
eas login

# 프로젝트 설정 (최초 1회)
eas build:configure

# Android 빌드
eas build --platform android --profile production

# iOS 빌드
eas build --platform ios --profile production
```

### 2. Cloud Functions 배포
Firebase Cloud Functions를 배포합니다.

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

---

*자세한 기능 설명은 [FEATURES.md](./docs/FEATURES.md)를, 데이터베이스 구조는 [DATABASE.md](./docs/DATABASE.md)를 참고하세요.*