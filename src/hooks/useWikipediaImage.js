import { useState, useEffect, useRef } from 'react'

const cache = {}

export function useWikipediaImage(parkName) {
  const [image, setImage] = useState(null) // { src, caption }
  const [status, setStatus] = useState('idle') // idle | loading | found | missing
  const prevName = useRef(null)

  useEffect(() => {
    if (!parkName || parkName === prevName.current) return
    prevName.current = parkName

    if (cache[parkName] !== undefined) {
      setImage(cache[parkName])
      setStatus(cache[parkName] ? 'found' : 'missing')
      return
    }

    setStatus('loading')
    setImage(null)

    // Strip generic suffixes to improve Wikipedia match rate
    const query = parkName
      .replace(/\s+(park|playground|mini park|rec center|recreation center)$/i, '')
      .trim()

    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query + ' San Francisco')}&prop=pageimages|pageterms&format=json&pithumbsize=600&origin=*`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        const pages = Object.values(data.query?.pages || {})
        const page = pages[0]
        if (page && page.thumbnail?.source) {
          const result = { src: page.thumbnail.source, caption: page.title }
          cache[parkName] = result
          setImage(result)
          setStatus('found')
        } else {
          // Try without "San Francisco" suffix
          return fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=600&origin=*`)
            .then(r => r.json())
            .then(data2 => {
              const pages2 = Object.values(data2.query?.pages || {})
              const page2 = pages2[0]
              if (page2 && page2.thumbnail?.source) {
                const result = { src: page2.thumbnail.source, caption: page2.title }
                cache[parkName] = result
                setImage(result)
                setStatus('found')
              } else {
                cache[parkName] = null
                setStatus('missing')
              }
            })
        }
      })
      .catch(() => {
        cache[parkName] = null
        setStatus('missing')
      })
  }, [parkName])

  return { image, status }
}
