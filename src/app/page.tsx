"use client";

import { useState, useCallback, DragEvent, ChangeEvent, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadCloud, Download, Loader2, FileText, Trash2, Repeat } from 'lucide-react';
import NextImage from 'next/image';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { useToast } from "@/hooks/use-toast";
import JSZip from 'jszip';

type ConversionMode = 'jpgToPdf' | 'pdfToJpg';
export default function ConverterPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [jpegPreviewUrls, setJpegPreviewUrls] = useState<string[]>([]);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [conversionMode, setConversionMode] = useState<ConversionMode>('jpgToPdf');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedFiles([]);
    setJpegPreviewUrls([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const processFiles = useCallback((incomingFiles: File[] | FileList | null) => {
    handleClearSelection(); // Clear previous selection before processing new files
    if (!incomingFiles || incomingFiles.length === 0 ||
      (conversionMode === 'jpgToPdf' &&
        Array.from(incomingFiles).every(file => file.type !== 'image/jpeg')) ||
      (conversionMode === 'pdfToJpg' &&
        Array.from(incomingFiles).every(file => file.type !== 'application/pdf'))) {
      return;
    }

    const filesArray = Array.from(incomingFiles);
    let validFiles: File[] = [];

    let invalidFileMessages: string[] = [];

    if (conversionMode === 'jpgToPdf') {
      validFiles = filesArray.filter(file => file.type === 'image/jpeg');
      filesArray.forEach(file => {
        if (file.type !== 'image/jpeg') {
          invalidFileMessages.push(`${file.name}: Not a JPG file.`);
        }
      });

      if (validFiles.length > 0) {
        Promise.all(validFiles.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(new Error(`Failed to read ${file.name}`));
            reader.readAsDataURL(file);
          });
        }))
          .then(urls => {
            setJpegPreviewUrls(urls);
            setSelectedFiles(validFiles);
            if (invalidFileMessages.length > 0 && validFiles.length > 0) {
              toast({ variant: "destructive", title: "Some Files Invalid", description: invalidFileMessages.join(' ') + " Only JPEG files were kept." });
            } else {
              toast({ title: `${validFiles.length} JPEG(s) Selected`, description: `Ready for PDF conversion.` });
            }
          })
          .catch(error => {
            setJpegPreviewUrls([]);
            setSelectedFiles([]);
            toast({ variant: "destructive", title: "File Read Error", description: error.message });
          });
      } else {
        setJpegPreviewUrls([]);
        setSelectedFiles([]);
        if (invalidFileMessages.length > 0) {
          toast({ variant: "destructive", title: "Invalid Files", description: invalidFileMessages.join(' ') + " Please upload JPG files." });
        } else {
          toast({ variant: "destructive", title: "No JPG Files", description: "Please upload JPG files." });
        }
      }
    } else { // pdfToJpeg mode
      // Filter for valid PDF files
      validFiles = filesArray.filter(file => file.type === 'application/pdf');

      // Identify and collect messages for invalid files
      filesArray.forEach(file => {
        if (file.type !== 'application/pdf') {
          invalidFileMessages.push(`${file.name}: Not a PDF file.`);
        }
      });

      // Set selected files (only valid ones)
      setSelectedFiles(validFiles);

      if (validFiles.length > 0) {
        // Generate JPG previews for PDF files
        Promise.all(validFiles.map(async (file) => {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdfDoc.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 }); // Smaller scale for preview
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            if (!context) throw new Error('Could not get canvas context');
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            return canvas.toDataURL('image/jpeg');
          } catch (error) {
            console.error(`Error generating preview for ${file.name}:`, error);
            return ''; // Return empty string for failed previews
          }
        }))
          .then(urls => {
            setJpegPreviewUrls(urls);
            if (invalidFileMessages.length > 0) {
              toast({ variant: "destructive", title: "Some Files Invalid", description: invalidFileMessages.join(' ') + " Only PDF files were kept." });
            }
            toast({ title: `${validFiles.length} PDF(s) Selected`, description: `Ready for JPG conversion.` });
          })
          .catch(error => { // Catch potential errors from Promise.all
            toast({ variant: "destructive", title: "Preview Generation Error", description: error.message });
          });
      } else {
        if (invalidFileMessages.length > 0) {
          toast({ variant: "destructive", title: "Invalid Files", description: invalidFileMessages.join(' ') + " Please upload PDF files." });
        } else {
          toast({ variant: "destructive", title: "No PDF Files", description: "Please upload PDF files." });
        }
      }
    }
  }, [conversionMode, toast, handleClearSelection]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : null;
    processFiles(files);
  };

  const handleDrop = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    processFiles(event.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const confirmAndClearSelection = () => {
    handleClearSelection();
    toast({ title: "Selection Cleared", description: "You can now upload new files." });
  }

  const convertToPdf = async () => {
    if (selectedFiles.length === 0) {
      toast({ variant: "destructive", title: "No Valid Files", description: "Please select JPG file(s) first." });
      return;
    }

    setIsConverting(true);
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const margin = 40; // points
      const pageData = pdf.internal.pageSize;
      const pageWidth = pageData.getWidth();
      const pageHeight = pageData.getHeight();
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      const imageLoadPromises = jpegPreviewUrls.map(dataUrl => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = document.createElement('img');
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load one of the images for PDF conversion.`));
          img.src = dataUrl;
        });
      });

      const loadedImages = await Promise.all(imageLoadPromises);

      loadedImages.forEach((img, index) => {
        if (index > 0) {
          pdf.addPage();
        }

        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

        let newWidth, newHeight;
        const imgRatio = imgWidth / imgHeight;
        const pageRatio = usableWidth / usableHeight;

        if (imgRatio > pageRatio) { // Image is wider than page
          newWidth = usableWidth;
          newHeight = newWidth / imgRatio;
        } else { // Image is taller than page
          newHeight = usableHeight;
          newWidth = newHeight * imgRatio;
        }

        const x = (pageWidth - newWidth) / 2;
        const y = (pageHeight - newHeight) / 2;

        pdf.addImage(img, 'JPG', x, y, newWidth, newHeight);
      });

      const outputFileName = selectedFiles.length > 1 ? 'converted_images.pdf' : `${selectedFiles[0].name.replace(/\.[^/.]+$/, "")}.pdf`;
      pdf.save(outputFileName);
      toast({ title: "Conversion Successful", description: `${selectedFiles.length} JPG(s) have been converted to ${outputFileName} and downloaded.` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "PDF Conversion Error", description: e instanceof Error ? e.message : "An unexpected error occurred." });
    } finally {
      setIsConverting(false);
    }
  };

  const convertToJpg = async () => {
    if (selectedFiles.length === 0) {
      toast({ variant: "destructive", title: "No PDF Files", description: "Please select PDF file(s) first." });
      return;
    }
    setIsConverting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const zip = new JSZip();

      // Process all PDF files
      for (const file of selectedFiles) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const totalPages = pdfDoc.numPages;

          if (totalPages === 1 && selectedFiles.length === 1) {
            // Single page, single file - direct download without ZIP
            const page = await pdfDoc.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) throw new Error('Could not get canvas context');

            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;

            const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `${file.name.replace('.pdf', '')}.jpg`;
            link.click();

            successCount++;
            continue;
          }

          // Multiple pages or multiple files - add to ZIP
          if (totalPages > 1) {
            // Create folder for multi-page PDFs
            const folder = zip.folder(file.name.replace('.pdf', ''));

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
              const page = await pdfDoc.getPage(pageNum);
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              if (!context) throw new Error('Could not get canvas context');

              await page.render({
                canvasContext: context,
                viewport: viewport
              }).promise;

              const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
              const imageData = imageUrl.split(',')[1];
              folder?.file(`page-${pageNum}.jpg`, imageData, { base64: true });
            }
          } else {
            // Single page PDF - add directly to ZIP root
            const page = await pdfDoc.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) throw new Error('Could not get canvas context');

            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;

            const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
            const imageData = imageUrl.split(',')[1];
            zip.file(`${file.name.replace('.pdf', '')}.jpg`, imageData, { base64: true });
          }

          successCount++;
        } catch (fileError) {
          console.error(`Error converting ${file.name}:`, fileError);
          errorCount++;
        }
      }

      // Generate and download ZIP if we have multiple files or pages
      if (successCount > 0 && (selectedFiles.length > 1 || selectedFiles.some(async file => {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        return pdfDoc.numPages > 1;
      }))) {
        const content = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = zipUrl;

        // Create ZIP filename from first and last PDF names
        const zipName = selectedFiles.length > 1
          ? `${selectedFiles[0].name.replace('.pdf', '')}-${selectedFiles[selectedFiles.length - 1].name.replace('.pdf', '')}.zip`
          : `${selectedFiles[0].name.replace('.pdf', '')}-pages.zip`;

        link.download = zipName;
        link.click();
        URL.revokeObjectURL(zipUrl);
      }

      if (successCount > 0) {
        toast({
          title: "Conversion Complete",
          description: `${successCount} PDF(s) converted. ${errorCount > 0 ? `${errorCount} failed.` : ''}`
        });
      }
      if (errorCount > 0 && successCount === 0) {
        toast({
          variant: "destructive",
          title: "Conversion Failed",
          description: "All PDF to JPG conversions failed."
        });
      }

    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Conversion Error",
        description: e instanceof Error ? e.message : "An unexpected error occurred."
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvert = () => {
    if (conversionMode === 'jpgToPdf') {
      convertToPdf();
    } else { // pdfToJpeg
      convertToJpg();
    }
  };

  const handleModeSwitch = (newMode: ConversionMode) => {
    setConversionMode(newMode);
    confirmAndClearSelection(); // Clear selection when switching modes
  };

  // Helper function to read file as data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const pageTitle = conversionMode === 'jpgToPdf' ? "JPG to PDF Converter" : "PDF to JPG Converter";
  const pageDescription = conversionMode === 'jpgToPdf'
    ? "Upload JPG file(s) to convert them into a single PDF document."
    : "Upload PDF file(s) to convert the first page of each to a JPG image.";
  const inputAccept = conversionMode === 'jpgToPdf' ? "image/jpeg" : "application/pdf";
  const dropzoneMainText = "Click to upload file(s) or drag and drop";
  const dropzoneHint = conversionMode === 'jpgToPdf' ? "JPG files only. Max 10MB per file suggested." : "PDF files only. Max 10MB per file suggested.";

  const buttonText = conversionMode === 'jpgToPdf'
    ? "Convert & Download PDF"
    : (selectedFiles.length > 1 ? "Convert & Download JPEGs" : "Convert & Download JPEG");

  const showSingleJpegPreview = conversionMode === 'jpgToPdf' && selectedFiles.length === 1 && jpegPreviewUrls.length === 1;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <Card className="w-full max-w-lg shadow-2xl rounded-xl overflow-hidden">
        <CardHeader className="bg-primary/10 p-6">
          <div className="flex items-center space-x-3">
            <img className="w-20 h-20 text-primary" src="logo-64x64-transparent.png" alt="jpg to pdf image" />
            <div>
              <CardTitle className="text-2xl md:text-3xl font-headline text-primary">
                <h1>{pageTitle}</h1>
              </CardTitle>
              <CardDescription className="text-foreground/80">{pageDescription}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-center space-x-2 mb-4">
            <Button
              variant={conversionMode === 'jpgToPdf' ? 'default' : 'outline'}
              onClick={() => handleModeSwitch('jpgToPdf')}
              className="flex-1"
            >
              JPEG to PDF
            </Button>
            <Button
              variant={conversionMode === 'pdfToJpg' ? 'default' : 'outline'}
              onClick={() => handleModeSwitch('pdfToJpg')}
              className="flex-1"
            >
              PDF to JPEG
            </Button>
          </div>

          {selectedFiles.length === 0 ? (
            <label
              htmlFor="file-upload"
              className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer ${isDragging ? 'border-primary bg-primary/10' : 'border-primary/30 hover:border-primary hover:bg-primary/5'} transition-all duration-200 ease-in-out`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <UploadCloud className={`w-12 h-12 mb-4 ${isDragging ? 'text-primary' : 'text-primary/70'}`} />
                <p className="mb-2 text-base font-semibold text-foreground">
                  {dropzoneMainText}
                </p>
                <p className="text-xs text-muted-foreground">{dropzoneHint}</p>
              </div>
              <Input
                id="file-upload"
                className="hidden"
                type="file"
                multiple
                accept={inputAccept}
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="space-y-4">
              {showSingleJpegPreview && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-primary/20 shadow-inner bg-muted/20" >
                  <NextImage
                    src={jpegPreviewUrls[0]}
                    alt="Preview of selected JPEG"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}

              <div className="p-4 border-2 border-primary/20 rounded-lg bg-muted/20 shadow-inner">
                <p className="text-sm font-medium text-foreground mb-2">
                  {selectedFiles.length} file(s) selected:
                </p>
                <ul className="list-none pl-0 text-xs text-muted-foreground max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="truncate flex items-center" title={file.name}>
                      {conversionMode === 'jpgToPdf' && file.type === 'image/jpeg' && <NextImage src={jpegPreviewUrls[index] || ''} alt="" width={16} height={16} className="w-4 h-4 mr-2 object-cover rounded-sm" />}
                      {conversionMode === 'pdfToJpg' && file.type === 'application/pdf' && <FileText className="w-4 h-4 mr-2 shrink-0" />}
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="ml-2 whitespace-nowrap">({(file.size / 1024).toFixed(2)} KB)</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={confirmAndClearSelection}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Clear selection"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Clear All
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleConvert}
                  disabled={isConverting || selectedFiles.length === 0}
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
          &copy; {new Date().getFullYear()} JPGtoPDF & PDFtoJPG Converter. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

