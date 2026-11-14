import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/services/apiClient'
import { inspectionService } from '@/services/inspectionService'
import type { AiProgress, UUID } from '@/types'

const POLL_INTERVAL_MS = 1500
/** After this long without DONE/FAILED the UI offers a retry. */
const TIMEOUT_MS = 3 * 60 * 1000

interface PollState {
  run: number
  progress: AiProgress | null
  timedOut: boolean
  /** Last polling error (network / API); polling keeps going. */
  pollError: string | null
}

export interface AiProgressState {
  progress: AiProgress | null
  timedOut: boolean
  pollError: string | null
  /** Starts a fresh polling run (resets the timeout), e.g. after `POST /ai-retry`. */
  restart: () => void
}

/**
 * Polls `GET /api/inspections/{sessionId}/ai-progress` every 1.5 s until the status is DONE or FAILED,
 * and stops when the component unmounts. Flags `timedOut` after 3 minutes without a final status.
 */
export function useAiProgress(sessionId: UUID, enabled = true): AiProgressState {
  const [run, setRun] = useState(0)
  const [state, setState] = useState<PollState>({ run: 0, progress: null, timedOut: false, pollError: null })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let pollTimer: number | undefined

    const timeoutTimer = window.setTimeout(() => {
      if (cancelled) return
      setState((prev) => (prev.run === run ? { ...prev, timedOut: true } : { run, progress: null, timedOut: true, pollError: null }))
    }, TIMEOUT_MS)

    const poll = async () => {
      try {
        const progress = await inspectionService.getAiProgress(sessionId)
        if (cancelled) return
        setState((prev) => ({ run, progress, timedOut: prev.run === run && prev.timedOut, pollError: null }))
        if (progress.status === 'DONE' || progress.status === 'FAILED') {
          window.clearTimeout(timeoutTimer)
          return
        }
      } catch (err) {
        if (cancelled) return
        setState((prev) => ({
          run,
          progress: prev.run === run ? prev.progress : null,
          timedOut: prev.run === run && prev.timedOut,
          pollError: getErrorMessage(err),
        }))
      }
      pollTimer = window.setTimeout(poll, POLL_INTERVAL_MS)
    }
    void poll()

    return () => {
      cancelled = true
      window.clearTimeout(pollTimer)
      window.clearTimeout(timeoutTimer)
    }
  }, [sessionId, enabled, run])

  const restart = useCallback(() => setRun((value) => value + 1), [])

  const current = state.run === run ? state : null
  return {
    progress: current?.progress ?? null,
    timedOut: current?.timedOut ?? false,
    pollError: current?.pollError ?? null,
    restart,
  }
}
