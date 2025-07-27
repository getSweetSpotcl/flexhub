import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'FlexHub - Espacios de Trabajo Flexibles',
  description:
    'Encuentra y reserva espacios de trabajo flexibles en Chile. Oficinas privadas, salas de reuniones y espacios de coworking por horas o días.',
  keywords: [
    'coworking',
    'oficinas',
    'espacios de trabajo',
    'chile',
    'flexible',
    'alquiler',
  ],
  authors: [{ name: 'FlexHub' }],
  creator: 'FlexHub',
  publisher: 'FlexHub',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://flexhub.com'
  ),
  openGraph: {
    title: 'FlexHub - Espacios de Trabajo Flexibles',
    description: 'Encuentra y reserva espacios de trabajo flexibles en Chile',
    type: 'website',
    locale: 'es_CL',
    siteName: 'FlexHub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlexHub - Espacios de Trabajo Flexibles',
    description: 'Encuentra y reserva espacios de trabajo flexibles en Chile',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="es" className="h-full">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-full font-sans`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
