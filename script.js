// ---------------------- FIREBASE IMPORTS ----------------------
import { db } from "./firebase.js";
import { collection, addDoc, getDocs, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ---------------------- PAGE DETECTION ----------------------
const isPostPage = document.getElementById("post-button") !== null;
const isCoursePage = document.getElementById("course-title") !== null;
const isDashboard = document.getElementById("student-courses") !== null;
const isQuestionPage = document.getElementById("question-title") !== null;

// ---------------------- COMMON ----------------------
const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get("course") || document.body.dataset.course;
const questionId = urlParams.get("question");

// ---------------------- HELPERS ----------------------
async function getCurrentUser() {
  // Replace with Firebase Auth user ID in production
  const authUserId = "xVkSHLukBANAWs2HBuX8";

  const usersRef = collection(db, "users");
  const qSnap = query(usersRef, where("id", "==", authUserId));
  const querySnap = await getDocs(qSnap);
  if (querySnap.empty) return null;
  const docSnap = querySnap.docs[0];
  return { ...docSnap.data(), docId: docSnap.id };
}

async function getCourseInfo(courseId) {
  const courseSnapshot = await getDocs(collection(db, "courses"));
  const courseData = courseSnapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .find(c => c.id === courseId);
  return courseData ? { name: courseData.name, professor: courseData.professor, enrollCode: courseData.enrollCode, code: courseData.code, schedule: courseData.schedule } : null;
}

async function getAllQuestions(courseId) {
  const questionsSnapshot = await getDocs(collection(db, "courses", courseId, "questions"));
  return questionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------------------- POST QUESTION PAGE ----------------------
if (isPostPage) {
  const titleInput = document.getElementById("question-title");
  const contentInput = document.getElementById("question-content");
  const postButton = document.getElementById("post-button");
  const aiButton = document.getElementById("ai-button");
  let postedQuestionRef = null;

  postButton.addEventListener("click", async () => {
    const userData = await getCurrentUser();
    if (!userData) return alert("User not found!");

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!title || !content) return alert("Fill in both title and content.");

    try {
      postedQuestionRef = await addDoc(collection(db, "courses", courseId, "questions"), {
        title,
        content,
        hearts: 0,
        likedBy: [],
        userId: userData.id,
        aiResponse: "",
        aiApproved: false,
        createdAt: serverTimestamp()
      });
      aiButton.disabled = false;
      window.location.href = `course.html?course=${courseId}`;
    } catch (err) {
      console.error(err);
      alert("Failed to post question.");
    }
  });

  aiButton.addEventListener("click", async () => {
    if (!postedQuestionRef) return;
    const courseInfo = await getCourseInfo(courseId);
    const allQuestions = await getAllQuestions(courseId);
    console.log({
      courseId,
      courseName: courseInfo?.name,
      professor: courseInfo?.professor,
      questions: allQuestions,
      newQuestion: { title: titleInput.value, content: contentInput.value }
    });
    alert("AI placeholder. Check console.");
  });
}

// ---------------------- COURSE PAGE ----------------------
if (isCoursePage) {
  const courseTitleEl = document.getElementById("course-title");
  const forumQuestionsEl = document.getElementById("forum-questions");
  const postBtn = document.getElementById("post-question");

  async function loadCourse() {
    const userData = await getCurrentUser();
    if (!userData) return alert("User not found!");

    if (!courseId) return alert("No course specified!");
    const courseData = await getCourseInfo(courseId);
    if (!courseData) return alert("Course not found!");
    courseTitleEl.textContent = courseData.name;

    const questions = await getAllQuestions(courseId);
    forumQuestionsEl.innerHTML = "";

    questions.forEach(q => {
      const div = document.createElement("div");
      div.className = "question post-question";
      div.innerHTML = `
        <h3>${q.title}</h3>
        <p>${q.content}</p>
        <div class="heart-container">
          <span class="hearts-count">${q.hearts || 0}</span>
          <button class="heart-btn">❤️</button>
        </div>
        <span class="ai-badge">${q.aiApproved ? "AI Approved ✅" : "AI Not Approved ❌"}</span>
      `;

      const heartBtn = div.querySelector(".heart-btn");
      const heartsCountEl = div.querySelector(".hearts-count");
      heartBtn.addEventListener("click", async (e) => {
        e.stopPropagation(); // prevent redirect on heart click
        const questionRef = doc(db, "courses", courseId, "questions", q.id);
        let newHearts, newLikedBy;
        if (q.likedBy?.includes(userData.id)) {
          newHearts = (q.hearts || 0) - 1;
          newLikedBy = q.likedBy.filter(uid => uid !== userData.id);
        } else {
          newHearts = (q.hearts || 0) + 1;
          newLikedBy = q.likedBy ? [...q.likedBy, userData.id] : [userData.id];
        }
        await updateDoc(questionRef, { hearts: newHearts, likedBy: newLikedBy });
        heartsCountEl.textContent = newHearts;
        q.hearts = newHearts;
        q.likedBy = newLikedBy;
      });

      div.addEventListener("click", () => {
        window.location.href = `question.html?course=${courseId}&question=${q.id}`;
      });

      forumQuestionsEl.appendChild(div);
    });
  }

  postBtn.addEventListener("click", () => window.location.href = `post-question.html?course=${courseId}`);
  loadCourse();
}

// ---------------------- QUESTION PAGE ----------------------
if (isQuestionPage) {
  const questionTitleEl = document.getElementById("question-title");
  const questionContentEl = document.getElementById("question-content");
  const aiResponseEl = document.getElementById("ai-response");
  const aiBadgeEl = document.getElementById("ai-badge");
  const professorButtons = document.getElementById("professor-buttons");
  const approveBtn = document.getElementById("approve-ai-btn");
  const deleteBtn = document.getElementById("delete-question-btn");
  const addResponseBtn = document.getElementById("add-response-btn");
  const profResponseContainer = document.getElementById("professor-response-container");

  async function loadQuestion() {
    const userData = await getCurrentUser();
    if (!userData) return alert("User not found!");

    const questionRef = doc(db, "courses", courseId, "questions", questionId);
    const questionSnap = await getDoc(questionRef);
    if (!questionSnap.exists()) return alert("Question not found!");

    const q = questionSnap.data();
    questionTitleEl.textContent = q.title;
    questionContentEl.textContent = q.content;
    aiResponseEl.textContent = q.aiResponse || "[Placeholder AI response]";
    aiBadgeEl.textContent = q.aiApproved ? "✔ Approved" : "✖ Not Approved";

    // show professor-only buttons only if user role is professor
    if (userData.role === "professor") {
      professorButtons.style.display = "block";
      approveBtn.onclick = async () => {
        const newApproval = !q.aiApproved;
        await updateDoc(questionRef, { aiApproved: newApproval });
        q.aiApproved = newApproval;
        aiBadgeEl.textContent = newApproval ? "✔ Approved" : "✖ Not Approved";
        approveBtn.textContent = newApproval ? "Revoke AI Approval" : "Approve AI";
      };

      deleteBtn.onclick = async () => {
        if (!confirm("Delete this question?")) return;
        await deleteDoc(questionRef);
        alert("Question deleted!");
        window.history.back();
      };

      addResponseBtn.onclick = async () => {
        const response = prompt("Enter your response:");
        if (!response) return;
        await updateDoc(questionRef, { professorResponse: response });
        profResponseContainer.textContent = response;
      };

      if (q.professorResponse) profResponseContainer.textContent = q.professorResponse;
    } else {
      professorButtons.style.display = "none";
    }
  }

  loadQuestion();
}

// ---------------------- DASHBOARD PAGE ----------------------
if (isDashboard) {
  const coursesContainer = document.getElementById("student-courses");
  const joinBtn = document.querySelector(".button-9");

  async function loadDashboard() {
    const userData = await getCurrentUser();
    if (!userData) return alert("User not found!");

    const enrolledCourses = userData.enrolledClasses || [];
    const coursesSnapshot = await getDocs(collection(db, "courses"));
    const allCourses = coursesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const courses = allCourses.filter(c => enrolledCourses.includes(c.id));
    coursesContainer.innerHTML = "";

    courses.forEach(course => {
      const div = document.createElement("div");
      div.className = "course";
      div.innerHTML = `
        <h3 class="coursename">${course.name}</h3>
        <h1 class="professor">${course.professor}</h1>
        <p class="timeslot">${course.schedule}</p>
        <p class="class-title">${course.code}</p>
        ${userData.role === "professor" ? `<p>Enroll Code: ${course.enrollCode}</p>` : ""}
      `;
      div.addEventListener("click", () => window.location.href = `course.html?course=${course.id}`);
      coursesContainer.appendChild(div);
    });

    joinBtn.textContent = userData.role === "professor" ? "Create Course" : "Join Course";
    joinBtn.onclick = async () => {
      if (userData.role === "professor") {
        const name = prompt("Course Name:");
        const code = prompt("Course Code:");
        const schedule = prompt("Course Schedule:");
        if (!name || !code || !schedule) return alert("Fill all fields.");
        const enrollCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const docRef = await addDoc(collection(db, "courses"), {
          name, code, schedule, professor: userData.name || "Professor", enrollCode
        });

        const userRef = doc(db, "users", userData.docId);
        const updatedClasses = [...enrolledCourses, docRef.id];
        await updateDoc(userRef, { enrolledClasses: updatedClasses });

        alert(`Course created! Enroll Code: ${enrollCode}`);
        loadDashboard();
      } else {
        const enteredCode = prompt("Enter Enroll Code:");
        if (!enteredCode) return;

        const foundCourse = allCourses.find(c => c.enrollCode === enteredCode);
        if (!foundCourse) return alert("Invalid code.");
        if (enrolledCourses.includes(foundCourse.id)) return alert("Already enrolled.");

        const userRef = doc(db, "users", userData.docId);
        const updatedClasses = [...enrolledCourses, foundCourse.id];
        await updateDoc(userRef, { enrolledClasses: updatedClasses });

        alert(`Joined course: ${foundCourse.name}`);
        loadDashboard();
      }
    };
  }

  loadDashboard();
}

// ---------------------- NAV TOGGLE ----------------------
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.getElementById("site-nav");
if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", isOpen);
  });
}
