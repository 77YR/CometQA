import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  sendPasswordResetEmail 
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { 
  getFirestore, 
  setDoc, 
  doc 
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';

// -------------------- FIREBASE CONFIG --------------------
const firebaseConfig = {
  apiKey: "AIzaSyAO6mKqpYHUn4marTo1P6CiHdfY31GNgww",
  authDomain: "cometqa-146f1.firebaseapp.com",
  projectId: "cometqa-146f1",
  storageBucket: "cometqa-146f1.firebasestorage.app",
  messagingSenderId: "633380715321",
  appId: "1:633380715321:web:d3aee0e68dcee6afef46e8",
  measurementId: "G-CQHDY623R7"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ========================================================
// ====================== SIGNUP ==========================
// ========================================================
const signUpBtn = document.getElementById("signup");

if (signUpBtn) {
  signUpBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const username = document.getElementById("username").value.trim();
    const role = document.getElementById("role").value || "student";

    if (!email || !password || !username)
      return alert("Fill in all fields!");

    try {
      // auth user
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // create firestore user document
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,             // <-- added (fix for dashboard)
        email,
        username,
        role,
        enrolledClasses: []
      });

      alert("Account Created Successfully!");
      window.location.href = "login.html";

    } catch (error) {
      alert("Signup Error: " + error.message);
    }
  });
}

// ========================================================
// ======================= LOGIN ==========================
// ========================================================
const signInBtn = document.getElementById("login");

if (signInBtn) {
  signInBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password)
      return alert("Enter email and password!");

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      localStorage.setItem("loggedInUserID", user.uid);

      alert("Signed In Successfully!");
      window.location.href = "dashboard.html";

    } catch (error) {
      if (error.code === "auth/user-not-found") {
        alert("No account found with this email.");
      } else if (error.code === "auth/wrong-password") {
        alert("Incorrect password.");
      } else if (error.code === "auth/configuration-not-found") {
        alert("Firebase Auth configuration not found.");
      } else {
        alert("Login Error: " + error.message);
      }
    }
  });
}

// ========================================================
// ================== RESET PASSWORD ======================
// ========================================================
const resetBtn = document.getElementById("reset");

if (resetBtn) {
  resetBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    if (!email) return alert("Enter your email!");

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent!");
    } catch (error) {
      alert("Error: " + error.message);
    }
  });
}

// ========================================================
// =============== AUTH STATE LISTENER (SAFE) =============
// ========================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User signed in:", user.uid);
    // NO auto-redirect here → prevents infinite loop
  } else {
    console.log("No user signed in");
  }
});

export { auth, db };
