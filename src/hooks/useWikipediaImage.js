import { useState, useEffect, useRef } from 'react'

const cache = {}

async function fetchWikiImage(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=600&origin=*`
  const data = await fetch(url).then(r => r.json())
  const page = Object.values(data.query?.pages || {})[0]
  if (page && !page.missing && page.thumbnail?.source) {
    return { src: page.thumbnail.source, caption: page.title }
  }
  return null
}

export function useWikipediaImage(parkName) {
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

    // Try three query formats in order of specificity
    const attempts = [
      `${parkName}, San Francisco`,
      `${parkName}`,
      `${parkName}, San Francisco, California`,
    ]

    attempts.reduce(
      (chain, query) => chain.then(result => result || fetchWikiImage(query)),
      Promise.resolve(null)
    )
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
