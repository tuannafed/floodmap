// SOS Queue Manager for offline retry

export interface QueuedSOS {
  lat: number
  lon: number
  peopleCount: number
  urgency: 'high' | 'medium' | 'low'
  description: string
  hasVulnerable: boolean
  image?: File
  timestamp: number
  sent: boolean
}

const QUEUE_KEY = 'sosQueue'
const MAX_QUEUE_SIZE = 10

export function addToQueue(sos: Omit<QueuedSOS, 'timestamp' | 'sent'>) {
  const queue = getQueue()
  queue.push({
    ...sos,
    timestamp: Date.now(),
    sent: false,
  })
  // Keep only last MAX_QUEUE_SIZE items
  const trimmed = queue.slice(-MAX_QUEUE_SIZE)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed))
}

export function getQueue(): QueuedSOS[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

export function markAsSent(timestamp: number) {
  const queue = getQueue()
  const updated = queue.map((item) =>
    item.timestamp === timestamp ? { ...item, sent: true } : item
  )
  localStorage.setItem(QUEUE_KEY, JSON.stringify(updated))
}

export function removeFromQueue(timestamp: number) {
  const queue = getQueue()
  const filtered = queue.filter((item) => item.timestamp !== timestamp)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered))
}

export async function retryFailed() {
  const queue = getQueue()
  const failed = queue.filter((item) => !item.sent)

  for (const item of failed) {
    try {
      const formData = new FormData()
      formData.append('lat', String(item.lat))
      formData.append('lon', String(item.lon))
      formData.append('peopleCount', String(item.peopleCount))
      formData.append('urgency', item.urgency)
      formData.append('description', item.description)
      formData.append('hasVulnerable', String(item.hasVulnerable))
      if (item.image) {
        formData.append('image', item.image)
      }

      const response = await fetch('/api/sos/report', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        markAsSent(item.timestamp)
      }
    } catch (error) {
      console.error('Failed to retry SOS:', error)
    }
  }
}

// Auto-retry when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    retryFailed()
  })
}

