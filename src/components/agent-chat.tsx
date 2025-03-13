"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { VoiceSelector } from "./voice-selector";

// Shadcn UI imports for Select (dropdown)
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// Shadcn UI imports for Dialog (modal)
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Optionally, you might use these if you have them in your Shadcn setup
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";

// ------ TYPES ------
type Message = {
  role: "user" | "agent";
  text: string;
};

interface AgentChatProps {
  context: string;
}

// ------ COMPONENT ------
export function AgentChat({ context }: AgentChatProps) {
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Conversation
  const [messages, setMessages] = useState<Message[]>([]);

  // Connection / UI states
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any | null>(null);

  // Agent list and selection
  const [agents, setAgents] = useState<any[]>([]); // adjust type to your structure
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  // For creating a new agent in the modal
  const [open, setOpen] = useState(false); // Controls the Dialog (modal)
  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  // ... other fields if needed (temperature, memory_window, etc.)

  // ----------- SPEECH RECOGNITION -----------
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
    recognition.interimResults = true; // enable interim (live) results
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      // Update live transcript display
      setInterimTranscript(interim);
      if (final) {
        sendMessage(final);
        setInterimTranscript("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      toast.error("Speech recognition error: " + event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  // ----------- LOAD AGENTS -----------
  useEffect(() => {
    async function loadAgents() {
      try {
        // Suppose you have an API route GET /api/agents to list all
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

  // ----------- CREATE AGENT -----------
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
        console.log("error in create-agent route", err);
        throw new Error(err.error || "Failed to create agent");
      }
      const newAgent = await res.json();
      console.log("new agent", newAgent);
      toast.success("Agent created successfully!");
      // Update local state
      setAgents((prev) => [...prev, newAgent]);
      // Optionally select the newly created agent
      setSelectedAgentId(newAgent.id);
      // Close the modal and reset fields
      setOpen(false);
      setAgentName("");
      setAgentDescription("");
      setAgentPrompt("");
    } catch (error: any) {
      toast.error("Error creating agent: " + error.message);
    }
  };

  // ----------- CONNECT / INITIATE WEBSOCKET -----------
  const connectWebSocket = async (initialQuestion: string) => {
    if (!selectedAgentId) {
      toast.error("No agent selected.");
      return;
    }
    setIsConnecting(true);

    try {
      const res = await fetch("/api/agent-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgentId,
          question: initialQuestion,
        }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const { wsUrl } = data;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsConnecting(false);
        if (initialQuestion.trim()) {
          socket.send(JSON.stringify({ question: initialQuestion }));
          setMessages((prev) => [
            ...prev,
            { role: "user", text: initialQuestion },
          ]);
        }
      };

      // ---------- STREAMING RESPONSE ----------
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "partial") {
            // Partial token
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === "agent") {
                return [
                  ...prev.slice(0, -1),
                  { role: "agent", text: lastMsg.text + msg.token },
                ];
              } else {
                return [...prev, { role: "agent", text: msg.token }];
              }
            });
          } else if (msg.type === "final") {
            // Final chunk of text
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === "agent") {
                return [
                  ...prev.slice(0, -1),
                  { role: "agent", text: lastMsg.text + (msg.token || "") },
                ];
              } else {
                return [...prev, { role: "agent", text: msg.token }];
              }
            });
          } else {
            // Fallback if message is plain
            if (msg.answer) {
              setMessages((prev) => [
                ...prev,
                { role: "agent", text: msg.answer },
              ]);
            }
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
      setIsConnecting(false);
      toast.error("Failed to connect to the agent", {
        description: err.message,
      });
    }
  };

  // ----------- SEND MESSAGE -----------
  const sendMessage = (messageText: string) => {
    if (!messageText.trim()) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // No active session -> initialize one with the first question
      connectWebSocket(messageText);
    } else {
      ws.send(JSON.stringify({ question: messageText }));
      setMessages((prev) => [...prev, { role: "user", text: messageText }]);
    }
  };

  // ----------- SPEECH TOGGLE -----------
  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Error starting speech recognition:", err);
      }
    }
  };

  return (
    <div className="border-t mt-4 pt-4">
      {/* ----- TOP RIGHT CONTROLS: Select Agent & Create Agent Modal ----- */}
      <div className="flex justify-end items-center mb-4 gap-4">
        {/* Agent Selector using Shadcn Select */}
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

        {/* Modal (Dialog) for Creating a New Agent */}
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
              {/* If you have Label + Input components from Shadcn, use them. Otherwise, plain HTML inputs are fine. */}
              {/* <Label htmlFor="agentName">Agent Name</Label> */}
              <input
                id="agentName"
                type="text"
                placeholder="Agent Name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="border rounded p-1 text-sm"
              />

              {/* <Label htmlFor="agentDescription">Description</Label> */}
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
              {/* Additional fields if needed */}
            </div>

            <DialogFooter>
              <Button onClick={handleCreateAgent}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ----- Chat UI ----- */}
      <h4 className="text-sm font-medium mb-2">Talk to the selected agent</h4>
      <div className="h-32 overflow-y-auto bg-gray-100 p-2 rounded mb-2">
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
      <div className="flex items-center gap-2">
        <Button onClick={toggleListening} disabled={isConnecting}>
          {isListening ? "Stop Listening" : "Speak"}
        </Button>
        {isListening && (
          <span className="text-sm text-green-600">Listening...</span>
        )}
      </div>

      {/* Simple input to type a message manually */}
      {/* <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Type your message"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = "";
            }
          }}
          className="border p-1 flex-1"
        />
        <Button
          onClick={() => {
            const input = document.querySelector(
              'input[placeholder="Type your message"]'
            ) as HTMLInputElement;
            if (input.value.trim()) {
              sendMessage(input.value);
              input.value = "";
            }
          }}
        >
          Send
        </Button>
      </div> */}
    </div>
  );
}
