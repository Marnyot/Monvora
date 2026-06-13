'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'monvora:balance-visible'
const EVENT_NAME = 'monvora-balance-visibility-change'

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(STORAGE_KEY) !== '0'
}

function getServerSnapshot(): boolean {
  return true
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback)
  window.addEventListener(EVENT_NAME, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(EVENT_NAME, callback)
  }
}

export function useBalanceVisibility(): [boolean, (next: boolean) => void] {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  function setVisible(next: boolean) {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    window.dispatchEvent(new Event(EVENT_NAME))
  }
  return [visible, setVisible]
}
