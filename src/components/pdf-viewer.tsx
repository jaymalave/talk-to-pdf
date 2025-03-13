"use client";
import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  ZoomIn,
  ZoomOut,
  X,
  FileText,
  Loader2,
  Play,
  Pause,
  Volume2,
} from "lucide-react";
import { VoiceSelector } from "@/components/voice-selector";
import { AudioControls } from "@/components/audio-controls";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import { AgentChat } from "./agent-chat";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

export function PdfViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [docUrl, setDocUrl] = useState<string>("");
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pdfText, setPdfText] = useState<string>("");
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjs.PDFDocumentProxy | null>(
    null
  );
  const [speed, setSpeed] = useState<number>(1);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [selectedVoice, setSelectedVoice] = useState<string>(
    "s3://voice-cloning-zero-shot/801a663f-efd0-4254-98d0-5c175514c3e8/jennifer/manifest.json"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!file) {
      setDocUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setDocUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const audio = new Audio();
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setAudioProgress(100);
    });
    audio.addEventListener("timeupdate", () => {
      if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        setAudioProgress(Math.round(progress));
      }
    });
    audio.addEventListener("error", () => {
      setIsPlaying(false);
      toast.error("Audio playback error", {
        description: "There was a problem playing the audio. Please try again.",
      });
    });
    audioRef.current = audio;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    stopAudio();
  }, [pageNumber]);

  function onDocumentLoadSuccess(document: pdfjs.PDFDocumentProxy) {
    setNumPages(document.numPages);
    setPageNumber(1);
    setIsLoading(false);
    setPdfDocument(document);
    extractTextFromPdf(document, document.numPages);
  }

  function onDocumentLoadError() {
    setIsLoading(false);
    setFile(null);
  }

  async function extractTextFromPdf(
    pdfDoc: pdfjs.PDFDocumentProxy,
    totalPages: number
  ) {
    try {
      let fullText = "";
      const texts: string[] = [];
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        texts.push(pageText);
        fullText += pageText + `\n\n--- Page ${i} ---\n\n`;
      }
      setPdfText(fullText);
      setPageTexts(texts);
    } catch (error) {}
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files && files[0]) {
      setIsLoading(true);
      setFile(files[0]);
      setPdfText("");
      setPageTexts([]);
      stopAudio();
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setIsLoading(true);
      setFile(event.dataTransfer.files[0]);
      setPdfText("");
      setPageTexts([]);
      stopAudio();
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function clearFile() {
    setFile(null);
    setNumPages(0);
    setPageNumber(1);
    setPdfText("");
    setPageTexts([]);
    setPdfDocument(null);
    stopAudio();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number.parseInt(e.target.value);
    if (!isNaN(value)) {
      handlePageChange(value);
    }
  }

  function handleZoom(delta: number) {
    setScale((prevScale) => {
      const newScale = prevScale + delta;
      return Math.min(Math.max(0.5, newScale), 2.5);
    });
  }

  function stopAudio() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsPlaying(false);
    setAudioProgress(0);
  }

  const fetchTTS = async (text: string) => {
    setIsGeneratingAudio(true);
    try {
      if (!text || text.trim() === "") {
        throw new Error("No text available to generate audio");
      }
      stopAudio();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const payload = {
        text,
        voice: selectedVoice,
        model: "PlayDialog",
        speed,
        temperature,
      };
      const response = await fetch("/api/fetch-tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (playError) {
          toast.error("Error starting playback");
        }
      }
      setAudioProgress(100);
      toast.success("Audio generated successfully");
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Failed to generate audio", {
          description: error.message || "Unknown error occurred",
        });
      }
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleGenerateAudioForCurrentPage = async () => {
    setIsGeneratingAudio(true);
    stopAudio();
    if (!pageTexts[pageNumber - 1]) {
      toast.error("No text available for this page.");
      return;
    }
    try {
      setIsGeneratingAudio(true);
      await fetchTTS(pageTexts[pageNumber - 1]);
    } catch (error) {
      toast.error("Error generating audio.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  function togglePlayPause() {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        toast.error("Could not play audio");
      });
    }
  }

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
  };

  return (
    <div className="flex flex-col md:flex-row w-full min-h-screen overflow-auto">
      <div className="md:w-[55%] w-full overflow-auto flex flex-col p-4">
        {!file ? (
          <div
            className="flex-1 border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Upload your PDF</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag and drop your file here or click to browse
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2"
              >
                <Upload className="mr-2 h-4 w-4" />
                Select PDF
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between p-2 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">
                  {file.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFile}
                aria-label="Clear PDF"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between p-2 border-b bg-muted/50">
              <div className="flex items-center gap-1 mb-2 sm:mb-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleZoom(-0.1)}
                  disabled={scale <= 0.5}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs px-2">{Math.round(scale * 100)}%</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleZoom(0.1)}
                  disabled={scale >= 2.5}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(pageNumber - 1)}
                  disabled={pageNumber <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-1">
                  <Input
                    type="number"
                    min={1}
                    max={numPages}
                    value={pageNumber}
                    onChange={handleInputChange}
                    className="w-14 h-8 text-center"
                    aria-label="Page number"
                  />
                  <span className="text-xs text-muted-foreground">
                    of {numPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(pageNumber + 1)}
                  disabled={pageNumber >= numPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div
              className={cn(
                "flex-1 flex justify-center bg-muted/30",
                isLoading ? "items-center" : "items-start"
              )}
              style={{ overflow: "auto" }}
            >
              {docUrl ? (
                <Document
                  file={docUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex flex-col items-center gap-2">
                      <Skeleton className="h-[500px] w-[350px]" />
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading={<Skeleton className="h-[500px] w-[350px]" />}
                  />
                </Document>
              ) : null}
            </div>
          </div>
        )}
      </div>
      <div className="md:w-[45%] w-full overflow-auto px-4 sm:px-8 flex flex-col py-4">
        <VoiceSelector
          selectedVoice={selectedVoice}
          setSelectedVoice={handleVoiceChange}
        />
        <div className="flex flex-col gap-2 mt-4">
          <AudioControls
            speed={speed}
            setSpeed={setSpeed}
            temperature={temperature}
            setTemperature={setTemperature}
          />
          <div className="mt-4">
            <span className="text-sm font-medium">Generation Progress</span>
            {audioProgress > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                {audioProgress}%
              </span>
            )}
            <Progress value={audioProgress} className="h-2 mt-1" />
          </div>
        </div>
        <audio ref={audioRef} style={{ display: "none" }} />
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            onClick={handleGenerateAudioForCurrentPage}
            disabled={isGeneratingAudio || !pageTexts[pageNumber - 1]}
            className="flex-1"
          >
            {isGeneratingAudio ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>Generate Audio for Page {pageNumber}</>
            )}
          </Button>
          <Button
            variant={isPlaying ? "destructive" : "outline"}
            onClick={togglePlayPause}
            disabled={!audioUrl}
            className="flex-1"
          >
            {isPlaying ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Play
              </>
            )}
          </Button>
        </div>
        <AgentChat context={pageTexts[pageNumber - 1] || ""} />
      </div>
    </div>
  );
}
