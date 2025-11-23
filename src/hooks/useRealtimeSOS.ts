'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { SosReport } from '@/components/MapView'

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: any
  old: any | null
}

interface UseRealtimeSOSOptions {
  onInsert?: (report: SosReport) => void
  onUpdate?: (report: SosReport) => void
  onDelete?: (id: string) => void
  enabled?: boolean
}

/**
 * Hook để subscribe Supabase Realtime changes cho SOS reports
 * Tự động cập nhật khi có INSERT, UPDATE, DELETE trong bảng sos_reports
 */
export function useRealtimeSOS({
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeSOSOptions) {
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete })

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete }
  }, [onInsert, onUpdate, onDelete])

  useEffect(() => {
    if (!enabled) return

    // Transform database record to frontend SosReport format
    const transformReport = (dbRecord: any): SosReport => ({
      id: dbRecord.id,
      lat: dbRecord.lat,
      lon: dbRecord.lon,
      peopleCount: dbRecord.people_count,
      urgency: dbRecord.urgency,
      description: dbRecord.description || '',
      hasVulnerable: dbRecord.has_vulnerable || false,
      status: dbRecord.status,
      createdAt: dbRecord.created_at,
    })

    const channel = supabase.channel('realtime-sos-reports').on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sos_reports',
      },
      (payload: RealtimePayload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const report = transformReport(payload.new)
          callbacksRef.current.onInsert?.(report)
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const report = transformReport(payload.new)
          callbacksRef.current.onUpdate?.(report)
        } else if (payload.eventType === 'DELETE' && payload.old) {
          callbacksRef.current.onDelete?.(payload.old.id)
        }
      }
    )

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled])
}
