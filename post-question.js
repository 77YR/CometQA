// ---------------------- FIREBASE IMPORTS ----------------------
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ---------------------- DOM ELEMENTS ----------------------
const titleInput = document.getElementById("question-title");
const contentInput = document.getElementById("question-content");
const postButton = document.getElementById("post-button");
const aiButton = document.getElementById("ai-button");

// ---------------------- CONSTANTS ----------------------
let courseId = document.body.dataset.course || null;
const currentUserId = "testUser123"; // TODO: Replace with Firebase Auth user ID
let postedQuestionRef = null;

// ---------------------- INIT ----------------------
(function initCourseId() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("course")) {
    courseId = urlParams.get("course");
    document.body.dataset.course = courseId;
  }

  if (!courseId) {
    alert("No course specified!");
  }
})();

// ---------------------- EVENT LISTENERS ----------------------

// Post Question
postButton.addEventListener("click", async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    alert("Please fill in both title and content.");
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "courses", courseId, "questions"), {
      title,
      content,
      hearts: 0,
      likedBy: [],
      userId: currentUserId,
      aiResponse: "",
      aiApproved: false,
      createdAt: serverTimestamp()
    });

    postedQuestionRef = docRef;

    console.log("Question posted successfully:", docRef.id);

    // Redirect to course page using proper courseId
    window.location.href = `course.html?course=${courseId}`;

  } catch (err) {
    console.error("Error posting question:", err);
    alert("Failed to post question: " + err.message);
  }
});

// AI Button Placeholder
aiButton.addEventListener("click", () => {
  if (!postedQuestionRef) return alert("Post a question first!");
  alert("AI suggestion placeholder. Functionality reserved for later.");
});
