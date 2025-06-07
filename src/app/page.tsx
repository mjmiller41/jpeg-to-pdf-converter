
"use client";

import { useState, useCallback, DragEvent, ChangeEvent, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadCloud, Download, Image as ImageIcon, Loader2, FileText, Trash2 } from 'lucide-react';
import NextImage from 'next/image';
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";

export default function JpegToPdfPage() {
  const [jpegFile, setJpegFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (file && file.type === 'image/jpeg') {
      setJpegFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast({ title: "File Selected", description: `${file.name} is ready for conversion.` });
    } else {
      setJpegFile(null);
      setPreviewUrl(null);
      toast({ variant: "destructive", title: "Invalid File", description: "Please upload a valid JPEG file." });
    }
  }, [toast]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input to allow uploading the same file again
    if(event.target) {
      event.target.value = "";
    }
  };

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleRemoveFile = () => {
    setJpegFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input
    }
    toast({ title: "File Cleared", description: "You can now upload a new file." });
  };

  const convertToPdf = async () => {
    if (!jpegFile || !previewUrl) {
      toast({ variant: "destructive", title: "No File", description: "Please select a JPEG file first." });
      return;
    }

    setIsConverting(true);

    try {
      const pdf = new jsPDF({
        orientation: 'p', // portrait
        unit: 'pt', // points
        format: 'a4' // A4 page size
      });
      const img = document.createElement('img');
      
      img.onload = () => {
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        
        const pageData = pdf.internal.pageSize;
        const pageWidth = pageData.getWidth();
        const pageHeight = pageData.getHeight();

        // Calculate aspect ratio to fit image within PDF page margins (e.g. 20pt margin)
        const margin = 40; // 20pt on each side
        const usableWidth = pageWidth - margin;
        const usableHeight = pageHeight - margin;
        
        let newWidth, newHeight;
        const imgRatio = imgWidth / imgHeight;
        const pageRatio = usableWidth / usableHeight;

        if (imgRatio > pageRatio) {
            newWidth = usableWidth;
            newHeight = newWidth / imgRatio;
        } else {
            newHeight = usableHeight;
            newWidth = newHeight * imgRatio;
        }
        
        const x = (pageWidth - newWidth) / 2;
        const y = (pageHeight - newHeight) / 2;

        pdf.addImage(img.src, 'JPEG', x, y, newWidth, newHeight);
        pdf.save(`${jpegFile.name.replace(/\.[^/.]+$/, "")}.pdf`);
        
        toast({ title: "Conversion Successful", description: `${jpegFile.name} has been converted and downloaded.` });
        
        // Optionally reset after successful conversion
        // handleRemoveFile(); 
      };
      
      img.onerror = () => {
        toast({ variant: "destructive", title: "Image Load Error", description: "Failed to load image for PDF conversion." });
      };
      
      img.src = previewUrl;

    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Conversion Error", description: "An unexpected error occurred during PDF conversion." });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <Card className="w-full max-w-lg shadow-2xl rounded-xl overflow-hidden">
        <CardHeader className="bg-primary/10 p-6">
          <div className="flex items-center space-x-3">
            <FileText className="w-10 h-10 text-primary" />
            <div>
              <CardTitle className="text-2xl md:text-3xl font-headline text-primary">JPEG to PDF Converter</CardTitle>
              <CardDescription className="text-foreground/80">
                Upload your JPEG file to convert it to a PDF document seamlessly.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {!previewUrl ? (
            <label
              htmlFor="file-upload"
              className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer 
                         ${isDragging ? 'border-primary bg-primary/10' : 'border-primary/30 hover:border-primary hover:bg-primary/5'} 
                         transition-all duration-200 ease-in-out`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <UploadCloud className={`w-12 h-12 mb-4 ${isDragging ? 'text-primary' : 'text-primary/70'}`} />
                <p className="mb-2 text-base font-semibold text-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">JPEG files only. Max 10MB.</p>
              </div>
              <Input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                onChange={handleFileChange} 
                accept="image/jpeg"
                ref={fileInputRef}
              />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-primary/20 shadow-inner bg-muted/20">
                <NextImage 
                  src={previewUrl} 
                  alt="Preview" 
                  fill 
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRemoveFile} 
                  className="absolute top-2 right-2 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full backdrop-blur-sm"
                  aria-label="Remove file"
                >
                  <Trash2 className="w-5 h-5 text-destructive/70 hover:text-destructive-foreground" />
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={convertToPdf} 
                  disabled={isConverting} 
                  className="flex-1 py-3 text-base group"
                  size="lg"
                >
                  {isConverting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:scale-110" />
                  )}
                  {isConverting ? 'Converting...' : 'Convert & Download PDF'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-6 bg-secondary/20 border-t">
            <p className="text-xs text-center text-muted-foreground w-full">
                Your files are processed locally in your browser and are never uploaded to any server.
            </p>
        </CardFooter>
      </Card>
       <footer className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} JPEGtoPDF. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
