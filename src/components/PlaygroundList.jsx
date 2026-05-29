import React, { useState } from 'react'
import { getStreetViewUrl } from '../hooks/useParkImage'

function CardPhoto({ lat, lng, name }) {
  const src = getStreetViewUrl(lat, lng, 640, 200)
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block', borderRadius: '6px 6px 0 0' }}
    />
  )
}

function Badges({ pg, visited }) {
  return (
    <div className="card-badges">
      {visited            && <span className="badge badge-visited">✓ Visited</span>}
      {pg.hasRestrooms    && <span className="badge badge-green">🚻 Restrooms</span>}
      {pg.hasParking      && <span className="badge badge-yellow">🅿️ Parking</span>}
      {pg.hasPicnicTables && <span className="badge badge-yellow">🪑 Picnic</span>}
    </div>
  )
}

export default function PlaygroundList({ playgrounds, selected, onSelect, getEntry }) {
  if (playgrounds.length === 0) {
    return <div className="status-msg"><span>No playgrounds match your filters.</span></div>
  }

  return (
    <div className="playground-list">
      {playgrounds.map(pg => {
        const entry = getEntry(pg.id)
        return (
          <div
            key={pg.id}
            className={`playground-card ${selected?.id === pg.id ? 'selected' : ''}`}
            onClick={() => onSelect(pg)}
            style={{ padding: 0 }}
          >
            <CardPhoto lat={pg.lat} lng={pg.lng} name={pg.name} />
            <div style={{ padding: '10px 14px 12px' }}>
              <div className="card-title">{pg.name}</div>
              <div className="card-address">{pg.address}{pg.neighborhood ? ` · ${pg.neighborhood}` : ''}</div>
              <Badges pg={pg} visited={entry.visited} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
