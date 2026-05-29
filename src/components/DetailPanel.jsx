import React, { useState, useEffect } from 'react'
import { getStreetViewUrl } from '../hooks/useParkImage'


export default function DetailPanel({ playground, entry, onSave, onClose }) {
  const [notes, setNotes] = useState(entry.notes || '')
  const [photoFailed, setPhotoFailed] = useState(false)

  useEffect(() => {
    setNotes(entry.notes || '')
    setPhotoFailed(false)
  }, [playground.id, entry.notes])

  function handleNotesBlur() {
    onSave(playground.id, { notes })
  }

  function toggleVisited() {
    onSave(playground.id, { visited: !entry.visited })
  }

  const photoSrc = getStreetViewUrl(playground.lat, playground.lng, 600, 400)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(playground.name + ' ' + playground.address)}`
  const showPhoto = photoSrc && !photoFailed

  return (
    <div className="detail-panel">
      {/* Top section: left info + right photo */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>

        {/* Left: title, address, amenities, actions */}
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div className="detail-title">{playground.name}</div>
              <div className="detail-address">
                {playground.address}{playground.neighborhood ? ` · ${playground.neighborhood}` : ''}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ flexShrink: 0 }}>✕</button>
          </div>

          {(playground.toddlerFriendly || playground.hasRestrooms || playground.hasParking || playground.hasPicnicTables) && (
            <div className="amenity-grid">
              {playground.toddlerFriendly && <span className="badge badge-blue">🧒 Play Area</span>}
              {playground.hasRestrooms    && <span className="badge badge-green">🚻 Restrooms</span>}
              {playground.hasParking      && <span className="badge badge-yellow">🅿️ Parking</span>}
              {playground.hasPicnicTables && <span className="badge badge-yellow">🪑 Picnic</span>}
            </div>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: '.78rem', fontWeight: 700, color: 'var(--sky)',
              textDecoration: 'none',
            }}
          >
            🗺️ Open in Google Maps
          </a>

          <label className="visited-toggle" onClick={toggleVisited} style={{ marginTop: 'auto' }}>
            <div className={`visited-check ${entry.visited ? 'checked' : ''}`}>{entry.visited ? '✓' : ''}</div>
            Mark as Visited
          </label>
        </div>

        {/* Right: Street View photo */}
        {showPhoto && (
          <div style={{ width: '42%', flexShrink: 0, position: 'relative', minHeight: 160 }}>
            <img
              src={photoSrc}
              alt={playground.name}
              onError={() => setPhotoFailed(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,.45))',
              padding: '16px 8px 5px',
              fontSize: '.65rem', color: 'rgba(255,255,255,.8)',
              textAlign: 'right',
            }}>
              📷 Street View
            </div>
          </div>
        )}
      </div>

      {/* Notes — full width below */}
      <div className="detail-body" style={{ padding: '12px 16px' }}>
        <div className="detail-section-label" style={{ marginBottom: 5 }}>My Notes</div>
        <textarea
          className="notes-textarea"
          placeholder="Add your notes about this playground… (saved locally)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
        />
      </div>
    </div>
  )
}
