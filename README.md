# 모음 (Moeum)
<img src="assets/icon.png" width="128" height="128" alt="Moeum Logo" />

**"매일 하나의 질문으로 깊어지는 우리들의 기록, 모음"**

## 소개
모음(Moeum)은 매일 새롭게 주어지는 질문에 답하며 소중한 사람들과 생각을 나누는 프라이빗 커뮤니티 서비스입니다. 인공지능이 엄선한 질문을 통해 평소 나누지 못했던 깊은 이야기를 공유하고 서로를 더 잘 알아가는 시간을 가집니다.

- **매일 하나의 질문**: 매일 정해진 시간에 배달되는 특별한 질문에 답해 보세요.
- **프라이빗 그룹**: 초대 코드를 통해 연결된 신뢰할 수 있는 사람들끼리만 이야기를 나눕니다.

## 주요 기능
- **오늘의 질문 (AI 자동 생성)**: LiteLLM(AI)이 매일 사용자들에게 영감을 줄 수 있는 새로운 질문을 자동으로 생성합니다.
- **블라인드 룰**: 내가 먼저 답변을 작성해야만 다른 그룹원들의 피드가 공개됩니다. 솔직한 답변을 유도하는 모음만의 규칙입니다.
- **그룹 시스템**: 초대 코드를 사용하여 가족, 친구, 연인 등 소중한 사람들로 구성된 프라이빗한 공간을 만듭니다.
- **리액션 & 댓글**: 친구의 답변에 공감하는 이모지 리액션을 남기거나 댓글로 대화를 이어갈 수 있습니다.
- **등급 시스템**: 활동 점수에 따라 '반딧불'부터 '여명'까지 성장하는 등급 시스템을 통해 꾸준한 기록을 독려합니다.
- **아카이브**: 캘린더 뷰를 통해 과거에 주고받았던 질문과 답변들을 언제든 다시 꺼내볼 수 있습니다.

## 기술 스택
- **Frontend**: Expo (React Native v56), TypeScript
- **Backend**: Firebase (Firestore, Authentication, Cloud Storage, Functions)
- **AI**: LiteLLM (매일 질문 자동 생성 로직 연동)
- **CI/CD & Deployment**: EAS Build

## 시작하기

### 필요 환경
- [Node.js](https://nodejs.org/) (LTS 버전 권장)
- [npm](https://www.npmjs.com/) 또는 [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/client) 앱 (모바일 테스트용)

### 설치 방법
```bash
# 저장소 복제
git clone https://github.com/JJU09/moeum.git
cd moeum

# 의존성 설치
npm install
```

### 환경변수 설정
프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 필요한 환경 변수를 설정합니다. (`.env.example` 파일을 참고하세요.)

```bash
# .env.local 예시
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
...
```

### 실행 방법
```bash
# 개발 서버 시작
npx expo start

# 또는 특정 플랫폼으로 바로 실행
npm run ios     # iOS 시뮬레이터
npm run android # 안드로이드 에뮬레이터
```

## 스크린샷
| 홈 화면 | 피드 | 그룹 | 마이페이지 |
| :---: | :---: | :---: | :---: |
| ![홈](https://via.placeholder.com/200x400?text=Home) | ![피드](https://via.placeholder.com/200x400?text=Feed) | ![그룹](https://via.placeholder.com/200x400?text=Group) | ![마이페이지](https://via.placeholder.com/200x400?text=MyPage) |

## 라이선스
[MIT](LICENSE) © [Moeum Team]