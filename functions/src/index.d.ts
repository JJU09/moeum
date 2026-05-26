export declare const generateDailyQuestion: import("firebase-functions/v2/scheduler").ScheduleFunction;
export declare const onReactionUpdated: import("firebase-functions/v2/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    answerId: string;
}>>;
export declare const onCommentCreated: import("firebase-functions/v2/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    commentId: string;
}>>;
//# sourceMappingURL=index.d.ts.map