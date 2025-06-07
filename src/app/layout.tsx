
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Script from 'next/script';

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
        <meta name="title" content="Free Online JPEG to PDF and PDF to JPEG Converter" />
        <meta name="description" content="Easily convert JPEG to PDF and PDF to JPEG online for free. Fast, secure, and high-quality image and document conversion. Try our web app today!" />
        <meta name="keywords" content="JPEG to PDF,PDF to JPEG,convert,online,free,web app,image to document,document to image" />
        <meta name="robots" content="index, follow" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="language" content="English" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        <Script
        src={`https://www.googletagmanager.com/gtag/js?id=G-G8W9DMH8RG`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-G8W9DMH8RG');
        `}
      </Script>
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
