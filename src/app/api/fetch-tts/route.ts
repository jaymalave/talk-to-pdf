import { NextApiRequest } from "next";

import { NextApiResponse } from "next";

// In your Next.js API route (e.g., pages/api/tts.js or app/api/tts/route.js)
export async function POST(req: NextApiRequest, res: NextApiResponse) {
  console.log("req.body for tts", req.body);
  if (req.method === "POST") {
    try {
      // You can either use the payload from the request or define it here
      const payload = req.body || {
        voice:
          "s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json",
        output_format: "mp3",
        voice_engine: "PlayDialog",
      };

      const options = {
        method: "POST",
        headers: {
          accept: "audio/mpeg",
          "content-type": "application/json",
          Authorization: `${process.env.PLAYHT_API_KEY}`,
          "X-USER-ID": process.env.PLAYHT_USER_ID || "",
        },
        body: JSON.stringify(payload),
      };

      const response = await fetch(
        "https://api.play.ht/api/v2/tts/stream",
        options
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API error: ${response.status} - ${errorData}`);
      }

      res.setHeader("Content-Type", "audio/mpeg");

      // Read the stream as a Blob
      const audioBlob = await response.blob();
      const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

      // Send the audio buffer to the response
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        error: (error as Error).message || "Failed to generate audio",
      });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
