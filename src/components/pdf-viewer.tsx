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
import * as PlayHT from "playht";

// If you have pdf.worker.js in /public:
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

export function PdfViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [docUrl, setDocUrl] = useState<string>(""); // object URL
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pdfText, setPdfText] = useState<string>("");
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjs.PDFDocumentProxy | null>(
    null
  );
  const [selectedVoice, setSelectedVoice] = useState<string>(
    "s3://voice-cloning-zero-shot/801a663f-efd0-4254-98d0-5c175514c3e8/jennifer/manifest.json"
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate/Revoke the object URL whenever `file` changes
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

  // When the page changes, stop any playing audio.
  useEffect(() => {
    if (audio) {
      audio.pause();
      setIsPlaying(false);
      setAudio(null);
      setAudioProgress(0);
    }
  }, [pageNumber]);

  // ---------------- PDF Handlers ----------------
  function onDocumentLoadSuccess(document: pdfjs.PDFDocumentProxy) {
    try {
      console.log("Document loaded successfully");
      setNumPages(document.numPages);
      setPageNumber(1);
      setIsLoading(false);
      setPdfDocument(document);

      // Extract full text and per-page text
      extractTextFromPdf(document, document.numPages);
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error("Error loading PDF", {
        description:
          "There was a problem loading your document. Please try again.",
      });
    }
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    toast.error("Error loading PDF", {
      description:
        "There was a problem loading your document. Please try again.",
    });
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
      console.log("Extracted PDF text:", fullText);
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
    }
  }

  // ---------------- File Handling ----------------
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files && files[0]) {
      setIsLoading(true);
      setFile(files[0]);

      // Reset search, text and audio
      setSearchText("");
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      setPdfText("");
      setPageTexts([]);
      if (audio) {
        audio.pause();
        setIsPlaying(false);
        setAudio(null);
      }
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setIsLoading(true);
      setFile(event.dataTransfer.files[0]);

      // Reset search, text and audio
      setSearchText("");
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      setPdfText("");
      setPageTexts([]);
      if (audio) {
        audio.pause();
        setIsPlaying(false);
        setAudio(null);
      }
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
    setSearchText("");
    setSearchResults([]);
    setCurrentSearchIndex(-1);
    setPdfDocument(null);
    if (audio) {
      audio.pause();
      setIsPlaying(false);
      setAudio(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // ---------------- Pages & Zoom ----------------
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

  // ---------------- Searching ----------------
  async function handleSearch() {
    if (!searchText.trim() || !pdfDocument) return;
    setIsSearching(true);

    try {
      const results: any[] = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        if (pageText.toLowerCase().includes(searchText.toLowerCase())) {
          results.push({
            pageNumber: i,
            text: pageText,
          });
        }
      }

      setSearchResults(results);

      if (results.length > 0) {
        setCurrentSearchIndex(0);
        setPageNumber(results[0].pageNumber);
        toast.success(`Found ${results.length} matches for "${searchText}"`);
      } else {
        toast.error(`No matches found for "${searchText}"`);
      }
    } catch (error) {
      console.error("Error searching PDF:", error);
      toast.error("There was a problem searching the document.");
    } finally {
      setIsSearching(false);
    }
  }

  function navigateSearch(direction: "next" | "prev") {
    if (searchResults.length === 0) return;
    let newIndex = currentSearchIndex;
    if (direction === "next") {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex =
        (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    setCurrentSearchIndex(newIndex);
    setPageNumber(searchResults[newIndex].pageNumber);
  }

  // -------------- Text-to-Speech -------------
  // Implementation of PlayHT API to generate audio for given text
  const fetchTTS = async (text: string) => {
    setAudioProgress(10);
    try {
      // Check if we have text to generate audio for
      if (!text || text.trim() === "") {
        throw new Error("No text available to generate audio");
      }

      // Prepare the API request payload
      const payload = {
        text: text,
        voice: selectedVoice, // Use the selected voice
        output_format: "mp3",
        voice_engine: "PlayDialog",
      };

      setAudioProgress(20);

      // Client-side code
      try {
        // Call your own proxy endpoint instead of Play.HT directly
        const response = await fetch("/api/fetch-tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        // Create a blob from the audio stream
        const blob = await response.blob();

        // Create a URL for the blob
        const audioUrl = URL.createObjectURL(blob);

        // Play the audio or set it as the source of an audio element
        const audioElement = new Audio(audioUrl);

        setAudioProgress(100);
        toast.success("Audio generated successfully");
        audioElement.play();

        // Alternatively, update an existing audio element
        // document.getElementById('audioPlayer').src = audioUrl;
      } catch (error) {
        console.error("Failed to convert text to speech:", error);
      }
    } catch (error) {
      console.error("Error generating audio with PlayHT:", error);
      toast.error("Failed to generate audio", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
      setAudioProgress(0);
      throw error;
    }
  };

  // // Generate audio for the current page's text and play it.
  // async function handleGenerateAudioForCurrentPage() {
  //   if (!pageTexts[pageNumber - 1]) {
  //     toast.error("No text available for this page.");
  //     return;
  //   }

  //   if (audio) {
  //     audio.pause();
  //     setIsPlaying(false);
  //     setAudio(null);
  //   }

  //   setIsGeneratingAudio(true);
  //   setAudioProgress(0);

  //   try {
  //     const audioUrl = await fetchTTS(pageTexts[pageNumber - 1]);
  //     const newAudio = new Audio(audioUrl);

  //     // Set up event listeners
  //     newAudio.onended = () => setIsPlaying(false);
  //     newAudio.onpause = () => setIsPlaying(false);
  //     newAudio.onplay = () => setIsPlaying(true);

  //     // Store the audio element
  //     setAudio(newAudio);

  //     // Start playing
  //     await newAudio.play();
  //     setIsPlaying(true);
  //     toast.success(`Playing audio for page ${pageNumber}`);
  //   } catch (error) {
  //     console.error("Error generating or playing audio:", error);
  //     toast.error("Error generating audio.");
  //   } finally {
  //     setIsGeneratingAudio(false);
  //   }
  // }

  const handleGenerateAudioForCurrentPage = async () => {
    if (!pageTexts[pageNumber - 1]) {
      toast.error("No text available for this page.");
      return;
    }
    try {
      await fetchTTS(pageTexts[pageNumber - 1]);
    } catch (error) {
      console.error("Error generating audio:", error);
      toast.error("Error generating audio.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  function togglePlayPause() {
    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    }
  }

  // Handle voice selection from the VoiceSelector component
  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden">
      {/* LEFT SIDE: PDF Viewer */}
      <div className="flex-1 max-h-[75%] overflow-hidden flex flex-col max-w-[45%]">
        {/* If no file, show upload prompt */}
        {!file ? (
          <div
            className="flex-1 border-2 border-dashed border-border rounded-lg my-4 mr-4 p-12 text-center hover:border-primary/50 transition-colors"
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
          // Else show the PDF viewer
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header Row */}
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

            {/* PDF Controls */}
            <div className="flex flex-wrap items-center justify-between p-2 border-b bg-muted/50">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
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

              {/* Page Navigation */}
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

            {/* Main PDF Display */}
            <div
              className={cn(
                "flex-1 flex justify-center bg-muted/30",
                isLoading ? "items-center" : "items-start"
              )}
              style={{ overflow: "scroll" }} // No scrolling
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

      {/* RIGHT SIDE: Text-to-Speech Panel */}
      <div className="h-[75%] overflow-hidden px-8 flex flex-col max-w-[45%] w-full">
        {/* Title */}
        <div className="flex items-center mb-4">
          <Volume2 className="mr-2 h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Text-to-Speech</h3>
        </div>

        {/* Voice Selector & Audio Controls */}
        <VoiceSelector />
        <div className="flex flex-col gap-2 mt-4">
          <AudioControls />

          {/* Generation Progress */}
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

        <div className="flex gap-2 mt-4">
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
            disabled={isGeneratingAudio || !audio}
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
      </div>
    </div>
  );
}
