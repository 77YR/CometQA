import { db } from "./firebase.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get("course");
const questionId = urlParams.get("question");
const currentUserRole = "professor"; // For testing
const currentUserId = "testUser123";

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
  const questionRef = doc(db, "courses", courseId, "questions", questionId);
  const questionSnap = await getDoc(questionRef);

  if (!questionSnap.exists()) {
    alert("Question not found!");
    return;
  }

  const q = questionSnap.data();

  questionTitleEl.textContent = q.title;
  questionContentEl.textContent = q.content;

  // AI placeholder
  aiResponseEl.textContent = q.aiResponse || "[Placeholder AI response]";
  aiBadgeEl.textContent = q.aiApproved ? "✔ Approved" : "✖ Not Approved";

  // Show professor-only buttons if professor
  if (currentUserRole === "professor") {
    professorButtons.style.display = "block";
    approveBtn.textContent = q.aiApproved ? "Revoke AI Approval" : "Approve AI";

    approveBtn.addEventListener("click", async () => {
      const newApproval = !q.aiApproved;
      await updateDoc(questionRef, { aiApproved: newApproval });
      q.aiApproved = newApproval;
      aiBadgeEl.textContent = newApproval ? "✔ Approved" : "✖ Not Approved";
      approveBtn.textContent = newApproval ? "Revoke AI Approval" : "Approve AI";
    });

    deleteBtn.addEventListener("click", async () => {
      if (!confirm("Delete this question?")) return;
      await deleteDoc(questionRef);
      alert("Question deleted!");
      window.history.back();
    });

    addResponseBtn.addEventListener("click", async () => {
      const response = prompt("Enter your response:");
      if (!response) return;
      await updateDoc(questionRef, { professorResponse: response });
      profResponseContainer.textContent = response;
    });

    if (q.professorResponse) {
      profResponseContainer.textContent = q.professorResponse;
    }
  }
}

loadQuestion();
