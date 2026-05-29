import { useState, useEffect, useRef } from 'react'

const cache = {}

async function fetchImage(parkName) {
  // Step 1: search Wikipedia for the best matching article
  const searchUrl =
    `https://en.wikipedia.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(parkName + ' San Francisco park')}` +
    `&srnamespace=0&srlimit=3&format=json&origin=*`

  const searchData = await fetch(searchUrl).then(r => r.json())
  const hits = searchData.query?.search || []
  if (!hits.length) return null

  // Step 2: fetch the REST summary for the top result — includes thumbnail
  for (const hit of hits) {
    const slug = encodeURIComponent(hit.title.replace(/ /g, '_'))
    const summary = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`
    ).then(r => r.ok ? r.json() : null)

    if (summary?.thumbnail?.source) {
      // Bump resolution: replace default width with 800px
      const src = summary.originalimage?.source || summary.thumbnail.source
      return { src, caption: summary.title }
    }
  }
  return null
}

export function useParkImage(parkName) {
  const [image, setImage] = useState(null)
  const [status, setStatus] = useState('idle')
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

    fetchImage(parkName)
      .then(result => {
        cache[parkName] = result
        setImage(result)
        setStatus(result ? 'found' : 'missing')
      })
      .catch(() => {
        cache[parkName] = null
        setStatus('missing')
      })
  }, [parkName])

  return { image, status }
}
