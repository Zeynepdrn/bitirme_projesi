import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBxzn2U7NqFlYOLyKhwRsJmqG9G_BtilpA",
  authDomain: "bitirmeprojesi-56357.firebaseapp.com",
  projectId: "bitirmeprojesi-56357",
  storageBucket: "bitirmeprojesi-56357.firebasestorage.app",
  messagingSenderId: "1033200416685",
  appId: "1:1033200416685:web:c28ba728615cafcf501324",
  measurementId: "G-TY9ECXQ4Q4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };  