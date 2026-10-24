import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Attendly — Student Attendance", description: "Secure attendance operations for schools and colleges." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
