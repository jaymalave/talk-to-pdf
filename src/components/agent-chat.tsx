"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { VoiceSelector } from "./voice-selector";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Message = {
  role: "user" | "agent";
  text: string;
};

interface AgentChatProps {
  context: string;
}

export function AgentChat({ context }: AgentChatProps) {
  const [ws, setWs] = useState<WebSocket | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const [isConnecting, setIsConnecting] = useState(false);

  const [isListening, setIsListening] = useState(false);

  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");

  const recognitionRef = useRef<any | null>(null);

  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  const [open, setOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        setFinalTranscript((prev) => (prev ? prev + " " + final : final));
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      toast.error("Speech recognition error: " + event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);

      setFinalTranscript((prevFinal) => {
        const combined = (prevFinal + " " + interimTranscript).trim();

        setInterimTranscript("");

        if (combined) {
          sendMessage(combined);
        }

        return "";
      });
    };

    recognitionRef.current = recognition as any;
  }, []);

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch("/api/agents");
        if (!res.ok) {
          throw new Error("Failed to load agents");
        }
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (error) {
        console.error("Error loading agents:", error);
      }
    }
    loadAgents();
  }, []);

  const handleCreateAgent = async () => {
    try {
      const res = await fetch("/api/create-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          description: agentDescription,
          voice: selectedVoice,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create agent");
      }

      const newAgent = await res.json();
      toast.success("Agent created successfully!");

      setAgents((prev) => [...prev, newAgent]);
      setSelectedAgentId(newAgent.id);

      setOpen(false);
      setAgentName("");
      setAgentDescription("");
      setAgentPrompt("");
    } catch (error: any) {
      toast.error("Error creating agent: " + error.message);
    }
  };

  const connectWebSocket = async (initialTextMessage?: string) => {
    if (!selectedAgentId) {
      toast.error("No agent selected.");
      return;
    }

    setIsConnecting(true);

    try {
      const res = await fetch("/api/agent-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgentId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const { wsUrl } = data;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WebSocket connected");
        setIsConnecting(false);

        socket.send(
          JSON.stringify({
            type: "setup",
            apiKey: `${process.env.NEXT_PUBLIC_PLAY_AI_API_KEY}`,
          })
        );

        if (initialTextMessage?.trim()) {
          socket.send(
            JSON.stringify({
              type: "audioIn",
              data: initialTextMessage,
            })
          );
          setMessages((prev) => [
            ...prev,
            { role: "user", text: initialTextMessage },
          ]);
        }
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case "textOut":
              setMessages((prev) => [
                ...prev,
                { role: "agent", text: msg.data },
              ]);
              break;

            case "textStream":
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === "agent") {
                  return [
                    ...prev.slice(0, -1),
                    { role: "agent", text: lastMsg.text + msg.data },
                  ];
                }

                return [...prev, { role: "agent", text: msg.data }];
              });
              break;

            case "audioStream":
              console.log("Received audioStream message");
              const audioBlob = base64ToBlob(msg.data, "audio/wav");
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              audio.play();
              break;

            default:
              console.log("Unknown message type:", msg);
              break;
          }
        } catch (err) {
          console.error("Error parsing agent message:", err);
        }
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        toast.error("A WebSocket error occurred.");
      };

      socket.onclose = () => {
        console.log("Agent WebSocket connection closed.");
        setWs(null);
      };

      setWs(socket);
    } catch (err: any) {
      console.error(err);
      setIsConnecting(false);
      toast.error("Failed to connect to the agent: " + err.message);
    }
  };

  const sendMessage = (messageText: string) => {
    if (!messageText.trim()) return;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectWebSocket(messageText);
    } else {
      ws.send(JSON.stringify({ type: "textIn", data: messageText }));
      setMessages((prev) => [...prev, { role: "user", text: messageText }]);
    }
  };

  function base64ToBlob(base64Data: string, contentType = ""): Blob {
    const sliceSize = 1024;
    const byteCharacters = atob(base64Data);
    const bytesLength = byteCharacters.length;
    const slicesCount = Math.ceil(bytesLength / sliceSize);
    const byteArrays = new Array(slicesCount);

    for (let sliceIndex = 0; sliceIndex < slicesCount; sliceIndex++) {
      const begin = sliceIndex * sliceSize;
      const end = Math.min(begin + sliceSize, bytesLength);
      const bytes = new Array(end - begin);

      for (let offset = begin, i = 0; offset < end; offset++, i++) {
        bytes[i] = byteCharacters[offset].charCodeAt(0);
      }
      byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, { type: contentType });
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setFinalTranscript("");
      setInterimTranscript("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Error starting speech recognition:", err);
      }
    }
  };

  const handleManualSend = () => {
    const input = document.querySelector(
      'input[placeholder="Type your message"]'
    ) as HTMLInputElement;
    if (input.value.trim()) {
      sendMessage(input.value);
      input.value = "";
    }
  };

  return (
    <div className="border-t mt-4 pt-4">
      {/* ----- TOP RIGHT CONTROLS: Select Agent & Create Agent Modal ----- */}
      <div className="flex justify-end items-center mb-4 gap-4">
        {/* Agent Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm">Select Agent:</span>
          <Select
            value={selectedAgentId}
            onValueChange={(value) => setSelectedAgentId(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Choose an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dialog: Create a New Agent */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Create Agent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>
                Provide the details for your new agent below.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2 py-2">
              <input
                id="agentName"
                type="text"
                placeholder="Agent Name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="border rounded p-1 text-sm"
              />
              <input
                id="agentDescription"
                type="text"
                placeholder="Description"
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                className="border rounded p-1 text-sm"
              />
              <VoiceSelector
                selectedVoice={selectedVoice}
                setSelectedVoice={setSelectedVoice}
              />
            </div>

            <DialogFooter>
              <Button onClick={handleCreateAgent}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ----- Chat UI ----- */}
      <h4 className="text-sm font-medium mb-2">Talk to the selected agent</h4>
      <div className="h-32 overflow-y-auto bg-background p-2 rounded mb-2 border border-border">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-1 ${
              msg.role === "agent" ? "text-blue-600" : "text-black"
            }`}
          >
            <strong>{msg.role === "agent" ? "Agent" : "You"}:</strong>{" "}
            {msg.text}
          </div>
        ))}
        {/* Show partial speech while user is talking */}
        {isListening && interimTranscript && (
          <div className="mb-1 text-gray-600 italic">
            <strong>You (speaking):</strong> {interimTranscript}
          </div>
        )}
      </div>

      {/* Speech Buttons */}
      <div className="flex items-center gap-2">
        <Button onClick={toggleListening} disabled={isConnecting}>
          {isListening ? "Stop Listening" : "Speak"}
        </Button>
        {isListening && (
          <span className="text-sm text-green-600">Listening...</span>
        )}
      </div>

      {/* Manual text input */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Type your message"
          className="border p-1 flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleManualSend();
          }}
        />
        <Button onClick={handleManualSend}>Send</Button>
      </div>
    </div>
  );
}
