import { PdfViewer } from "@/components/pdf-viewer";

export default function AppPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">AutoPDF</h1>
        <p className="text-muted-foreground">Talk to your PDF documents</p>
        <PdfViewer />
      </main>
    </div>
  );
}
