// pages/api/agent-init.ts
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { agentId, question } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: "agentId is required" });
    }

    // 1) Create a session for the agent (if needed) or reuse an existing session.
    //    The exact endpoint for sessions might differ. Check docs for the correct URL:
    //    e.g., POST /v1/agents/{agent_id}/sessions
    const sessionRes = await fetch(
      `${process.env.PLAY_AI_BASE_URL}/v1/agents/${agentId}/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PLAY_AI_API_KEY}`,
        },
        body: JSON.stringify({
          // Optionally pass initial user question or context
          // Some APIs let you pass messages. Check docs if needed.
          messages: question ? [{ role: "user", content: question }] : [],
        }),
      }
    );

    if (!sessionRes.ok) {
      const err = await sessionRes.json();
      return res.status(sessionRes.status).json(err);
    }

    const sessionData = await sessionRes.json();
    const sessionId = sessionData.id;

    // 2) Construct the WebSocket URL to talk to that session
    //    Based on docs, you typically do something like:
    //    wss://api.play.ai/v1/agents/:agentId/sessions/:sessionId/stream?api_key=YOUR_KEY
    const wsUrl = `wss://api.play.ai/v1/agents/${agentId}/sessions/${sessionId}/stream?api_key=${process.env.PLAY_AI_API_KEY}`;

    // Return the WebSocket URL so the frontend can connect
    return res.status(200).json({ wsUrl });
  } catch (err) {
    console.error("[agent-init] Error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
