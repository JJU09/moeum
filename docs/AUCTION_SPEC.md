# 경매 시스템 기획 명세서 (Auction Spec)

> 모음(Moeum) 앱의 "내일의 질문 선정권 경매" 기능 개발 스펙  
> 작업 순서: DB 스키마 → 보안 규칙 → Cloud Functions → 프론트엔드

---

## 1. 기능 개요

### 핵심 컨셉
- 매일 그룹 내에서 **포인트 블라인드 경매**를 통해 다음날 질문을 직접 만들 수 있는 권한을 부여
- 경매에 참여하지 않은 그룹은 기존 LiteLLM 글로벌 질문을 사용 (Fallback)
- 포인트는 답변 작성 시 획득 → 경매에 사용하는 선순환 구조

### 포인트 단위
- UI 표기명: **⭐ 별조각** (단순 "포인트" 대신 앱 감성에 맞는 명칭 사용)
- Firestore 필드명: `points` (number)

---

## 2. 타임라인

```
07:00  질문 공개 (낙찰 질문 or 글로벌 질문)
  │
  │  ← 답변 작성 가능, 경매 참여 가능
  │
24:00  경매 마감 + 자정 정산 시작 (Cloud Functions)
  │    - 최고 입찰자 선정
  │    - 낙찰자 포인트 차감
  │    - 나머지 입찰자 포인트 환불
  │    - winningQuestion, winnerId 기입
  │    - status: 'closed'
  │
  │  ← 대기 화면 표시 ("오전 7시에 배달됩니다")
  │
07:00  다음날 질문 공개
```

---

## 3. 데이터베이스 스키마

### 3-1. users 컬렉션 (기존 문서에 필드 추가)

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `points` | number | 보유 포인트 (기본값: 0) |

### 3-2. groups/{groupId}/auctions/{YYYY-MM-DD} (신규)

문서 ID는 KST 기준 날짜 `YYYY-MM-DD`

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `participantCount` | number | 현재 경매 참여 인원 수 (UI 표시용) |
| `status` | string | `'open'` \| `'processing'` \| `'closed'` |
| `winningQuestion` | string | 낙찰된 질문 (정산 전: 빈 문자열) |
| `winnerId` | string | 낙찰자 UID (정산 전: 빈 문자열) |
| `winnerNickname` | string | 낙찰자 닉네임 (QuestionCard 표시용) |
| `createdAt` | timestamp | 경매 문서 생성 일시 |

### 3-3. groups/{groupId}/auctions/{YYYY-MM-DD}/bids/{userId} (신규)

문서 ID는 입찰자 UID (1인 1입찰, 재입찰 시 덮어쓰기)

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `questionText` | string | 제안한 질문 내용 |
| `bidPoints` | number | 베팅한 포인트 수 |
| `createdAt` | timestamp | 최초 입찰 일시 |
| `updatedAt` | timestamp | 재입찰(수정) 일시 |

---

## 4. TypeScript 타입 정의

`types/index.ts`에 추가:

```typescript
// 경매 문서
export interface Auction {
  participantCount: number;
  status: 'open' | 'processing' | 'closed';
  winningQuestion: string;
  winnerId: string;
  winnerNickname: string;
  createdAt: Timestamp;
}

// 입찰 문서
export interface Bid {
  userId: string;
  questionText: string;
  bidPoints: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// UserProfile에 추가
// points: number;
```

---

## 5. Firestore 보안 규칙

`firestore.rules`에 추가할 규칙:

```javascript
// 경매 문서: 그룹 멤버 누구나 읽기 가능 (participantCount 표시용)
match /groups/{groupId}/auctions/{dateStr} {
  allow read: if request.auth != null;
  allow write: if false; // Cloud Functions만 쓰기 가능

  // 입찰 문서: 본인 것만 읽기/쓰기 가능 (블라인드 보장)
  match /bids/{userId} {
    allow read, write: if request.auth != null
                       && request.auth.uid == userId;
  }
}
```

### users 포인트 필드 보호 (기존 규칙 수정)
```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  // points 필드는 클라이언트 직접 수정 불가, Functions만 가능
  allow update: if request.auth != null
                && request.auth.uid == userId
                && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['points']);
}
```

---

## 6. Cloud Functions 명세

### FN-01: `settleAuction` (자정 정산 스케줄러)

```
트리거: 매일 00:00 KST (schedule: 'every day 15:00' UTC)
위치: asia-northeast3
```

**처리 순서:**
1. 모든 그룹 순회
2. 각 그룹의 오늘 날짜 auction 문서 조회 (status: 'open')
3. bids 서브컬렉션 전체 조회
4. 입찰자 없음 → 아무 처리 없음 (글로벌 질문 fallback)
5. 최고 입찰자 선정
   - 동점 시: `createdAt` 빠른 순 (선착순)
6. 낙찰자 처리:
   - `users/{winnerId}.points` -= bidPoints
   - `auctions/{date}.winningQuestion` = 낙찰 질문
   - `auctions/{date}.winnerId` = uid
   - `auctions/{date}.winnerNickname` = 닉네임
   - `auctions/{date}.status` = 'closed'
7. 탈락자 처리: 포인트 환불 (별도 차감 없음, 이미 차감 안 됨)
8. Batch write로 원자적 처리

### FN-02: `onAnswerCreatedGivePoints` (답변 작성 시 포인트 지급)

```
트리거: answers 컬렉션 onCreate
```

**처리 순서:**
1. 답변 작성자 UID 확인
2. 오늘 날짜(KST) 기준 해당 유저가 이미 포인트를 받았는지 확인
   - `users/{uid}.lastPointDate` 필드로 중복 방지
3. 중복 아닌 경우: `points` += 10, `lastPointDate` = today
4. 중복인 경우: 스킵

### FN-03: `generateDailyQuestion` 수정 (기존 함수)

기존 로직 유지하되, 각 그룹에 대해:
- `auctions/{today}.winningQuestion` 존재 시 → 해당 질문 사용
- 없으면 → 기존 LiteLLM 글로벌 질문 fallback

---

## 7. 프론트엔드 컴포넌트 명세

### FE-01: `lib/auction.ts` (신규)

```typescript
// 주요 함수
upsertBid(groupId, bid)          // 입찰 생성/수정 (bids/{uid} upsert)
getMyBid(groupId, date)          // 내 입찰 조회
subscribeAuction(groupId, date)  // 경매 현황 실시간 구독 (participantCount 등)
getAuction(groupId, date)        // 경매 현황 1회 조회
```

### FE-02: `lib/question.ts` 수정

`getTodayQuestion(groupId)` 로직 변경:
1. `groups/{groupId}/auctions/{today}` 조회
2. `winningQuestion` 존재 → `{ ...question, isCustom: true, winnerNickname }` 반환
3. 없으면 → 기존 `questions/{today}` 글로벌 질문 반환 (`isCustom: false`)

### FE-03: `components/AuctionCard.tsx` (신규)

**표시 조건:** 현재 시간 07:00~24:00, 경매 status: 'open'

**UI 구성:**
- 참여 인원 수: "현재 N명 참여 중"
- 자정까지 카운트다운 타이머
- 미참여 상태: "별조각 베팅하고 질문 던지기" 버튼
- 참여 중 상태: "내 질문 수정하기 (현재 N별조각 베팅 중)" 버튼
- 버튼 클릭 시 AuctionBidModal 오픈

### FE-04: `components/AuctionBidModal.tsx` (신규)

**UI 구성:**
- 상단: 보유 포인트 잔액 ("내 별조각: ✨ 450")
- 질문 입력창 (multiline TextInput)
  - placeholder: "내일 우리 멤버들에게 던지고 싶은 질문을 적어주세요"
- 포인트 베팅 컨트롤
  - `-` 버튼 / 포인트 직접 입력 / `+` 버튼
  - 퀵 버튼: `+10` `+50` `All-in`
- 안내 문구: "낙찰되지 않은 빛은 자정에 100% 환불됩니다"
- 제출 버튼: `upsertBid` 호출 후 모달 닫기

### FE-05: `components/QuestionCard.tsx` 수정

`isCustom: true` 일 때:
- 카드 상단에 `<CrownBadge />` 표시
- "[winnerNickname]님이 낸 오늘의 질문 ✨" 라벨 추가

`isCustom: false` 일 때:
- 기존 UI 그대로 유지

### FE-06: `app/(tabs)/index.tsx` 수정

현재 시간(KST) 기준 분기:
- `07:00 ~ 24:00`: QuestionCard 아래 AuctionCard 노출
- `00:00 ~ 07:00`: 대기 화면 표시
  - 문구: "오늘 우리 그룹의 질문 정산이 완료되었습니다 💌"
  - 부문구: "과연 누구의 질문이 채택되었을까요? 오전 7시에 배달됩니다!"

### FE-07: `app/(tabs)/my.tsx` 수정

streak/등급 영역 옆에 포인트 잔액 표시:
- `users/{uid}.points` 실시간 구독
- 표시 형식: "⭐ 별조각 N"

---

## 8. 작업 티켓 순서

```
[DB-01] types/index.ts — UserProfile에 points 필드, Auction/Bid 타입 추가
[DB-02] lib/auction.ts — upsertBid, getMyBid, subscribeAuction, getAuction 구현
[SEC-01] firestore.rules — auctions/bids 보안 규칙 추가
[SEC-02] firestore.rules — users points 필드 쓰기 보호
[FN-01] functions/src/index.ts — settleAuction 스케줄러 추가
[FN-02] functions/src/index.ts — onAnswerCreatedGivePoints 트리거 추가
[FN-03] functions/src/index.ts — generateDailyQuestion 경매 연동 수정
[FE-01] lib/question.ts — getTodayQuestion 경매 질문 우선 조회로 수정
[FE-02] components/AuctionBidModal.tsx — 입찰 모달 신규 제작
[FE-03] components/AuctionCard.tsx — 경매 상태 카드 신규 제작
[FE-04] app/(tabs)/index.tsx — AuctionCard 삽입 + 새벽 대기 화면 분기
[FE-05] components/QuestionCard.tsx — isCustom 낙찰 표시 UI 추가
[FE-06] app/(tabs)/my.tsx — 별조각 잔액 + 충전하기 버튼 추가
[IAP-01] react-native-iap 설치 및 초기 설정
[IAP-02] functions/src/index.ts — verifyPurchaseAndGrantPoints 함수 추가
[IAP-03] app/shop/index.tsx — 별조각 상점 화면 신규 제작
```

---

## 9. 인앱 결제 (별조각 구매)

### 개요
- 무료 획득(답변 작성 +10)만으로는 경쟁력 있는 베팅이 어려울 수 있어 유료 구매 옵션 제공
- Expo/React Native 인앱 결제: `react-native-iap` 라이브러리 사용
- 플랫폼: Android (Google Play Billing), iOS (App Store IAP)

### 상품 구성 (예시)

| 상품명 | 별조각 | 가격 (KRW) | 제품 ID |
|--------|--------|------------|---------|
| 한 줌의 별조각 | 100 | ₩1,100 | `starpiece_100` |
| 한 봉지 별조각 | 550 | ₩5,500 | `starpiece_550` |
| 한 상자 별조각 | 1,200 | ₩11,000 | `starpiece_1200` |

> 가격 및 수량은 출시 전 조정 가능

### 구현 방식

**클라이언트 흐름:**
1. `react-native-iap`으로 상품 목록 조회
2. 유저 구매 → 영수증(receipt) 발급
3. 영수증을 Cloud Functions로 전송
4. Functions에서 영수증 검증 (Google/Apple 서버 검증)
5. 검증 성공 → Firestore `users/{uid}.points` 증가
6. 클라이언트에 결과 반환

**검증은 반드시 서버(Cloud Functions)에서 처리** — 클라이언트 단독 처리는 위변조 가능

### Cloud Functions 추가 (FN-04)

```
함수명: verifyPurchaseAndGrantPoints
트리거: HTTPS Callable
```

**처리 순서:**
1. 클라이언트로부터 `{ receipt, productId, platform }` 수신
2. platform에 따라 Google Play / App Store 영수증 검증 API 호출
3. 검증 성공 시 productId에 맞는 별조각 수량 조회
4. `users/{uid}.points` += 수량 (Transaction)
5. `purchases/{uid}/history` 에 구매 내역 기록
6. 결과 반환

### Firestore 추가 스키마

**purchases/{uid}/history/{purchaseId}**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `productId` | string | 구매한 상품 ID |
| `points` | number | 지급된 별조각 수량 |
| `platform` | string | `'android'` \| `'ios'` |
| `receiptToken` | string | 검증된 영수증 토큰 |
| `createdAt` | timestamp | 구매 일시 |

### 프론트엔드 추가 (FE-07)

**`app/shop/index.tsx`** (신규 — 별조각 상점 화면)
- 상품 카드 리스트 (가격, 별조각 수량, 구매 버튼)
- 현재 보유 별조각 잔액 표시
- 구매 버튼 → `react-native-iap` 구매 플로우 → Functions 검증 → 잔액 갱신

**`app/(tabs)/my.tsx` 수정**
- 보유 별조각 옆에 "충전하기" 버튼 → `app/shop` 이동

### 패키지 설치

```bash
npx expo install react-native-iap
```

> IAP는 시뮬레이터/에뮬레이터에서 테스트 불가, 실제 기기 필요  
> Android: Google Play Console에서 인앱 상품 등록 필요  
> iOS: App Store Connect에서 인앱 구입 상품 등록 필요

---

## 10. 주의사항 및 예외 처리

### KST 시간 처리
- 모든 날짜 계산은 KST(UTC+9) 기준
- Cloud Functions에서: `new Date(Date.now() + 9 * 60 * 60 * 1000)`
- 프론트에서: 동일 방식으로 KST 오늘 날짜 계산

### 포인트 원자성
- 포인트 차감/환불은 Firestore Batch write 또는 Transaction으로 처리
- 클라이언트에서 직접 points 필드 수정 불가 (보안 규칙으로 차단)

### 동점 처리
- 동일 포인트 입찰 시 `createdAt` 빠른 순 (선착순) 낙찰

### 기존 코드 패턴 준수
- lib 함수는 `lib/answer.ts`, `lib/group.ts` 패턴과 동일하게 작성
- 타입은 모두 `types/index.ts`에서 중앙 관리
- Firebase import는 `lib/firebase.ts`에서 가져오기