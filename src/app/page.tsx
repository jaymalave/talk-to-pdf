import { PdfViewer } from "@/components/pdf-viewer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">
          PDF Viewer & Reader
        </h1>
        <p className="text-muted-foreground">
          Upload, view, search, and listen to PDF documents with customizable
          voice options.
        </p>
        <PdfViewer />
      </main>
    </div>
  );
}
