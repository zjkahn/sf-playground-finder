import React from 'react'

function Badges({ pg, visited }) {
  return (
    <div className="card-badges">
      {visited && <span className="badge badge-visited">✓ Visited</span>}
      {pg.toddlerFriendly && <span className="badge badge-blue">🧒 Tot Lot</span>}
      {pg.propertyType && <span className="badge badge-green">{pg.propertyType}</span>}
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
          >
            <div className="card-title">{pg.name}</div>
            <div className="card-address">{pg.address}{pg.neighborhood ? ` · ${pg.neighborhood}` : ''}</div>
            <Badges pg={pg} visited={entry.visited} />
          </div>
        )
      })}
    </div>
  )
}
