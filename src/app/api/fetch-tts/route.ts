import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return new NextResponse(
      JSON.stringify({ error: `Method ${req.method} Not Allowed` }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { text, voice, model } = await req.json();

    // Validate required parameters
    if (!text || !voice || !model) {
      return new NextResponse(
        JSON.stringify({
          error: "Missing required parameters: text, voice, or model",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Following Play.AI documentation for PlayDialog model
    const payload = {
      text,
      voice,
      output_format: "mp3",
      model: "PlayDialog", // Using PlayDialog as specified in docs
      quality: "high",
      sample_rate: 24000,
    };

    const options = {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        Authorization: `${process.env.PLAY_AI_API_KEY}`,
        "X-USER-ID": `${process.env.PLAY_AI_USER_ID}`,
      },
      body: JSON.stringify(payload),
    };

    // Use the correct endpoint from the Play.AI docs
    const upstreamResponse = await fetch(
      "https://api.play.ai/api/v1/tts/stream",
      options
    );

    if (!upstreamResponse.ok) {
      const errorData = await upstreamResponse.text();
      throw new Error(`API error: ${upstreamResponse.status} - ${errorData}`);
    }

    // Create a transform stream to pipe data from upstream to client
    const { readable, writable } = new TransformStream();
    const reader = upstreamResponse.body!.getReader();
    const writer = writable.getWriter();

    // Process the stream
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            await writer.close();
            break;
          }
          await writer.write(value);
        }
      } catch (err: any) {
        console.error("Stream error:", err);

        // Properly handle stream errors
        if (
          err.name === "AbortError" ||
          err.message?.includes("ResponseAborted")
        ) {
          console.log("Client aborted the request");
        } else {
          console.error("Error processing audio stream:", err);
        }

        try {
          await writer.abort(err);
        } catch (abortErr) {
          console.error("Error aborting writer:", abortErr);
        }
      }
    })();

    // Return the readable stream to the client
    return new NextResponse(readable, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("Error in TTS API route:", error);
    return new NextResponse(
      JSON.stringify({
        error: error.message || "Failed to generate audio",
        details: error.stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
