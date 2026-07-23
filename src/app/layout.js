import { Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "Las Manitos de Mili | Manicuría Profesional en Rosario - Turnos Online",
  description: "Estudio de manicuría premium en Rosario, Santa Fe. Reserva tu turno online de Semipermanente, Kapping Poligel, Soft Gel y Esculpidas. Uñas perfectas y duraderas con Mili Nails.",
  keywords: [
    "manicura rosario",
    "nails rosario",
    "manicuría rosario",
    "kapping poligel rosario",
    "soft gel rosario",
    "esculpidas rosario",
    "mili nails",
    "las manitos de mili",
    "turnos manicuría rosario",
    "esmaltado semipermanente rosario",
    "decoracion de uñas rosario",
    "pedicura rosario",
    "belleza de manos rosario"
  ],
  authors: [{ name: "Sami (Mili Nails)" }],
  creator: "neo core sys",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Las Manitos de Mili | Manicuría en Rosario - Turnos Online",
    description: "Estudio de manicuría premium en Rosario, Santa Fe. Reserva tu turno online de Semipermanente, Kapping Poligel, Soft Gel y Esculpidas.",
    url: "https://lasmanitosdemili.com.ar",
    siteName: "Las Manitos de Mili",
    locale: "es_AR",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
