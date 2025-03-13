"use client";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const voices = [
  {
    name: "Angelo",
    accent: "american",
    language: "English (US)",
    languageCode: "EN-US",
    value:
      "s3://voice-cloning-zero-shot/baf1ef41-36b6-428c-9bdf-50ba54682bd8/original/manifest.json",
    sample:
      "https://peregrine-samples.s3.us-east-1.amazonaws.com/parrot-samples/Angelo_Sample.wav",
    gender: "male",
    style: "Conversational",
  },
  {
    name: "Deedee",
    accent: "american",
    language: "English (US)",
    languageCode: "EN-US",
    value:
      "s3://voice-cloning-zero-shot/e040bd1b-f190-4bdb-83f0-75ef85b18f84/original/manifest.json",
    sample:
      "https://peregrine-samples.s3.us-east-1.amazonaws.com/parrot-samples/Deedee_Sample.wav",
    gender: "female",
    style: "Conversational",
  },
  {
    name: "Jennifer",
    accent: "american",
    language: "English (US)",
    languageCode: "EN-US",
    value:
      "s3://voice-cloning-zero-shot/801a663f-efd0-4254-98d0-5c175514c3e8/jennifer/manifest.json",
    sample:
      "https://peregrine-samples.s3.amazonaws.com/parrot-samples/jennifer.wav",
    gender: "female",
    style: "Conversational",
  },
];

export function VoiceSelector({
  selectedVoice,
  setSelectedVoice,
}: {
  selectedVoice: string;
  setSelectedVoice: (value: string) => void;
}) {
  const [audioSample, setAudioSample] = useState<string | null>(null);
  const handleVoiceChange = (value: string) => {
    setSelectedVoice(value);
    const voice = voices.find((v) => v.value === value);
    if (voice) {
      setAudioSample(voice.sample);
    }
  };
  const playAudioSample = () => {
    if (audioSample) {
      const audio = new Audio(audioSample);
      audio.play();
    }
  };
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label htmlFor="voice-select" className="text-sm font-medium">
          Voice
        </label>
        {audioSample && (
          <button
            onClick={playAudioSample}
            className="text-xs text-primary hover:underline"
          >
            Play sample
          </button>
        )}
      </div>
      <Select value={selectedVoice} onValueChange={handleVoiceChange}>
        <SelectTrigger id="voice-select" className="w-full py-1">
          <SelectValue placeholder="Select a voice" />
        </SelectTrigger>
        <SelectContent>
          {voices.map((voice) => (
            <SelectItem
              key={voice.value}
              value={voice.value}
              className="flex items-center justify-between w-full"
            >
              <div className="flex flex-row items-center justify-between w-full">
                <span className="mr-2">{voice.name}</span>
                <span className="text-xs text-muted-foreground">
                  {capitalize(voice.gender)} • {capitalize(voice.accent)} •{" "}
                  {capitalize(voice.style)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
