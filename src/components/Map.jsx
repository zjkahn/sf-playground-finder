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

function defaultIconForZoom(zoom) {
  const s = zoom >= 16 ? 24 : zoom >= 15 ? 20 : zoom >= 14 ? 17 : 14
  return L.divIcon({
    className: '',
    html: `<div style="width:${s}px;height:${s}px;background:#3a8c6e;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  })
}

const SF_CENTER = [37.7749, -122.4194]

export default function Map({ playgrounds, selected, onSelect, userLocation, mapRef: externalMapRef }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const selectedIdRef = useRef(null)

  // Init map
  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true }).setView(SF_CENTER, 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    map.on('zoomend', () => {
      const zoom = map.getZoom()
      Object.entries(markersRef.current).forEach(([id, marker]) => {
        if (id !== selectedIdRef.current) marker.setIcon(defaultIconForZoom(zoom))
      })
    })

    mapRef.current = map
    if (externalMapRef) externalMapRef.current = map
  }, [])

  // Sync markers
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const zoom = map.getZoom()
    selectedIdRef.current = selected?.id ?? null
    const existing = new Set(Object.keys(markersRef.current))

    playgrounds.forEach(pg => {
      existing.delete(pg.id)
      const icon = selected?.id === pg.id ? selectedIcon : defaultIconForZoom(zoom)
      if (markersRef.current[pg.id]) {
        markersRef.current[pg.id].setIcon(icon)
        return
      }
      const marker = L.marker([pg.lat, pg.lng], { icon })
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
    const [lat, lng] = userLocation
    const dlat = 2 / 69
    const dlng = 2 / 53
    const bounds = L.latLngBounds(
      [lat - dlat, lng - dlng],
      [lat + dlat, lng + dlng]
    )
    const zoom = mapRef.current.getBoundsZoom(bounds)
    mapRef.current.flyTo(userLocation, zoom, { animate: true, duration: 1 })
  }, [userLocation])

  return (
    <div className="map-container">
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  )
}
