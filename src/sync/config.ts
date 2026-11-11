import type { FirebaseOptions } from 'firebase/app'

/**
 * Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹)에 나오는 firebaseConfig.
 * 웹 앱용 설정값은 공개되어도 되는 값이다. 데이터는 Firestore 보안 규칙이 지킨다.
 * null 이면 동기화 없이 이 기기에만 저장한다.
 */
export const FIREBASE_CONFIG: FirebaseOptions | null = null
