
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; 

export const metadata: Metadata = {
  title: 'Free Online JPEG to PDF and PDF to JPEG Converter | Fast & Easy',
  description: 'Easily convert JPEG images to PDF files and PDF documents (first page) to JPEG images online. Free, fast, and secure file conversion.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
