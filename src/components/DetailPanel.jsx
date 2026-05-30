import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getStreetViewUrl, getPlacesPhotoUrl } from '../hooks/useParkImage'


export default function DetailPanel({ playground, entry, onSave, onClose }) {
  const [notes, setNotes] = useState(entry.notes || '')
  const [photoFailed, setPhotoFailed] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setNotes(entry.notes || '')
    setPhotoFailed(false)
    setLightboxOpen(false)
  }, [playground.id, entry.notes])

  function handleNotesBlur() {
    onSave(playground.id, { notes })
  }

  function toggleVisited() {
    onSave(playground.id, { visited: !entry.visited })
  }

  function toggleFavorite() {
    onSave(playground.id, { favorite: !entry.favorite })
  }

  async function handleShare() {
    const url = window.location.href
    const shareData = {
      title: playground.name,
      text: `Check out ${playground.name} — ${playground.address}`,
      url,
    }
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); return } catch {}
    }
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const streetViewSrc = getStreetViewUrl(playground.lat, playground.lng, 600, 400)
  const streetViewLargeSrc = getStreetViewUrl(playground.lat, playground.lng, 1200, 800)
  const placesPhotoSrc = getPlacesPhotoUrl(playground.photoName, 800)
  const placesPhotoLargeSrc = getPlacesPhotoUrl(playground.photoName, 1600)
  const photoSrc = placesPhotoSrc || streetViewSrc
  const largeSrc = placesPhotoLargeSrc || streetViewLargeSrc
  const isPlacesPhoto = !!placesPhotoSrc
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(playground.name + ' ' + playground.address)}`
  const showPhoto = photoSrc && !photoFailed

  // Preload large image in background so lightbox opens instantly
  useEffect(() => {
    if (!largeSrc) return
    const img = new Image()
    img.src = largeSrc
  }, [largeSrc])

  return (
    <div className="detail-panel">
      {/* Top section: left info + right photo */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>

        {/* Left: title, address, amenities, actions */}
        <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-title"
                style={{ textDecoration: 'none', display: 'block' }}
              >
                {playground.name} <span style={{ fontSize: '.7em', opacity: .6 }}>↗</span>
              </a>
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

          {/* Enriched data from Google Places */}
          {(playground.ageRange?.length > 0 || playground.shade || playground.googleRating) && (
            <div className="amenity-grid">
              {playground.ageRange?.includes('toddler')   && <span className="badge badge-purple">🍼 Toddler</span>}
              {playground.ageRange?.includes('preschool') && <span className="badge badge-purple">🎒 Preschool</span>}
              {playground.ageRange?.includes('bigKids')   && <span className="badge badge-purple">🧗 Big Kids</span>}
              {playground.shade === 'mostly shaded' && <span className="badge badge-green">🌳 Mostly Shaded</span>}
              {playground.shade === 'partial'       && <span className="badge badge-green">⛅ Partial Shade</span>}
              {playground.shade === 'full sun'      && <span className="badge badge-yellow">☀️ Full Sun</span>}
              {playground.googleRating && (
                <span className="badge badge-gray">⭐ {playground.googleRating.toFixed(1)} · {playground.reviewCount} reviews</span>
              )}
            </div>
          )}

          {playground.equipment?.length > 0 && (
            <div className="amenity-grid">
              {playground.equipment.map(e => (
                <span key={e} className="badge badge-gray">{e}</span>
              ))}
            </div>
          )}

          <button
            onClick={handleShare}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: '.78rem', fontWeight: 700, color: 'var(--coral)',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            }}
          >
            {copied ? '✓ Copied!' : '🔗 Share'}
          </button>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <button onClick={toggleFavorite} className={`star-btn ${entry.favorite ? 'starred' : ''}`} title={entry.favorite ? 'Remove favorite' : 'Add to favorites'}>
              {entry.favorite ? '★' : '☆'}
            </button>
            <label className="visited-toggle" onClick={toggleVisited}>
              <div className={`visited-check ${entry.visited ? 'checked' : ''}`}>{entry.visited ? '✓' : ''}</div>
              Visited
            </label>
          </div>
        </div>

        {/* Right: Street View photo */}
        {showPhoto && (
          <div
            style={{ width: '45%', flexShrink: 0, position: 'relative', cursor: 'zoom-in' }}
            onClick={() => setLightboxOpen(true)}
          >
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
              {isPlacesPhoto ? '📸 Google Photo' : '🔍 Street View · may not show playground'}
            </div>
          </div>
        )}

        {/* Lightbox — rendered via portal to escape transform containing block */}
        {lightboxOpen && createPortal(
          <div
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <img
              src={largeSrc}
              alt={playground.name}
              style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,.6)' }}
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxOpen(false)}
              style={{
                position: 'absolute', top: 20, right: 24,
                background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%',
                width: 40, height: 40, fontSize: '1.2rem', color: 'white',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>,
          document.body
        )}
      </div>

      {/* Notes — full width below */}
      <div style={{ padding: '8px 14px 12px' }}>
        <div className="detail-section-label" style={{ marginBottom: 4 }}>My Notes</div>
        <textarea
          className="notes-textarea"
          placeholder="Add your notes… (saved locally)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          style={{ minHeight: 52 }}
        />
      </div>
    </div>
  )
}
