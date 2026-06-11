"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamically import map components to avoid SSR window issues
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

interface MapProps {
  alerts: any[];
}

export default function Map({ alerts }: MapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Fix leafet icon issues
    const L = require('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  if (!isMounted) return <div className="w-full h-full bg-slate-800 animate-pulse rounded-2xl" />;

  const center = alerts.length > 0 && alerts[0].location 
    ? [alerts[0].location.lat, alerts[0].location.lng] 
    : [20.5937, 78.9629]; // Default center (India)

  return (
    <MapContainer 
      center={center as any} 
      zoom={5} 
      style={{ height: '100%', width: '100%', borderRadius: '1rem', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {alerts.map((alert, index) => (
        alert.location && (
          <Marker key={index} position={[alert.location.lat, alert.location.lng]}>
            <Popup>
              <div className="text-slate-900 font-medium">
                <strong>{alert.user?.name || 'Unknown User'}</strong>
                <p>Status: {alert.status}</p>
                <p>Time: {new Date(alert.createdAt || alert.timestamp).toLocaleString()}</p>
              </div>
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
}
