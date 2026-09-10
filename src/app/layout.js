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
  metadataBase: new URL("https://lasmanitosdemili.com.ar"),
  title: "Las Manitos de Mili | Manicuría y Uñas en Rosario - Turnos Online",
  description: "Estudio de manicuría y estética de uñas en Rosario, Santa Fe. Reserva tu turno online de Semipermanente, Kapping Poligel, Soft Gel, Uñas Esculpidas y Pedicuría.",
  keywords: [
    "manicura en rosario",
    "manicura rosario",
    "uñas en rosario",
    "uñas rosario",
    "manicuría rosario",
    "manicurista rosario",
    "estudio de uñas rosario",
    "kapping gel rosario",
    "kapping poligel rosario",
    "soft gel rosario",
    "uñas soft gel rosario",
    "uñas esculpidas rosario",
    "esculpidas rosario",
    "esmaltado semipermanente rosario",
    "semipermanente rosario",
    "pedicuria rosario",
    "pedicuría rosario",
    "belleza de manos rosario",
    "turnos manicura rosario",
    "las manitos de mili",
    "mili nails rosario",
    "salon de uñas rosario"
  ],
  authors: [{ name: "Mili (Las Manitos de Mili)" }],
  creator: "neo core sys",
  alternates: {
    canonical: "/",
  },
  other: {
    "geo.region": "AR-S",
    "geo.placename": "Rosario",
    "geo.position": "-32.94682;-60.63932",
    "ICBM": "-32.94682, -60.63932",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Las Manitos de Mili | Manicuría y Uñas en Rosario - Turnos Online",
    description: "Estudio de manicuría premium en Rosario, Santa Fe. Reserva tu turno online de Semipermanente, Kapping Poligel, Soft Gel y Esculpidas.",
    url: "https://lasmanitosdemili.com.ar",
    siteName: "Las Manitos de Mili",
    locale: "es_AR",
    type: "website",
    images: [
      {
        url: "/images/sami-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Las Manitos de Mili - Manicuría Profesional en Rosario",
      },
    ],
  },
};

const jsonLdData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NailSalon",
      "@id": "https://lasmanitosdemili.com.ar/#salon",
      "name": "Las Manitos de Mili",
      "alternateName": "Las Manitos de Mili - Manicuría Rosario",
      "description": "Estudio de manicuría profesional, belleza de uñas y pedicuría en Rosario, Santa Fe. Turnos online para Semipermanente, Kapping, Soft Gel y Esculpidas.",
      "url": "https://lasmanitosdemili.com.ar",
      "logo": "https://lasmanitosdemili.com.ar/logo.jpg",
      "image": "https://lasmanitosdemili.com.ar/images/sami-hero.jpg",
      "telephone": "+5493413022674",
      "priceRange": "$$",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Rosario",
        "addressRegion": "Santa Fe",
        "addressCountry": "AR"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": -32.94682,
        "longitude": -60.63932
      },
      "areaServed": [
        {
          "@type": "City",
          "name": "Rosario"
        }
      ],
      "sameAs": [
        "https://instagram.com/las_manitosde_mili"
      ],
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          "opens": "09:00",
          "closes": "20:00"
        }
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Servicios de Manicuría y Uñas en Rosario",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Esmaltado Semipermanente en Rosario",
              "description": "Esmaltado de larga duración con curado en cabina. Brillo extremo por 15 a 21 días."
            },
            "price": "14000",
            "priceCurrency": "ARS"
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Kapping Poligel en Rosario",
              "description": "Fina capa de gel sobre tu uña natural para fortalecerla, evitar escamados y permitir crecimiento saludable."
            },
            "price": "18000",
            "priceCurrency": "ARS"
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Uñas Soft Gel en Rosario",
              "description": "Técnica express de extensión de uñas usando tips de gel ultraligeros de alta durabilidad."
            },
            "price": "19000",
            "priceCurrency": "ARS"
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Uñas Esculpidas en Rosario",
              "description": "Extensión de uñas esculpidas a medida con gel constructor o acrílico."
            },
            "price": "20000",
            "priceCurrency": "ARS"
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Pedicuría Completa en Rosario",
              "description": "Tratamiento profundo para remoción de asperezas, callosidades, exfoliación e hidratación."
            },
            "price": "15000",
            "priceCurrency": "ARS"
          }
        ]
      }
    },
    {
      "@type": "FAQPage",
      "@id": "https://lasmanitosdemili.com.ar/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "¿Dónde queda el estudio de manicuría en Rosario?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "El estudio de Las Manitos de Mili se encuentra en Rosario, Santa Fe. Atendemos con cita previa reservada desde la web o coordinada por WhatsApp para garantizar atención personalizada y puntual."
          }
        },
        {
          "@type": "Question",
          "name": "¿Qué diferencia hay entre Kapping Poligel, Soft Gel y Uñas Esculpidas?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "El Kapping Poligel refuerza tu uña natural para evitar que se quiebre sin alargarla. El Soft Gel extiende tus uñas mediante tips de gel preformados ligeros y rápidos de colocar. Las Uñas Esculpidas se construyen de forma totalmente artesanal y a medida con molde para lograr el largo y la forma exacta deseada."
          }
        },
        {
          "@type": "Question",
          "name": "¿Cuánto tiempo dura el esmaltado semipermanente?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "El esmaltado semipermanente dura entre 15 y 21 días intacto con brillo perfecto, dependiendo del crecimiento natural de tu uña y los cuidados cotidianos."
          }
        },
        {
          "@type": "Question",
          "name": "¿Cómo reservo mi turno de manicura en Rosario?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Puedes reservar tu turno directamente en nuestra web seleccionando el día y la hora disponible en el calendario de reservas online, o bien enviando un mensaje directo a nuestro WhatsApp."
          }
        },
        {
          "@type": "Question",
          "name": "¿Realizan servicios de pedicuría y spa de pies en Rosario?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sí, realizamos esmaltado semipermanente en pies y pedicuría completa con remoción profunda de asperezas, exfoliación e hidratación."
          }
        }
      ]
    }
  ]
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${montserrat.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

