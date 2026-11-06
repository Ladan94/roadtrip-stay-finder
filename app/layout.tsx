import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'RoadTrip Stay Finder — A beautiful pause',
  description:
    'Plan thoughtful European road trips. Discover overnight stays, bakeries and cafés along your route. Try the clearly labeled fictional demo, or connect live Google discovery.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
