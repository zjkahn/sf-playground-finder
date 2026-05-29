import React, { useState, useMemo, useRef } from 'react'
import Map from './components/Map'
import Filters from './components/Filters'
import PlaygroundList from './components/PlaygroundList'
import DetailPanel from './components/DetailPanel'
import { usePlaygrounds } from './hooks/usePlaygrounds'
import { useLocalData } from './hooks/useLocalData'

const DEFAULT_FILTERS = {
  toddlerFriendly: false,
  hasRestrooms: false,
  hasParking: false,
  hasPicnicTables: false,
  visitedOnly: false,
  neighborhood: '',
}

export default function App() {
  const { playgrounds, loading, error } = usePlaygrounds()
  const { getEntry, save } = useLocalData()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const [selected, setSelected] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [geoError, setGeoError] = useState(null)
  const [activeTab, setActiveTab] = useState('map')
  const mapRef = useRef(null)

  const neighborhoods = useMemo(() => {
    const set = new Set(playgrounds.map(p => p.neighborhood).filter(Boolean))
    return [...set].sort()
  }, [playgrounds])

  function distanceMiles(pg) {
    if (!userLocation) return 0
    const [lat, lng] = userLocation
    const dlat = (pg.lat - lat) * 69
    const dlng = (pg.lng - lng) * 53
    return Math.sqrt(dlat * dlat + dlng * dlng)
  }

  const filtered = useMemo(() => {
    const list = playgrounds.filter(pg => {
      if (filters.toddlerFriendly && !pg.toddlerFriendly) return false
      if (filters.hasRestrooms    && !pg.hasRestrooms)    return false
      if (filters.hasParking      && !pg.hasParking)      return false
      if (filters.hasPicnicTables && !pg.hasPicnicTables) return false
      if (filters.visitedOnly && !getEntry(pg.id).visited) return false
      if (filters.neighborhood && pg.neighborhood !== filters.neighborhood) return false
      if (search) {
        const q = search.toLowerCase()
        if (!pg.name.toLowerCase().includes(q) && !pg.address.toLowerCase().includes(q) && !(pg.neighborhood || '').toLowerCase().includes(q)) return false
      }
      return true
    })

    if (sortBy === 'az')       return [...list].sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'distance') return [...list].sort((a, b) => distanceMiles(a) - distanceMiles(b))
    return list
  }, [playgrounds, filters, search, sortBy, userLocation, getEntry])

  function handleNearMe() {
    setGeoError(null)
    if (!navigator.geolocation) { setGeoError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation([pos.coords.latitude, pos.coords.longitude]); setSortBy('distance') },
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
        <aside className={`sidebar ${activeTab === 'list' ? 'mobile-active' : 'mobile-hidden'}`}>
          <Filters
            filters={filters}
            onChange={setFilters}
            neighborhoods={neighborhoods}
            search={search}
            onSearch={setSearch}
            sortBy={sortBy}
            onSort={setSortBy}
            hasLocation={!!userLocation}
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
              userLocation={userLocation}
            />
          )}
        </aside>

        {/* Map area */}
        <div className={`map-area ${activeTab === 'map' ? 'mobile-active' : 'mobile-hidden'}`}>
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
        </div>

        {selected && (
          <DetailPanel
            playground={selected}
            entry={getEntry(selected.id)}
            onSave={save}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      <div className="mobile-tab-bar">
        <button className={`mobile-tab ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          <span>🗺️</span>
          <span>Map</span>
        </button>
        <button className={`mobile-tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
          <span>📋</span>
          <span>List</span>
        </button>
      </div>
    </div>
  )
}
