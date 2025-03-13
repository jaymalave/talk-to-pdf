// pages/api/agent-init.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { agentId } = await req.json();
    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    const wsUrl = `wss://api.play.ai/v1/talk/${agentId}`;

    return NextResponse.json({ wsUrl }, { status: 200 });
  } catch (err) {
    console.error("Error in agent-init:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
