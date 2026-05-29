import React, { useState, useEffect } from 'react'
import { getStreetViewUrl } from '../hooks/useParkImage'
function ParkPhoto({ name, lat, lng }) {
  const src = getStreetViewUrl(lat, lng, 800, 450)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [lat, lng])
  if (!src || failed) return null
  return (
    // 16:9 ratio container — image fills it without stretching
    <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: 'var(--mist)' }}>
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,.45))',
        padding: '24px 10px 6px',
        fontSize: '.68rem', color: 'rgba(255,255,255,.8)',
      }}>
        📷 Google Street View
      </div>
    </div>
  )
}

const INFO_FIELDS = [
  ['propertytype', 'Type'],
  ['acres',        'Acres'],
  ['complex',      'Complex'],
  ['ownership',    'Managed by'],
]

export default function DetailPanel({ playground, entry, onSave, onClose }) {
  const [notes, setNotes] = useState(entry.notes || '')

  useEffect(() => {
    setNotes(entry.notes || '')
  }, [playground.id, entry.notes])

  function handleNotesBlur() {
    onSave(playground.id, { notes })
  }

  function toggleVisited() {
    onSave(playground.id, { visited: !entry.visited })
  }

  const raw = playground.rawAmenities || {}
  const infoRows = INFO_FIELDS.map(([k, label]) => raw[k] ? { label, value: raw[k] } : null).filter(Boolean)

  return (
    <div className="detail-panel">
      <ParkPhoto name={playground.name} lat={playground.lat} lng={playground.lng} />
      <div className="detail-header">
        <div>
          <div className="detail-title">{playground.name}</div>
          <div className="detail-address">{playground.address}{playground.neighborhood ? ` · ${playground.neighborhood}` : ''}</div>
        </div>
        <div className="detail-actions">
          <label className="visited-toggle" onClick={toggleVisited}>
            <div className={`visited-check ${entry.visited ? 'checked' : ''}`}>{entry.visited ? '✓' : ''}</div>
            Visited
          </label>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="detail-body">
        {(playground.toddlerFriendly || playground.hasRestrooms || playground.hasParking || playground.hasPicnicTables) && (
          <div className="detail-section">
            <div className="detail-section-label">Amenities</div>
            <div className="amenity-grid">
              {playground.toddlerFriendly && <span className="badge badge-blue">🧒 Children's Play Area</span>}
              {playground.hasRestrooms    && <span className="badge badge-green">🚻 Restrooms</span>}
              {playground.hasParking      && <span className="badge badge-yellow">🅿️ Parking</span>}
              {playground.hasPicnicTables && <span className="badge badge-yellow">🪑 Picnic Area</span>}
            </div>
          </div>
        )}

        {infoRows.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-label">Details</div>
            <div style={{ fontSize: '.8rem', lineHeight: 1.8 }}>
              {infoRows.map(({ label, value }) => (
                <div key={label}><span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{label}:</span>{value}</div>
              ))}
            </div>
          </div>
        )}

        <div className="detail-section">
          <div className="detail-section-label">My Notes</div>
          <textarea
            className="notes-textarea"
            placeholder="Add your notes about this playground… (saved locally)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
          />
        </div>
      </div>
    </div>
  )
}
