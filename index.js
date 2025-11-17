import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { getFirestore, setDoc, doc } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';

//Don't hack me please, seriously
//I know my firebase config is public, but please don't abuse it
//I couldn't figure out how to use environment variables with CDN imports
const firebaseConfig = {
  apiKey: "AIzaSyAWxCvjRhNf18Vrd_1g13W8fxG6u03WrrI",
  authDomain: "cometqa-7be36.firebaseapp.com",
  projectId: "cometqa-7be36",
  storageBucket: "cometqa-7be36.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456",
  measurementId: "G-ABCDEFGH"
};

// If apiKey is missing, log a clear message. You can still set the
// values directly here for a quick static server, but keep them out of
// source control for production.
//AI added this for me
if (!firebaseConfig.apiKey) {
  console.error('Firebase config missing (import.meta.env.VITE_FIREBASE_API_KEY). If you are not using a bundler, switch to CDN imports and set the config values here or run with Vite and a local .env.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const db = getFirestore(app)

//unsure if will use
const provider = new GoogleAuthProvider();


//Sign up new users
const signUp = document.getElementById("signup")
if (signUp) {
  signUp.addEventListener("click", function(event){
event.preventDefault()

const email = document.getElementById("email").value
const password = document.getElementById("password").value
const username = document.getElementById("username").value
const role = document.getElementById("role").value

createUserWithEmailAndPassword(auth, email, password, username, role)
  .then((userCredential) => {
    // Signed up 
    const user = userCredential.user;
    const userData ={
      email: email,
      password: password,
      username: username,
      role: role

    }
    alert("Account Created")
    const docRef = doc(db, "users", user.uid)
    setDoc(docRef, userData)
    .then(() =>{

      window.location.href= "index.html";
    }
    )
    
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    alert(errorMessage)
    // ..
  });

  })
}


//Sign in existing users
const signIn = document.getElementById("login")
if (signIn) {
  signIn.addEventListener("click", function(event){
event.preventDefault()

const email = document.getElementById("email").value
const password = document.getElementById("password").value

signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Signed in 
    const user = userCredential.user;
    localStorage.setItem('loggedInUserID', user.uid);
    window.location.href="student-dashboard.html"
    alert("Signed In")
    
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    alert(errorMessage)
  });

  })
}

//Reset password
//Cannot confirm password update in Firestore, but email is sent and user gets email link
const reset = document.getElementById("reset")
if (reset) {
  reset.addEventListener("click", function(event){
event.preventDefault()

const email = document.getElementById("email").value

sendPasswordResetEmail(auth, email)
  .then(() => {
    // Password reset email sent!
    // ..
    alert("Email sent")
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    alert(errorMessage)
    // ..
  });


  })
}




//Detect auth state, also unsure how to use
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, see docs for a list of available properties
    // https://firebase.google.com/docs/reference/js/auth.user
    const uid = user.uid;
    // ...
  } else {
    // User is signed out
    // ...
  }
});



