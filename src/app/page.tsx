
"use client";

import { useState, useCallback, DragEvent, ChangeEvent, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadCloud, Download, Image as ImageIcon, Loader2, FileText, Trash2, Repeat } from 'lucide-react';
import NextImage from 'next/image';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { useToast } from "@/hooks/use-toast";

type ConversionMode = 'jpegToPdf' | 'pdfToJpeg';

export default function ConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jpegPreviewUrl, setJpegPreviewUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [conversionMode, setConversionMode] = useState<ConversionMode>('jpegToPdf');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set workerSrc for pdfjs-dist. This is required for the library to work.
    // Using a CDN version of the worker.
    // Ensure the version matches the installed pdfjs-dist version if issues arise.
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }, []);

  const processFile = useCallback((file: File) => {
    if (!file) return;

    if (conversionMode === 'jpegToPdf') {
      if (file.type === 'image/jpeg') {
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setJpegPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
        toast({ title: "JPEG File Selected", description: `${file.name} is ready for PDF conversion.` });
      } else {
        setSelectedFile(null);
        setJpegPreviewUrl(null);
        toast({ variant: "destructive", title: "Invalid File", description: "Please upload a valid JPEG file." });
      }
    } else { // pdfToJpeg mode
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setJpegPreviewUrl(null); // Clear any JPEG preview
        toast({ title: "PDF File Selected", description: `${file.name} is ready for JPEG conversion.` });
      } else {
        setSelectedFile(null);
        toast({ variant: "destructive", title: "Invalid File", description: "Please upload a valid PDF file." });
      }
    }
  }, [conversionMode, toast]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
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
    setSelectedFile(null);
    setJpegPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast({ title: "File Cleared", description: "You can now upload a new file." });
  };

  const convertToPdf = async () => {
    if (!selectedFile || !jpegPreviewUrl) {
      toast({ variant: "destructive", title: "No File", description: "Please select a JPEG file first." });
      return;
    }

    setIsConverting(true);
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const img = document.createElement('img');
      
      img.onload = () => {
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        
        const pageData = pdf.internal.pageSize;
        const pageWidth = pageData.getWidth();
        const pageHeight = pageData.getHeight();
        const margin = 40;
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
        pdf.save(`${selectedFile.name.replace(/\.[^/.]+$/, "")}.pdf`);
        toast({ title: "Conversion Successful", description: `${selectedFile.name} has been converted to PDF and downloaded.` });
      };
      
      img.onerror = () => {
        toast({ variant: "destructive", title: "Image Load Error", description: "Failed to load image for PDF conversion." });
      };
      
      img.src = jpegPreviewUrl;

    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "PDF Conversion Error", description: "An unexpected error occurred." });
    } finally {
      setIsConverting(false);
    }
  };

  const convertToJpeg = async () => {
    if (!selectedFile) {
      toast({ variant: "destructive", title: "No File", description: "Please select a PDF file first." });
      return;
    }
    setIsConverting(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdfDoc.getPage(1); // Convert first page
      
      const viewport = page.getViewport({ scale: 2.0 }); // Adjust scale for quality/size
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (!context) {
        throw new Error("Could not get canvas context");
      }

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9); // Adjust quality (0.0 to 1.0)
      
      const link = document.createElement('a');
      link.href = jpegDataUrl;
      link.download = `${selectedFile.name.replace(/\.[^/.]+$/, "")}_page1.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Conversion Successful", description: `First page of ${selectedFile.name} converted to JPEG and downloaded.` });

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      toast({ variant: "destructive", title: "JPEG Conversion Error", description: `Failed to convert PDF to JPEG. ${errorMessage}` });
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvert = () => {
    if (conversionMode === 'jpegToPdf') {
      convertToPdf();
    } else {
      convertToJpeg();
    }
  };

  const pageTitle = conversionMode === 'jpegToPdf' ? "JPEG to PDF Converter" : "PDF to JPEG Converter";
  const pageDescription = conversionMode === 'jpegToPdf' 
    ? "Upload your JPEG file to convert it to a PDF document seamlessly."
    : "Upload your PDF file to convert its first page to a JPEG image.";
  const inputAccept = conversionMode === 'jpegToPdf' ? "image/jpeg" : "application/pdf";
  const dropzoneHint = conversionMode === 'jpegToPdf' ? "JPEG files only. Max 10MB." : "PDF files only. Max 10MB.";
  const buttonText = conversionMode === 'jpegToPdf' ? "Convert & Download PDF" : "Convert & Download JPEG";
  const showJpegPreview = conversionMode === 'jpegToPdf' && jpegPreviewUrl && selectedFile;
  const showPdfPreview = conversionMode === 'pdfToJpeg' && selectedFile;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <Card className="w-full max-w-lg shadow-2xl rounded-xl overflow-hidden">
        <CardHeader className="bg-primary/10 p-6">
          <div className="flex items-center space-x-3">
            <Repeat className="w-10 h-10 text-primary" /> {/* Generic conversion icon */}
            <div>
              <CardTitle className="text-2xl md:text-3xl font-headline text-primary">{pageTitle}</CardTitle>
              <CardDescription className="text-foreground/80">{pageDescription}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-center space-x-2 mb-4">
            <Button 
              variant={conversionMode === 'jpegToPdf' ? 'default' : 'outline'} 
              onClick={() => { setConversionMode('jpegToPdf'); handleRemoveFile();}}
              className="flex-1"
            >
              JPEG to PDF
            </Button>
            <Button 
              variant={conversionMode === 'pdfToJpeg' ? 'default' : 'outline'} 
              onClick={() => { setConversionMode('pdfToJpeg'); handleRemoveFile();}}
              className="flex-1"
            >
              PDF to JPEG
            </Button>
          </div>

          {!selectedFile ? (
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
                <p className="text-xs text-muted-foreground">{dropzoneHint}</p>
              </div>
              <Input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                onChange={handleFileChange} 
                accept={inputAccept}
                ref={fileInputRef}
              />
            </label>
          ) : (
            <div className="space-y-4">
              {showJpegPreview && jpegPreviewUrl && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-primary/20 shadow-inner bg-muted/20">
                  <NextImage 
                    src={jpegPreviewUrl} 
                    alt="Preview" 
                    fill 
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}
              {showPdfPreview && selectedFile && (
                <div className="flex flex-col items-center justify-center p-4 border-2 border-primary/20 rounded-lg bg-muted/20 shadow-inner">
                  <FileText className="w-16 h-16 text-primary/70 mb-3" />
                  <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{ (selectedFile.size / 1024 / 1024).toFixed(2) } MB</p>
                </div>
              )}
               <div className="flex items-center justify-between">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRemoveFile} 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Remove file"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                  </Button>
                </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleConvert} 
                  disabled={isConverting} 
                  className="flex-1 py-3 text-base group"
                  size="lg"
                >
                  {isConverting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:scale-110" />
                  )}
                  {isConverting ? 'Converting...' : buttonText}
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
          &copy; {new Date().getFullYear()} FileConverter. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

