/**
 * src/app/page.tsx — Root page (Server Component).
 *
 * Loads airports.json and pois.json server-side so they stay out of the
 * client bundle, then passes them to the client-side orchestrator.
 */

import ClientApp from '@/components/ClientApp';
import airportsData from '@/data/airports.json';
import poisData from '@/data/pois.json';
import type { AirportRecord, POIRecord } from '@/types';

export default function Home() {
  const airports = airportsData as AirportRecord[];
  const pois = poisData as POIRecord[];

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-12 px-4">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">
          ✈ AeroView
        </h1>
        <p className="text-gray-400 text-sm max-w-sm">
          Find out which side of the plane gives you the best views —
          sunrises, sunsets, mountains, and landmarks.
        </p>
      </div>

      {/* App shell */}
      <ClientApp airports={airports} pois={pois} />
    </main>
  );
}