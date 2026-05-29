import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const selectedIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));transform:scale(1.1)">🛝</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const defaultIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#3a8c6e;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const SF_CENTER = [37.7749, -122.4194]

export default function Map({ playgrounds, selected, onSelect, userLocation, mapRef: externalMapRef }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})

  // Init map
  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true }).setView(SF_CENTER, 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
    if (externalMapRef) externalMapRef.current = map
  }, [])

  // Sync markers
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const existing = new Set(Object.keys(markersRef.current))

    playgrounds.forEach(pg => {
      existing.delete(pg.id)
      if (markersRef.current[pg.id]) {
        markersRef.current[pg.id].setIcon(selected?.id === pg.id ? selectedIcon : defaultIcon)
        return
      }
      const marker = L.marker([pg.lat, pg.lng], {
        icon: selected?.id === pg.id ? selectedIcon : defaultIcon,
      })
        .addTo(map)
        .on('click', () => onSelect(pg))
      markersRef.current[pg.id] = marker
    })

    existing.forEach(id => {
      markersRef.current[id].remove()
      delete markersRef.current[id]
    })
  }, [playgrounds, selected])

  // Pan to selected
  useEffect(() => {
    if (!selected || !mapRef.current) return
    mapRef.current.panTo([selected.lat, selected.lng], { animate: true })
  }, [selected?.id])

  // User location marker
  const userMarkerRef = useRef(null)
  useEffect(() => {
    if (!mapRef.current || !userLocation) return
    if (userMarkerRef.current) userMarkerRef.current.remove()
    userMarkerRef.current = L.marker(userLocation, {
      icon: L.divIcon({
        className: '',
        html: '<div style="width:16px;height:16px;background:#c0604a;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
      title: 'Your location',
    }).addTo(mapRef.current)
    mapRef.current.flyTo(userLocation, 15, { animate: true, duration: 1 })
  }, [userLocation])

  return (
    <div className="map-container">
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  )
}
