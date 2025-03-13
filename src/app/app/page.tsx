import { PdfViewer } from "@/components/pdf-viewer";

export default function AppPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-3 px-4 md:px-6 lg:px-8 max-h-[90vh] overflow-y-auto border border-border rounded-lg mt-10">
        <PdfViewer />
      </main>
    </div>
  );
}
