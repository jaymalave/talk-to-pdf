// "use server";
// import * as PlayHT from "playht";
// import fs from "fs";
// import { Readable } from "stream";

// export async function fetchTTS(text: string): Promise<void> {
//   const textStream = new Readable({
//     read() {
//       this.push(text);
//       this.push(null);
//     },
//   });
//   const stream = await PlayHT.stream(textStream);
//   const fileStream = fs.createWriteStream("audio.mp3");
//   stream.pipe(fileStream);
//   console.log("Audio generated for text:", text);
// }
