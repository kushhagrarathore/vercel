import { generateQuestions } from "../utils/generateQuestions";

export default async function handler(req, res) {
  // Enable CORS for Vercel deployment
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { topic, session_code } = req.body;

  if (!topic || !session_code) {
    return res.status(400).json({ error: "Missing topic or session_code" });
  }

  try {
    const data = await generateQuestions(topic, session_code);
    res.status(200).json({ success: true, data });
  } catch (e) {
    console.error('AI Generation error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
} 