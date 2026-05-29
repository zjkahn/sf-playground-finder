import React, { useState, useMemo, useRef } from 'react'
import Map from './components/Map'
import Filters from './components/Filters'
import PlaygroundList from './components/PlaygroundList'
import DetailPanel from './components/DetailPanel'
import { usePlaygrounds } from './hooks/usePlaygrounds'
import { useLocalData } from './hooks/useLocalData'

const DEFAULT_FILTERS = {
  toddlerFriendly: false,
  visitedOnly: false,
  neighborhood: '',
}

export default function App() {
  const { playgrounds, loading, error } = usePlaygrounds()
  const { getEntry, save } = useLocalData()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [geoError, setGeoError] = useState(null)
  const mapRef = useRef(null)

  const neighborhoods = useMemo(() => {
    const set = new Set(playgrounds.map(p => p.neighborhood).filter(Boolean))
    return [...set].sort()
  }, [playgrounds])

  const filtered = useMemo(() => {
    return playgrounds.filter(pg => {
      if (filters.toddlerFriendly && !pg.toddlerFriendly) return false
      if (filters.visitedOnly && !getEntry(pg.id).visited) return false
      if (filters.neighborhood && pg.neighborhood !== filters.neighborhood) return false
      if (search) {
        const q = search.toLowerCase()
        if (!pg.name.toLowerCase().includes(q) && !pg.address.toLowerCase().includes(q) && !(pg.neighborhood || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [playgrounds, filters, search, getEntry])

  function handleNearMe() {
    setGeoError(null)
    if (!navigator.geolocation) { setGeoError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => setGeoError('Location access denied')
    )
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <span style={{ fontSize: '1.4rem' }}>🛝</span>
        <h1>SF Playground Finder</h1>
        <span className="subtitle">Find spots for your little ones</span>
      </header>

      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <Filters
            filters={filters}
            onChange={setFilters}
            neighborhoods={neighborhoods}
            search={search}
            onSearch={setSearch}
          />
          <div className="results-header">
            {loading ? 'Loading…' : error ? `Error: ${error}` : `${filtered.length} playground${filtered.length !== 1 ? 's' : ''} found`}
          </div>
          {loading ? (
            <div className="status-msg"><div className="spinner" /><span>Fetching SF parks data…</span></div>
          ) : error ? (
            <div className="status-msg"><span>⚠️ {error}</span></div>
          ) : (
            <PlaygroundList
              playgrounds={filtered}
              selected={selected}
              onSelect={pg => setSelected(pg)}
              getEntry={getEntry}
            />
          )}
        </aside>

        {/* Map area */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <Map
            playgrounds={filtered}
            selected={selected}
            onSelect={pg => setSelected(pg)}
            userLocation={userLocation}
            mapRef={mapRef}
          />

          <button className="near-me-btn" onClick={handleNearMe} title="Center on my location">
            📍 Near Me
          </button>

          {geoError && (
            <div style={{ position: 'absolute', top: 52, right: 12, zIndex: 1001, background: 'var(--rust)', color: 'white', padding: '6px 10px', borderRadius: 8, fontSize: '.78rem' }}>
              {geoError}
            </div>
          )}

          {selected && (
            <DetailPanel
              playground={selected}
              entry={getEntry(selected.id)}
              onSave={save}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
