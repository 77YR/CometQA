# CometQA

A course Q&A platform where students post questions, an AI generates a scoped first-pass answer, and professors review/approve or override it before it's shown as authoritative. Built as a team project for CS1200.

## My Role

Team of 3 with divided ownership: one member built authentication, another built the AI response feature. **My scope covered the core application**: page architecture, Firestore data modeling, the question/answer lifecycle, the professor-approval workflow, and backend integration (including the AI-answer Cloud Function).

## What It Does

- Students post questions to a course-specific forum (`post-question.html` → `script.js`)
- Each question triggers a serverless function (`functions/index.js`) that retrieves course-specific context from Cloud Storage and generates a scoped answer via an LLM call — constrained to answer *only* from that context, with an explicit "I don't know" fallback rather than hallucinating
- The same function classifies question urgency (low/medium/high) from keyword signals, so professors can triage what needs their attention first
- Professors can approve, revoke, delete, or override the AI answer with their own response — the AI answer is never shown as final without human sign-off
- Data model: `courses/{courseId}/questions/{questionId}` in Firestore, with `aiResponse`, `aiApproved`, `professorResponse`, `hearts`/`likedBy` for engagement

## Architecture

- **Frontend**: vanilla JS + Firebase SDK (no framework)
- **Backend**: Firebase Cloud Functions (Node), calling OpenAI's API with a retrieval-scoped system prompt
- **Storage**: Firestore for structured data, Cloud Storage for per-course knowledge base text
- **Auth**: Firebase Auth (built by a teammate; not covered in this write-up)

## Known Limitations / Not Finished

This was a class project scoped to a deadline, not a shipped product. There is a lot that is incomplete:

- The AI-backend integration was never pointed at a live deployed function URL — the Cloud Function code is written and functional in isolation, but end-to-end wiring wasn't finished before the project concluded
- Several pages (professor dashboard, settings, assignments) are navigational stubs without full functionality
- No Firestore security rules were written — this would be required before any real deployment
- No automated tests

## If I Revisit This

Priority list for a real second pass: finish the live AI integration, write Firestore security rules matching the role model, and replace the keyword-based urgency classifier with something more robust. Also open to rebuilding the AI layer entirely rather than patching the current approach — the retrieval/approval-gate pattern is worth keeping, current implementation isn't.
