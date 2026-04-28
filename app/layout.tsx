import "./global.css";
import ShortcutFloater from "./components/ShortcutFloater";
import DailyTasks from "./components/DailyTasks";
import WeeklyTasks from "./components/WeeklyTasks";
import MonthlyTasks from "./components/MonthlyTasks";
import Countdown from "./components/Countdown";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

const baseUrl = "https://hoy.today";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Hoy & Today",
    template: "%s | Hoy & Today",
  },
  description:
    "Your personal space for productivity. Manage notes, daily tasks, and countdowns—saved locally or synced with Google and cloud storage.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Hoy & Today",
    description:
      "Your personal space for productivity. Manage notes, daily tasks, and countdowns—saved locally or synced with Google and cloud storage.",
    url: baseUrl,
    siteName: "Hoy & Today",
    locale: "en_US",
    type: "website",
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
};

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cx(
        "text-black bg-white",
        GeistSans.variable,
        GeistMono.variable,
      )}
    >
      <body className="antialiased" cz-shortcut-listen="true">
        <div
          className="fixed inset-0 z-[-1] bg-cover bg-center bg-fixed bg-no-repeat opacity-5"
          style={{ backgroundImage: "url('/wallpaper.png')" }}
        />
        <ShortcutFloater />
        <div className="fixed left-9 top-48 bottom-32 z-40 hidden lg:flex flex-col gap-4 w-64 overflow-y-auto custom-scrollbar pr-2">
          <DailyTasks />
          <WeeklyTasks />
          <MonthlyTasks />
        </div>
        <Countdown />
        <div className="pt-0 lg:pt-8">{children}</div>
      </body>
    </html>
  );
}
