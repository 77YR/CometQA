// ---------------------- FIREBASE IMPORTS ----------------------
import { db, auth } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ---------------------- PAGE DETECTION ----------------------
const isDashboard = document.getElementById("student-courses") !== null;
const isCoursePage = document.getElementById("course-title") !== null;
const isQuestionPage = document.getElementById("question-title") !== null;

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get("course") || document.body.dataset.course;
const questionId = urlParams.get("question");

// ---------------------- HELPERS ----------------------
async function getUserData(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return null;
  return { docId: snap.id, ...snap.data() };
}

async function getCourseInfo(courseId) {
  const snap = await getDoc(doc(db, "courses", courseId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function getAllQuestions(courseId) {
  const qSnap = await getDocs(collection(db, "courses", courseId, "questions"));
  return qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------------------- AUTH LISTENER ----------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (!window.location.pathname.includes("login.html")) {
      window.location.href = "login.html";
    }
    return;
  }

  const userData = await getUserData(user);
  if (!userData) return alert("User data not found!");

  if (isDashboard) loadDashboard(userData);
  if (isCoursePage) loadCourse(userData);
  if (isQuestionPage) loadQuestion(userData);
});

// =============================================================
// ---------------------- DASHBOARD ----------------------
async function loadDashboard(userData) {
  const coursesContainer = document.getElementById("student-courses");
  const enrolled = userData.enrolledClasses || [];
  const allCoursesSnap = await getDocs(collection(db, "courses"));
  const allCourses = allCoursesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const myCourses = allCourses.filter((c) => enrolled.includes(c.id));

  coursesContainer.innerHTML = "";
  myCourses.forEach((course) => {
    const div = document.createElement("div");
    div.className = "course";
    div.innerHTML = `
      <h3 class="coursename">${course.name}</h3>
      <h1 class="professor">${course.professor}</h1>
      <p class="timeslot">${course.schedule}</p>
      <p class="class-title">${course.code}</p>
      ${userData.role === "professor" ? `<p>Enroll Code: ${course.enrollCode}</p>` : ""}
    `;
    div.onclick = () => {
      window.location.href = `course.html?course=${course.id}`;
    };
    coursesContainer.appendChild(div);
  });
}

// =============================================================
// ---------------------- COURSE PAGE ----------------------
async function loadCourse(userData) {
  if (!courseId) return alert("No course specified!");
  const courseTitleEl = document.getElementById("course-title");
  const listEl = document.getElementById("forum-questions");
  const postBtn = document.getElementById("post-question");

  const courseData = await getCourseInfo(courseId);
  if (!courseData) return alert("Course not found!");

  courseTitleEl.textContent = courseData.name;

  const questions = await getAllQuestions(courseId);
  listEl.innerHTML = "";

  questions.forEach((q) => {
    const div = document.createElement("div");
    div.className = "question post-question";

    div.innerHTML = `
      <h3 style="text-align: left;">${q.title}</h3>
      <p style="text-align: left;">${q.content}</p>
      <div class="heart-container">
        <span class="hearts-count">${q.hearts || 0}</span>
        <button class="heart-btn">❤️</button>
      </div>
      <span class="ai-badge">${q.aiApproved ? "AI Approved ✅" : "AI Not Approved ❌"}</span>
    `;

    const heartBtn = div.querySelector(".heart-btn");
    const heartCount = div.querySelector(".hearts-count");

    heartBtn.onclick = async (e) => {
      e.stopPropagation();
      const ref = doc(db, "courses", courseId, "questions", q.id);
      let newHearts, newLikedBy;

      if (q.likedBy?.includes(userData.docId)) {
        newHearts = (q.hearts || 0) - 1;
        newLikedBy = q.likedBy.filter((id) => id !== userData.docId);
      } else {
        newHearts = (q.hearts || 0) + 1;
        newLikedBy = q.likedBy ? [...q.likedBy, userData.docId] : [userData.docId];
      }

      await updateDoc(ref, { hearts: newHearts, likedBy: newLikedBy });
      q.hearts = newHearts;
      q.likedBy = newLikedBy;
      heartCount.textContent = newHearts;
    };

    div.onclick = () => {
      window.location.href = `question.html?course=${courseId}&question=${q.id}`;
    };

    listEl.appendChild(div);
  });

  postBtn.onclick = () => {
    window.location.href = `post-question.html?course=${courseId}`;
  };
}

// =============================================================
// ---------------------- QUESTION PAGE ----------------------
async function loadQuestion(userData) {
  if (!courseId || !questionId) return alert("Course or question not specified!");
  const titleEl = document.getElementById("question-title");
  const contentEl = document.getElementById("question-content");
  const aiResEl = document.getElementById("ai-response");
  const aiBadgeEl = document.getElementById("ai-badge");
  const profBtns = document.getElementById("professor-buttons");
  const approveBtn = document.getElementById("approve-ai-btn");
  const deleteBtn = document.getElementById("delete-question-btn");
  const addResBtn = document.getElementById("add-response-btn");
  const profResContainer = document.getElementById("professor-response-container");

  const qRef = doc(db, "courses", courseId, "questions", questionId);
  const snap = await getDoc(qRef);
  if (!snap.exists()) return alert("Question not found!");

  const q = snap.data();
  titleEl.textContent = q.title;
  contentEl.textContent = q.content;
  aiResEl.textContent = q.aiResponse || "AI answer pending...";
  aiBadgeEl.textContent = q.aiApproved ? "✔ Approved" : "✖ Not Approved";

  if (userData.role === "professor") {
    profBtns.style.display = "block";

    approveBtn.onclick = async () => {
      const newState = !q.aiApproved;
      await updateDoc(qRef, { aiApproved: newState });
      aiBadgeEl.textContent = newState ? "✔ Approved" : "✖ Not Approved";
    };

    deleteBtn.onclick = async () => {
      if (!confirm("Delete question?")) return;
      await deleteDoc(qRef);
      alert("Question deleted.");
      window.history.back();
    };

    addResBtn.onclick = async () => {
      const res = prompt("Enter response:");
      if (!res) return;
      await updateDoc(qRef, { professorResponse: res });
      profResContainer.textContent = res;
    };

    if (q.professorResponse) profResContainer.textContent = q.professorResponse;
  }
}

// =============================================================
// ---------------------- LOGOUT ----------------------
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.textContent = "⍈";
  logoutBtn.onclick = async () => {
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (error) {
      alert("Logout failed: " + error.message);
    }
  };
}
