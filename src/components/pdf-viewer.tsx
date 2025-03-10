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
  Search,
  Volume2,
  Play,
  Pause,
} from "lucide-react";
import { VoiceSelector } from "@/components/voice-selector";
import { AudioControls } from "@/components/audio-controls";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

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
  const [searchText, setSearchText] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [pdfDocument, setPdfDocument] = useState<pdfjs.PDFDocumentProxy | null>(
    null
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

  // ---------------- PDF Handlers ----------------
  function onDocumentLoadSuccess(document: pdfjs.PDFDocumentProxy) {
    try {
      console.log("Document loaded successfully");
      setNumPages(document.numPages);
      setPageNumber(1);
      setIsLoading(false);
      setPdfDocument(document);

      // Optionally extract full text
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
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + `\n\n--- Page ${i} ---\n\n`;
      }
      setPdfText(fullText);
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

      // Reset search and text
      setSearchText("");
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      setPdfText("");
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setIsLoading(true);
      setFile(event.dataTransfer.files[0]);

      // Reset search and text
      setSearchText("");
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      setPdfText("");
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
    setSearchText("");
    setSearchResults([]);
    setCurrentSearchIndex(-1);
    setPdfDocument(null);
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
  function handleGenerateAudio() {
    if (!pdfText) {
      toast.error("Please upload a PDF first.");
      return;
    }
    setIsGeneratingAudio(true);
    setAudioProgress(0);

    const interval = setInterval(() => {
      setAudioProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGeneratingAudio(false);
          setIsPlaying(true);
          toast.success("Audio generated");
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  }

  function togglePlayPause() {
    setIsPlaying(!isPlaying);
  }

  // ---------------------------------------------
  // LAYOUT: horizontal, no scrolling
  // ---------------------------------------------
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

              {/* Search Controls */}
              <div className="flex items-center gap-1">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-8 h-8 w-[150px] sm:w-[200px]"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearch}
                  disabled={isSearching || !searchText.trim()}
                  className="h-8"
                >
                  {isSearching ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Find"
                  )}
                </Button>
                {searchResults.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigateSearch("prev")}
                      className="h-8 w-8"
                      aria-label="Previous result"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-xs">
                      {currentSearchIndex + 1}/{searchResults.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigateSearch("next")}
                      className="h-8 w-8"
                      aria-label="Next result"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Main PDF Display */}
            <div
              className={cn(
                "flex-1 flex justify-center bg-muted/30",
                isLoading ? "items-center" : "items-start"
              )}
              style={{ overflow: "hidden" }} // No scrolling
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Loading PDF...
                  </p>
                </div>
              ) : docUrl ? (
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
      <div className="h-[75%] overflow-hidden p-4 flex flex-col max-w-[45%] w-full">
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
            onClick={handleGenerateAudio}
            disabled={isGeneratingAudio || !pdfText}
            className="flex-1"
          >
            {isGeneratingAudio ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>Generate Audio</>
            )}
          </Button>
          <Button
            variant={isPlaying ? "destructive" : "outline"}
            onClick={togglePlayPause}
            disabled={isGeneratingAudio || audioProgress < 100}
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
