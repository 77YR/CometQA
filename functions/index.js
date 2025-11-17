const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch"); // ensure fetch is available in Node.js

setGlobalOptions({ region: "us-central1", maxInstances: 10, timeoutSeconds: 30 });

try { admin.initializeApp(); } catch {}

const DEMO_MODE = false;

// ---------------------- HELPERS ----------------------
const bucket = () => admin.storage().bucket();

async function loadCourseContext(courseId) {
  if (!courseId) return "";
  const path = `courses/${courseId}/kb.txt`;
  try {
    const [exists] = await bucket().file(path).exists();
    if (!exists) return "";
    const [buf] = await bucket().file(path).download();
    return buf.toString("utf8").slice(0, 24000);
  } catch (e) {
    logger.error("Failed reading course context", { courseId, err: e });
    return "";
  }
}

function inferUrgency(question) {
  const s = (question || "").toLowerCase();
  const high = ["deadline","due","today","tomorrow","midterm","exam","test","quiz","submission","grade"];
  const medium = ["project","assignment","homework","lab","policy","office hours","late","syllabus"];
  if (high.some(k => s.includes(k))) return "high";
  if (medium.some(k => s.includes(k))) return "medium";
  return "low";
}

// ---------------------- HEALTH ----------------------
exports.health = onRequest({ cors: true }, async (_req, res) => {
  return res.status(200).json({ ok: true });
});

// ---------------------- AI ANSWER ENDPOINT ----------------------
exports.getAnswer = onRequest({
  cors: true,
  timeoutSeconds: 30,
  secrets: ["OPENAI_API_KEY"]
}, async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).send("POST only");

    const question = (req.body?.question || "").trim();
    const courseId = (req.body?.courseId || "").trim();
    if (!question) return res.status(400).json({ error: "Missing question" });

    if (DEMO_MODE) {
      return res.json({ answer: "Demo response based on course materials.", urgency: "medium" });
    }

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return res.status(500).json({ error: "Missing OpenAI key" });

    const context = await loadCourseContext(courseId);

    const systemMsg = `
You are Comet Q&A for course ${courseId || "(unspecified)"}.
Answer ONLY using the COURSE CONTEXT. If the answer is not clearly supported, reply with:
{"answer":"I don’t know based on the course materials.","urgency":"low"}.
Return STRICT JSON: {"answer":"<under 200 words>","urgency":"low|medium|high"} — no extra text.

COURSE CONTEXT:
${context || "(no course context provided)"}
    `.trim();

    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: `QUESTION: ${question}` }
      ],
      max_tokens: 320
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error("OpenAI API error", { status: response.status, text: text.slice(0, 500) });
      return res.status(502).json({ error: `OpenAI error ${response.status}`, details: text.slice(0, 300) });
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "";

    let answer = raw.slice(0, 1200);
    let urgency = inferUrgency(question);

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.answer) answer = String(parsed.answer).slice(0, 1200);
      if (parsed?.urgency) urgency = String(parsed.urgency);
    } catch {
      // fallback: raw text without JSON
      answer = raw.replace(/^\s*urgency\s*:\s*(low|medium|high)\s*$/gim, "").trim();
    }

    return res.json({
      answer,
      urgency,
      courseId: courseId || null,
      usedContext: Boolean(context)
    });

  } catch (err) {
    logger.error("Unhandled server error", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
