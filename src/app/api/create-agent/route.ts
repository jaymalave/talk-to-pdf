// pages/api/create-agent.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createAgent } from "@/lib/utils/db-utils";
export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { name, description, voice } = await req.json();

    const response = await fetch(`https://api.play.ai/api/v1/agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${process.env.PLAY_AI_API_KEY}`,
        "X-USER-ID": `${process.env.PLAY_AI_USER_ID}`,
      },
      body: JSON.stringify({
        displayName: name,
        description,
        voice,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    console.log("data from create-agent route", data);

    const saveAgent = await createAgent(data.id, name, description, voice);
    console.log("saved agent", saveAgent);

    console.log("created agent data", data);
    // Return the created agent data
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.log("error in create-agent route", error);
    console.error("[create-agent] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
