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
import { Loader2 } from "lucide-react";

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
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  // ------------------------------------------------------------------
  // Initialize speech recognition
  // ------------------------------------------------------------------
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
    recognition.continuous = false; // Force continuous=false

    recognition.onstart = () => console.log("onstart");
    recognition.onspeechstart = () => console.log("onspeechstart");
    recognition.onspeechend = () => console.log("onspeechend");

    recognition.onend = () => {
      console.log("this is on end");
      setIsListening(false);
      setFinalTranscript((prevFinal) => {
        console.log("prevFinal", prevFinal);
        const combined = (prevFinal + " " + interimTranscript).trim();
        console.log("combined", combined);

        setInterimTranscript("");
        if (combined) {
          sendMessage(combined);
        }
        return "";
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

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

    recognitionRef.current = recognition;
  }, []);

  // ------------------------------------------------------------------
  // Load agents
  // ------------------------------------------------------------------
  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch("/api/agents");
        if (!res.ok) {
          throw new Error("Failed to load agents");
        }
        const data = await res.json();
        console.log("data from agents", data);
        localStorage.setItem("selectedAgentId", data.agents[0].id);
        setAgents(data.agents || []);
      } catch (error) {
        console.error(error);
      }
    }
    loadAgents();
  }, []);

  // ------------------------------------------------------------------
  // Whenever selectedAgentId changes, close any existing WebSocket
  // ------------------------------------------------------------------
  useEffect(() => {
    console.log("selected agent id from useEffect", selectedAgentId);
    if (ws) {
      ws.close();
      setWs(null);
    }
  }, [selectedAgentId]);

  // ------------------------------------------------------------------
  // Create a new agent
  // ------------------------------------------------------------------
  const handleCreateAgent = async () => {
    setIsCreatingAgent(true);
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
    } finally {
      setIsCreatingAgent(false);
    }
  };

  // ------------------------------------------------------------------
  // Connect WebSocket
  // ------------------------------------------------------------------
  const connectWebSocket = async (initialTextMessage?: string) => {
    // if (!selectedAgentId) {
    //   toast.error("No agent selected.");
    //   return;
    // }
    setIsConnecting(true);

    try {
      const res = await fetch("/api/agent-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: localStorage.getItem("selectedAgentId"),
        }),
      });

      const data = await res.json();
      console.log("data from agent-init route in connect ws", data);

      if (data.error) throw new Error(data.error);
      const { wsUrl } = data;

      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsConnecting(false);

        // Send setup
        socket.send(
          JSON.stringify({
            type: "setup",
            apiKey: `${process.env.NEXT_PUBLIC_PLAY_AI_API_KEY}`,
          })
        );

        // If we have an initial text message, send it after setup
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
                  // Append streamed text to last agent message
                  return [
                    ...prev.slice(0, -1),
                    { role: "agent", text: lastMsg.text + msg.data },
                  ];
                }
                // Otherwise, just add new msg
                return [...prev, { role: "agent", text: msg.data }];
              });
              break;

            case "audioStream":
              const audioBlob = base64ToBlob(msg.data, "audio/wav");
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              audio.play();
              break;

            default:
              break;
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      socket.onerror = () => {
        toast.error("A WebSocket error occurred.");
      };

      socket.onclose = () => {
        setWs(null);
      };

      setWs(socket);
    } catch (err: any) {
      setIsConnecting(false);
      toast.error("Failed to connect to the agent: " + err.message);
    }
  };

  // ------------------------------------------------------------------
  // Send message to the agent
  // ------------------------------------------------------------------
  const sendMessage = (messageText: string) => {
    if (!messageText.trim()) return;

    // If no open connection, connect first
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log(
        "messagetext before connecting to ws",
        messageText,
        selectedAgentId
      );
      connectWebSocket(messageText);
    } else {
      // Otherwise, just send the message
      ws.send(JSON.stringify({ type: "textIn", data: messageText }));
      setMessages((prev) => [...prev, { role: "user", text: messageText }]);
    }
  };

  // ------------------------------------------------------------------
  // Convert base64 to Blob for audio
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Toggle listening
  // ------------------------------------------------------------------
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
        console.error("Error starting recognition:", err);
      }
    }
  };

  // ------------------------------------------------------------------
  // Handle manual text send
  // ------------------------------------------------------------------
  const handleManualSend = () => {
    const input = document.querySelector(
      'input[placeholder="Type your message"]'
    ) as HTMLInputElement;
    if (input && input.value.trim()) {
      sendMessage(input.value);
      input.value = "";
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="border-t mt-4 pt-4">
      <div className="flex flex-col sm:flex-row justify-end items-center mb-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Select Agent:</span>
          <Select
            value={selectedAgentId}
            onValueChange={(value) => {
              setSelectedAgentId(value);
              localStorage.setItem("selectedAgentId", value);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="" />
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

        {/* Dialog to Create Agent */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Create Agent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>
                Provide details for your new agent below.
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
              <Button
                onClick={handleCreateAgent}
                disabled={isCreatingAgent}
                className="cursor-pointer"
              >
                {isCreatingAgent ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                  </div>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <h4 className="text-sm font-medium mb-2">Talk to the selected agent</h4>

      {/* Chat Display */}
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
        {isListening && interimTranscript && (
          <div className="mb-1 text-gray-600 italic">
            <strong>You (speaking):</strong> {interimTranscript}
          </div>
        )}
      </div>

      {/* Buttons and Input */}
      <div className="flex items-center gap-2">
        <Button onClick={toggleListening} disabled={isConnecting}>
          {isListening ? "Stop Listening" : "Speak"}
        </Button>
        {isListening && (
          <span className="text-sm text-green-600">Listening...</span>
        )}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Type your message"
          className="border p-1 px-2 flex-1 rounded-md border-border focus:outline-none font-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleManualSend();
          }}
        />
        <Button onClick={handleManualSend} className="whitespace-nowrap">
          Send
        </Button>
      </div>
    </div>
  );
}
