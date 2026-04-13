import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC4YY7M1LLGq4-8Nn8eiNufNMZiA6K_gSY",
  authDomain: "habit-tracker-78c06.firebaseapp.com",
  projectId: "habit-tracker-78c06",
  storageBucket: "habit-tracker-78c06.firebasestorage.app",
  messagingSenderId: "224218291662",
  appId: "1:224218291662:web:00277444e019fa29ce5f9f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
