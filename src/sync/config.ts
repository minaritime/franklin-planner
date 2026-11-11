import type { FirebaseOptions } from 'firebase/app'

/**
 * Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹)에 나오는 firebaseConfig.
 * 웹 앱용 설정값은 공개되어도 되는 값이다. 데이터는 Firestore 보안 규칙(firestore.rules)이 지킨다.
 * null 이면 동기화 없이 이 기기에만 저장한다.
 */
export const FIREBASE_CONFIG: FirebaseOptions | null = {
  apiKey: 'AIzaSyA-00iD9vo-_828NQ28meXD0A4Pc8rWOj4',
  authDomain: 'franklin-planner-f6e4a.firebaseapp.com',
  projectId: 'franklin-planner-f6e4a',
  storageBucket: 'franklin-planner-f6e4a.firebasestorage.app',
  messagingSenderId: '32524919011',
  appId: '1:32524919011:web:f427fe5ded6435c09925d6',
}
