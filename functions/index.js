const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

const DEMO_MODE = false;

setGlobalOptions({ region: "us-central1", maxInstances: 10, timeoutSeconds: 30 });

try { admin.initializeApp(); } catch {}
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

function inferUrgency(q) {
  const s = (q || "").toLowerCase();
  const hi = ["deadline","due","today","tomorrow","midterm","exam","test","quiz","submission","grade"];
  const med = ["project","assignment","homework","lab","policy","office hours","late","syllabus"];
  if (hi.some(k => s.includes(k))) return "high";
  if (med.some(k => s.includes(k))) return "medium";
  return "low";
}

exports.health = onRequest({ cors: true }, async (_req, res) => {
  return res.status(200).json({ ok: true });
});

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

    if (DEMO_MODE) return res.json({ answer: "Demo response based on course materials.", urgency: "medium" });

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return res.status(500).json({ error: "Missing OpenAI key" });

    const context = await loadCourseContext(courseId);

    const systemMsg = `
You are Comet Q&A for course ${courseId || "(unspecified)"}.
Answer ONLY from the COURSE CONTEXT. If the answer is not clearly supported, reply with:
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

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const text = await r.text();
      logger.error("OpenAI error", { status: r.status, text: text.slice(0, 500) });
      return res.status(502).json({ error: `OpenAI error ${r.status}`, details: text.slice(0, 300) });
    }

    const j = await r.json();
    const raw = j?.choices?.[0]?.message?.content?.trim() || "";
    const stripInlineUrgency = s => s.replace(/^\s*urgency\s*:\s*(low|medium|high)\s*$/gim, "").trim();

    let answer = raw.slice(0, 1200);
    let urgency = inferUrgency(question);

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.answer) answer = String(parsed.answer).slice(0, 1200);
        if (parsed.urgency) urgency = String(parsed.urgency);
      } else {
        answer = stripInlineUrgency(answer);
      }
    } catch {
      answer = stripInlineUrgency(answer);
    }

    return res.json({ answer, urgency, courseId: courseId || null, usedContext: Boolean(context) });
  } catch (err) {
    logger.error("Unhandled server error", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
