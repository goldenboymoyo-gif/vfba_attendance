declare module 'firebase/app' {
  export function initializeApp(...args: any[]): any;
  export function getApps(...args: any[]): any[];
  export function getApp(...args: any[]): any;
}

declare module 'firebase/auth' {
  export function getAuth(...args: any[]): any;
  export function signInWithEmailAndPassword(auth: any, email: string, password: string): Promise<any>;
  export function createUserWithEmailAndPassword(auth: any, email: string, password: string): Promise<any>;
  export function signOut(auth: any): Promise<void>;
  export function onAuthStateChanged(auth: any, callback: (user: any) => void): () => void;
  export class User {}
}

declare module 'firebase/firestore' {
  export function getFirestore(...args: any[]): any;
  export function collection(db: any, path: string): any;
  export function doc(db: any, path: string, ...pathSegments: string[]): any;
  export function getDoc(ref: any): Promise<any>;
  export function setDoc(ref: any, data: any): Promise<void>;
  export function addDoc(collectionRef: any, data: any): Promise<any>;
  export function updateDoc(ref: any, data: any): Promise<void>;
  export function deleteDoc(ref: any): Promise<void>;
  export function onSnapshot(query: any, both: (snap: any) => void): () => void;
  export function onSnapshot(query: any, both: (snap: any) => void, onError: (err: any) => void): () => void;
  export function query(base: any, ...filters: any[]): any;
  export function orderBy(field: string, direction?: string): any;
  export function limit(n: number): any;
  export function arrayUnion(...elements: any[]): any;
  export function where(field: string, op: any, value: any): any;
  export function getDocs(ref: any): Promise<any>;
  export class Timestamp {
    static now(): Timestamp;
    toDate(): Date;
  }
}

