import React from 'react'

function Badges({ pg, visited, favorite }) {
  return (
    <div className="card-badges">
      {favorite           && <span className="badge badge-favorite">⭐ Favorite</span>}
      {visited            && <span className="badge badge-visited">✓ Visited</span>}
      {pg.hasRestrooms    && <span className="badge badge-green">🚻 Restrooms</span>}
      {pg.hasParking      && <span className="badge badge-yellow">🅿️ Parking</span>}
      {pg.hasPicnicTables && <span className="badge badge-yellow">🪑 Picnic</span>}
    </div>
  )
}

export default function PlaygroundList({ playgrounds, selected, onSelect, getEntry, userLocation }) {
  if (playgrounds.length === 0) {
    return <div className="status-msg"><span>No playgrounds match your filters.</span></div>
  }

  return (
    <div className="playground-list">
      {playgrounds.map(pg => {
        const entry = getEntry(pg.id)
        let distLabel = null
        if (userLocation) {
          const [lat, lng] = userLocation
          const dlat = (pg.lat - lat) * 69
          const dlng = (pg.lng - lng) * 53
          const miles = Math.sqrt(dlat * dlat + dlng * dlng)
          distLabel = miles < 0.1 ? 'nearby' : `${miles.toFixed(1)} mi`
        }
        return (
          <div
            key={pg.id}
            className={`playground-card ${selected?.id === pg.id ? 'selected' : ''}`}
            onClick={() => onSelect(pg)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="card-title">{pg.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexShrink: 0, marginLeft: 6 }}>
                {pg.googleRating && pg.reviewCount >= 5 && <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>⭐ {pg.googleRating.toFixed(1)} · {pg.reviewCount} reviews</span>}
                {distLabel && <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--sky)' }}>{distLabel}</span>}
              </div>
            </div>
            <div className="card-address">{pg.address}{pg.neighborhood ? ` · ${pg.neighborhood}` : ''}</div>
            <Badges pg={pg} visited={entry.visited} favorite={entry.favorite} />
          </div>
        )
      })}
    </div>
  )
}
