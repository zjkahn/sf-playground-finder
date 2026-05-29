import React from 'react'

// Chips that work with real data from SF Open Data properties dataset
const CHIPS = [
  { key: 'toddlerFriendly', label: '🧒 Tot Lot / Playground' },
  { key: 'visitedOnly',     label: '✓ Visited' },
]

// These would require a separate amenities dataset not yet available
const DISABLED_CHIPS = [
  { label: '🚻 Restrooms' },
  { label: '🅿️ Parking' },
  { label: '🪑 Picnic Tables' },
]

export default function Filters({ filters, onChange, neighborhoods, search, onSearch }) {
  function toggle(key) {
    onChange({ ...filters, [key]: !filters[key] })
  }

  return (
    <div className="filters-panel">
      <div className="search-box">
        <input
          className="search-input"
          placeholder="Search playgrounds…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>
      <div className="filter-row">
        {CHIPS.map(({ key, label }) => (
          <label key={key} className={`filter-chip ${filters[key] ? 'active' : ''}`}>
            <input type="checkbox" checked={!!filters[key]} onChange={() => toggle(key)} />
            {label}
          </label>
        ))}
        {DISABLED_CHIPS.map(({ label }) => (
          <span key={label} className="filter-chip" style={{ opacity: .4, cursor: 'default' }} title="Amenity data not in SF Open Data source">
            {label}
          </span>
        ))}
      </div>
      <div className="filter-row">
        <select
          className="filter-select"
          value={filters.neighborhood || ''}
          onChange={e => onChange({ ...filters, neighborhood: e.target.value })}
        >
          <option value="">All Neighborhoods</option>
          {neighborhoods.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onChange({ toddlerFriendly: false, visitedOnly: false, neighborhood: '' })}
        >
          Clear
        </button>
      </div>
    </div>
  )
}
