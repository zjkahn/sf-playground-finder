import React from 'react'

const CHIPS = [
  { key: 'toddlerFriendly', label: '🧒 Play Area' },
  { key: 'hasRestrooms',    label: '🚻 Restrooms' },
  { key: 'hasParking',      label: '🅿️ Parking' },
  { key: 'hasPicnicTables', label: '🪑 Picnic Area' },
  { key: 'visitedOnly',     label: '✓ Visited' },
]

export default function Filters({ filters, onChange, neighborhoods, search, onSearch, sortBy, onSort, hasLocation, onNearMe, onSurpriseMe }) {
  function toggle(key) {
    onChange({ ...filters, [key]: !filters[key] })
  }

  function handleSortChange(value) {
    if (value === 'distance' && !hasLocation) onNearMe()
    onSort(value)
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
        <select
          className="filter-select"
          value={sortBy}
          onChange={e => handleSortChange(e.target.value)}
          style={{ flex: '0 0 auto', width: 'auto' }}
        >
          <option value="az">Sort: A–Z</option>
          <option value="distance">Sort: Nearest</option>
        </select>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onChange({ toddlerFriendly: false, hasRestrooms: false, hasParking: false, hasPicnicTables: false, visitedOnly: false, neighborhood: '' })}
        >
          Clear
        </button>
      </div>
      <div className="filter-row">
        <button className="btn btn-surprise" onClick={onSurpriseMe} style={{ width: '100%' }}>
          🎲 Surprise Me!
        </button>
      </div>
    </div>
  )
}
