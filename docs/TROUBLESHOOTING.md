# 모음(Moeum) 앱 개발 트러블슈팅 가이드

> Expo + React Native + Firebase + EAS Build 환경에서 발생한 문제들과 해결 방법

---

## 1. Firebase 권한 오류 (Missing or insufficient permissions)

**증상**
```
FirebaseError: Missing or insufficient permissions.
```

**원인**
Firestore 보안 규칙 미설정 또는 로그인 완료 전 Firestore 조회 실행

**해결**
firestore.rules 작성 후 배포:
```bash
npx firebase-tools deploy --only firestore:rules
```
주요 규칙: members 서브컬렉션 규칙 누락에 주의할 것
```javascript
match /groups/{groupId}/members/{memberId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == memberId;
}
```

---

## 2. 새 Google 계정 로그인 시 권한 오류

**원인**
1. 로그인 완료 전 Firestore 조회 실행 (타이밍 문제)
2. 새 계정의 users/{userId} 문서가 없음

**해결**
```typescript
// user가 null이 아닐 때만 Firestore 조회
useEffect(() => {
  if (!user) return;
  fetchTodayQuestion();
}, [user]);

// Google 로그인 시 문서 없으면 자동 생성
if (!userDoc.exists()) {
  await setDoc(userRef, {
    nickname: currentUser.displayName || '모음 사용자',
    profileImage: '',
    statusMessage: '',
    createdAt: serverTimestamp(),
    streakCount: 0,
  });
}
```

---

## 3. 초대 코드 입장 버튼 무반응

**원인**
catch 블록에 console.error 누락, isSubmitting 상태 미해제

**해결**
```typescript
} catch (error) {
  console.error('Group join error:', error);
  Alert.alert('오류', error.message || '그룹 참여 중 오류가 발생했습니다.');
} finally {
  setIsSubmitting(false);
}
```

---

## 4. 그룹 입장 후 모달이 닫히지 않는 문제

**원인**
router.push 실행 시 모달이 뒷배경에 남는 현상

**해결**
아래 순서로 처리:
1. 모달 닫기 (setJoinModalVisible(false))
2. 입력값 초기화 (setInviteCode(''))
3. 전역 상태 업데이트 (setSelectedGroupId)
4. 딜레이 후 화면 이동 (setTimeout 100ms)

---

## 5. 오늘의 질문이 표시되지 않는 문제

**원인**
저장 필드명(content)과 조회 필드명(text) 불일치
날짜 조회가 UTC 기준으로 되어 KST와 하루 차이 발생

**해결**
```typescript
// 필드명 호환 처리
content: docData.content || docData.text,

// KST 기준 날짜
const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
const today = kstDate.toISOString().split('T')[0];
```

---

## 6. Cloud Functions 배포 오류 (IAM 권한)

**증상**
```
Error: We failed to modify the IAM policy for the project.
```

**해결**
```bash
brew install google-cloud-sdk
gcloud auth login
gcloud config set project [PROJECT_ID]

gcloud projects add-iam-policy-binding [PROJECT_ID] \
  --member=serviceAccount:service-[NUMBER]@gcp-sa-pubsub.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountTokenCreator

gcloud projects add-iam-policy-binding [PROJECT_ID] \
  --member=serviceAccount:[NUMBER]-compute@developer.gserviceaccount.com \
  --role=roles/run.invoker

gcloud projects add-iam-policy-binding [PROJECT_ID] \
  --member=serviceAccount:[NUMBER]-compute@developer.gserviceaccount.com \
  --role=roles/eventarc.eventReceiver
```

---

## 7. Cloud Functions Node.js 버전 오류

**증상**
```
Error: Runtime Node.js 18 was decommissioned on 2025-10-30.
```

**해결**
functions/package.json 수정:
```json
"engines": { "node": "20" }
```

---

## 8. Cloud Functions 배포 오류 (firebase.json)

**증상**
```
Error: Cannot understand what targets to deploy/serve.
```

**해결**
firebase.json에 functions 설정 추가:
```json
{
  "firestore": { "rules": "firestore.rules" },
  "functions": [{
    "source": "functions",
    "codebase": "default",
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
  }]
}
```

---

## 9. @react-native-firebase 웹 호환성 오류

**증상**
```
Error: No Firebase App '[DEFAULT]' has been created
```

**원인**
@react-native-firebase는 웹에서 동작하지 않음

**해결**
```typescript
if (Platform.OS !== 'web') {
  const messaging = require('@react-native-firebase/messaging').default;
  // FCM 관련 코드
}
```

---

## 10. EAS Build - google-services.json 누락

**증상**
```
"google-services.json" is missing
```

**해결**
EAS Secret으로 등록:
```bash
eas secret:create --scope project \
  --name GOOGLE_SERVICES_JSON \
  --type file \
  --value ./google-services.json
```

또는 .easignore 파일 생성:
```
!google-services.json
!GoogleService-Info.plist
```

---

## 11. EAS Build - Gradle minSdkVersion 충돌

**증상**
```
User has minSdkVersion 23 but library was built for 24
```

**해결**
app.config.js 수정:
```javascript
["expo-build-properties", {
  "android": {
    "minSdkVersion": 24  // 23 → 24
  }
}]
```

---

## 12. Android 앱 크래시 - Firebase API Key 오류

**증상** (adb logcat 확인)
```
FirebaseError: Firebase: Error (auth/invalid-api-key)
```

**원인**
EXPO_PUBLIC_ 환경변수가 EAS 빌드에 미포함

**해결**
Firebase 환경변수를 EAS Secret으로 등록:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --type string --value "값"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --type string --value "값"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --type string --value "값"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --type string --value "값"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --type string --value "값"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --type string --value "값"
```

> ⚠️ eas.json에 직접 키값 입력 금지 - EAS Secret으로만 관리

---

## 13. Firestore 복합 인덱스 오류

**증상**
```
FirebaseError: The query requires an index.
```

**해결**
에러 메시지의 링크를 클릭해 Firebase 콘솔에서 인덱스 자동 생성
(생성 완료까지 수 분 소요)

---

## 14. 댓글 BottomSheet 무반응

**원인**
@gorhom/bottom-sheet가 상위 레이아웃에 갇혀 렌더링 불가

**해결**
@gorhom/bottom-sheet 제거하고 React Native 기본 Modal로 교체:
```typescript
<Modal
  visible={showComments}
  animationType="slide"
  transparent={true}
>
  <View style={styles.overlay} />
  <View style={styles.modalContent}>
    {/* 댓글 내용 */}
  </View>
</Modal>
```

---

## 15. 웹에서 로그아웃 버튼 무반응

**원인**
Alert.alert가 웹에서 동작하지 않음

**해결**
```typescript
const confirmed = Platform.OS === 'web'
  ? window.confirm('로그아웃 하시겠어요?')
  : await showNativeAlert();
```

---

## 공통 디버깅 팁

### Android 크래시 로그 확인
```bash
adb devices
adb logcat -c && adb logcat > ~/Desktop/crash_log.txt
grep -A 20 "FATAL\|AndroidRuntime" ~/Desktop/crash_log.txt
```

### EAS Secret 목록 확인
```bash
eas secret:list
```

### Firestore 규칙 배포
```bash
npx firebase-tools deploy --only firestore:rules
```

### Cloud Functions 배포
```bash
cd functions && npm run build
npx firebase-tools deploy --only functions
```

---

*최종 업데이트: 2026-05-26*