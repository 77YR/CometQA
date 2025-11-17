// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAO6mKqpYHUn4marTo1P6CiHdfY31GNgww",
  authDomain: "cometqa-146f1.firebaseapp.com",
  projectId: "cometqa-146f1",
  storageBucket: "cometqa-146f1.firebasestorage.app",
  messagingSenderId: "633380715321",
  appId: "1:633380715321:web:d3aee0e68dcee6afef46e8",
  measurementId: "G-CQHDY623R7"
};

// ------------------ INITIALIZE APP FIRST ------------------
const app = initializeApp(firebaseConfig);

// ------------------ EXPORT FIREBASE SERVICES ------------------
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
