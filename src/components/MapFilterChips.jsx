import React from 'react'

const CHIPS = [
  { key: 'toddlerFriendly', label: '🧒 Play Area' },
  { key: 'hasRestrooms',    label: '🚻 Restrooms' },
  { key: 'hasParking',      label: '🅿️ Parking' },
  { key: 'hasPicnicTables', label: '🪑 Picnic' },
  { key: 'favoritesOnly',   label: '⭐ Favorites' },
  { key: 'visitedOnly',     label: '✓ Visited' },
  { key: 'ageToddler',      label: '🍼 Toddler' },
  { key: 'agePreschool',    label: '🎒 Preschool' },
  { key: 'ageBigKids',      label: '🧗 Big Kids' },
  { key: 'mostlyShaded',    label: '🌳 Shaded' },
]

export default function MapFilterChips({ filters, onChange }) {
  function toggle(key) {
    onChange({ ...filters, [key]: !filters[key] })
  }

  const activeCount = CHIPS.filter(c => filters[c.key]).length

  return (
    <div className="map-filter-bar">
      {CHIPS.map(({ key, label }) => (
        <button
          key={key}
          className={`map-filter-chip ${filters[key] ? 'active' : ''}`}
          onClick={() => toggle(key)}
        >
          {label}
        </button>
      ))}
      {activeCount > 0 && (
        <button
          className="map-filter-chip map-filter-clear"
          onClick={() => onChange({ ...filters, toddlerFriendly: false, hasRestrooms: false, hasParking: false, hasPicnicTables: false, favoritesOnly: false, visitedOnly: false, ageToddler: false, agePreschool: false, ageBigKids: false, mostlyShaded: false })}
        >
          Clear ✕
        </button>
      )}
    </div>
  )
}
