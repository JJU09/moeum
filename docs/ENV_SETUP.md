# 환경 설정 가이드 (ENV_SETUP)

이 문서는 모음(Moeum) 프로젝트를 로컬에서 실행하고 배포하기 위한 환경변수 및 Firebase 설정 방법을 안내합니다.

## 1. 환경변수 설정 파일

### 앱 클라이언트 (`.env.local`)
프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 아래 항목들을 기입해야 합니다. (`.env.example` 파일 참고)

* **EXPO_PUBLIC_API_URL**: 외부 API 통신이 필요한 경우 사용할 기본 URL (현재 Firebase를 직접 호출하므로 필수가 아닐 수 있음)
* **EXPO_PUBLIC_FIREBASE_API_KEY**: Firebase 웹 API 키
* **EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN**: Firebase 인증 도메인 (`[PROJECT_ID].firebaseapp.com`)
* **EXPO_PUBLIC_FIREBASE_PROJECT_ID**: Firebase 프로젝트 ID
* **EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET**: Firebase Storage 버킷 주소 (`[PROJECT_ID].firebasestorage.app`)
* **EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**: Firebase Cloud Messaging(FCM) 발신자 ID
* **EXPO_PUBLIC_FIREBASE_APP_ID**: Firebase 앱 ID (웹 앱 기준)
* **EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID**: (선택) Firebase 애널리틱스 측정 ID

> **주의**: `EXPO_PUBLIC_` 접두사가 붙은 환경변수만 클라이언트 단(앱 내)에서 접근 가능합니다.

### Cloud Functions (`functions/.env`)
백엔드 로직이 수행되는 `functions` 폴더 내에 `.env` 파일을 생성해야 합니다.

* **FIREBASE_PROJECT_ID**: 배포할 Firebase 프로젝트 ID
* **TZ**: `Asia/Seoul` (Cloud Functions의 기본 시간대를 한국 기준으로 설정하여 자정 갱신 로직 등이 정확히 동작하게 함)
* 그 외 외부 서비스 API 키 (추가 연동 시 사용)

---

## 2. Firebase 콘솔 설정 가이드

앱이 정상적으로 동작하기 위해서는 [Firebase Console](https://console.firebase.google.com/)에서 다음 설정들이 선행되어야 합니다.

### 1) 프로젝트 생성
- 새 프로젝트를 생성하고, 애널리틱스 사용 여부를 선택합니다.

### 2) Authentication (인증)
- 빌드 탭 > Authentication 메뉴 이동
- **시작하기** 클릭
- 'Sign-in method'에서 **이메일/비밀번호** 제공업체를 활성화합니다.

### 3) Firestore Database
- 빌드 탭 > Firestore Database 메뉴 이동
- **데이터베이스 만들기** 클릭
- 시작 모드는 테스트 모드(Test mode) 또는 프로덕션 모드(Production mode) 중 선택 후 지역(예: `asia-northeast3` 서울) 설정
- 앱 실행 후 `DATABASE.md`에 명시된 규칙(Rules)과 인덱스(Indexes)를 설정해야 합니다.

### 4) Storage (선택)
- 프로필 이미지 등을 저장하려면 Storage를 활성화합니다.
- 빌드 탭 > Storage 메뉴에서 시작하기 클릭 및 기본 버킷 생성.

### 5) 앱 추가 및 설정
- 프로젝트 개요 페이지에서 **웹(Web)**, **Android**, **iOS** 앱을 각각 추가합니다.
- Android 및 iOS 앱 추가 시 패키지명(Bundle ID)은 `app.config.js` 또는 `app.json`에 정의된 것과 일치해야 합니다. (예: `com.yourcompany.moeum`)

---

## 3. 네이티브 설정 파일 연동

React Native Firebase 패키지가 네이티브 환경(Android/iOS)에서 정상 동작하기 위해 설정 파일이 필요합니다.

### Android: `google-services.json`
1. Firebase 콘솔의 Android 앱 설정 페이지에서 `google-services.json` 파일을 다운로드합니다.
2. 프로젝트의 최상위 루트 디렉토리(또는 `app.config.js`에 설정된 경로)에 파일을 위치시킵니다.
3. EAS Build 시 해당 파일을 참조하여 빌드됩니다.

### iOS: `GoogleService-Info.plist`
1. Firebase 콘솔의 iOS 앱 설정 페이지에서 `GoogleService-Info.plist` 파일을 다운로드합니다.
2. 프로젝트의 최상위 루트 디렉토리에 파일을 위치시킵니다.
3. `app.config.js` (또는 `app.json`)에 파일 경로가 정상적으로 맵핑되어 있는지 확인합니다.

> **보안 주의사항**: `.env.local`, `google-services.json`, `GoogleService-Info.plist` 파일은 민감한 키 값을 포함하므로 반드시 `.gitignore`에 포함되어 Git 레포지토리에 커밋되지 않도록 해야 합니다.