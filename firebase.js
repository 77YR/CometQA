// firebase.js
// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAO6mKqpYHUn4marTo1P6CiHdfY31GNgww",
  authDomain: "cometqa-146f1.firebaseapp.com",
  projectId: "cometqa-146f1",
  storageBucket: "cometqa-146f1.firebasestorage.app",
  messagingSenderId: "633380715321",
  appId: "1:633380715321:web:d3aee0e68dcee6afef46e8",
  measurementId: "G-CQHDY623R7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Export Firestore and app
export { app, analytics, db };
