import { useState, useCallback } from 'react'

const STORAGE_KEY = 'sf-playground-notes'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

export function useLocalData() {
  const [data, setData] = useState(load)

  const save = useCallback((id, patch) => {
    setData(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const getEntry = useCallback((id) => data[id] || {}, [data])

  return { getEntry, save }
}
