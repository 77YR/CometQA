import { db, auth } from "./firebase.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get("course");
const questionId = urlParams.get("question");

const questionTitleEl = document.getElementById("question-title");
const questionContentEl = document.getElementById("question-content");
const aiResponseEl = document.getElementById("ai-response");
const aiBadgeEl = document.getElementById("ai-badge");
const professorButtons = document.getElementById("professor-buttons");
const approveBtn = document.getElementById("approve-ai-btn");
const deleteBtn = document.getElementById("delete-question-btn");
const addResponseBtn = document.getElementById("add-response-btn");
const profResponseContainer = document.getElementById("professor-response-container");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // get user role
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const currentUserRole = userDoc.exists() ? userDoc.data().role : "student";

  const questionRef = doc(db, "courses", courseId, "questions", questionId);
  const questionSnap = await getDoc(questionRef);

  if (!questionSnap.exists()) {
    alert("Question not found!");
    return;
  }

  const q = questionSnap.data();

  questionTitleEl.textContent = q.title;
  questionContentEl.textContent = q.content;
  aiResponseEl.textContent = q.aiResponse || "[Placeholder AI response]";
  aiBadgeEl.textContent = q.aiApproved ? "✔ Approved" : "✖ Not Approved";

  // show buttons only for professor
  if (currentUserRole === "professor") {
    professorButtons.style.display = "grid"; // was hidden by default
    approveBtn.textContent = q.aiApproved ? "Revoke AI Approval" : "Approve AI";

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
  }
});
