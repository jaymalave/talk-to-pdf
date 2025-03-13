// components/AgentChat.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const recognitionRef = useRef<any | null>(null);

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
        // When a final result is available, send it as a message
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

  const connectWebSocket = async (initialQuestion: string) => {
    setIsConnecting(true);
    try {
      // Initialize the agent session via the backend API
      const res = await fetch("/api/agent-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, question: initialQuestion }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      const { wsUrl } = data;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsConnecting(false);
        // Optionally send the initial question immediately
        socket.send(JSON.stringify({ question: initialQuestion }));
        setMessages((prev) => [
          ...prev,
          { role: "user", text: initialQuestion },
        ]);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Assume the agent's answer is in message.answer
          setMessages((prev) => [
            ...prev,
            { role: "agent", text: message.answer },
          ]);
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

  const sendMessage = (messageText: string) => {
    if (!messageText.trim()) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // If there's no active session, initialize one with the first question.
      connectWebSocket(messageText);
    } else {
      ws.send(JSON.stringify({ question: messageText }));
      setMessages((prev) => [...prev, { role: "user", text: messageText }]);
    }
  };

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
      <h4 className="text-sm font-medium mb-2">Talk to the current page</h4>
      <div className="h-20 overflow-y-auto bg-gray-100 p-2 rounded mb-2">
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
    </div>
  );
}
