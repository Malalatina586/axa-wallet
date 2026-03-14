// firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB1jvV3b4rPrFEdgyEWvvgNUlmWQkaDnoU",
  authDomain: "axe-wallet.firebaseapp.com",
  projectId: "axe-wallet",
  storageBucket: "axe-wallet.firebasestorage.app",
  messagingSenderId: "Y1048416822332",
  appId: "1:1048416822332:web:49aac03172e7cff72b4f39"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };