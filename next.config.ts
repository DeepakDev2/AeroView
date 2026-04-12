import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Leaflet and react-leaflet require client-only rendering
  // Dynamic imports with ssr: false are used in MapView component
};

export default nextConfig;
