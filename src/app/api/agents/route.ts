import { NextResponse } from "next/server";
import { getAgents } from "@/lib/utils/db-utils";

export async function GET() {
  try {
    const agents = await getAgents();
    return NextResponse.json({ agents });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load agents" },
      { status: 500 }
    );
  }
}
