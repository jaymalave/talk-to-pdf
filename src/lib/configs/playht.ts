import * as PlayHT from "playht";
export const initPlayHT = () => {
  PlayHT.init({
    apiKey: process.env.NEXT_PUBLIC_PLAYHT_API_KEY || "",
    userId: process.env.NEXT_PUBLIC_PLAYHT_USER_ID || "",
  });
};
