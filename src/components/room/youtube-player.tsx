'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { parseYouTubeUrl } from '@/lib/utils'

export interface YouTubePlayerHandle {
  play: () => void
  pause: () => void
  seekTo: (time: number) => void
  getCurrentTime: () => number
  getPlayerState: () => number
  loadVideo: (videoId: string) => void
}

interface YouTubePlayerProps {
  videoUrl: string
  isPlaying: boolean
  currentTime: number
  onStateChange: (state: { isPlaying: boolean; currentTime: number }) => void
  onReady?: () => void
}

type YTPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (time: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getPlayerState: () => number
  loadVideoById: (videoId: string) => void
  destroy: () => void
}

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, config: {
        height?: string | number
        width?: string | number
        videoId?: string
        playerVars?: Record<string, string | number | undefined>
        events?: {
          onReady?: () => void
          onStateChange?: (e: { data: number }) => void
          onError?: (e: { data: number }) => void
        }
      }) => YTPlayer
      PlayerState: {
        UNSTARTED: number
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

const PLAYER_STATES: Record<number, string> = {
  [-1]: 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'cued',
}

let apiLoaded = false
let apiLoadPromise: Promise<void> | null = null

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve()
  if (apiLoadPromise) return apiLoadPromise

  apiLoadPromise = new Promise<void>((resolve) => {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.onload = () => {
      window.onYouTubeIframeAPIReady = () => {
        apiLoaded = true
        resolve()
      }
    }
    document.head.appendChild(tag)
  })

  return apiLoadPromise
}

export function YouTubePlayer({
  videoUrl,
  isPlaying,
  currentTime,
  onStateChange,
  onReady,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoId = parseYouTubeUrl(videoUrl)
  const syncInProgress = useRef(false)

  // Initialize player
  useEffect(() => {
    if (!videoId) return
    let player: YTPlayer | null = null

    loadYouTubeAPI().then(() => {
      if (!containerRef.current) return

      try {
        player = new window.YT!.Player(containerRef.current.id || 'youtube-player', {
          height: '100%',
          width: '100%',
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
          },
          events: {
            onReady: () => {
              playerRef.current = player
              setReady(true)
              onReady?.()
            },
            onStateChange: (e: { data: number }) => {
              if (syncInProgress.current) return
              const state = PLAYER_STATES[e.data]
              if (state === 'playing' || state === 'paused') {
                onStateChange({
                  isPlaying: state === 'playing',
                  currentTime: player?.getCurrentTime() ?? 0,
                })
              }
            },
            onError: (e: { data: number }) => {
              const messages: Record<number, string> = {
                2: 'Invalid video ID',
                5: 'Video playback error',
                100: 'Video not found or removed',
                101: 'Video embedding not allowed',
                150: 'Video embedding not allowed',
              }
              setError(messages[e.data] ?? 'YouTube player error')
            },
          },
        })
      } catch {
        setError('Failed to create YouTube player')
      }
    })

    return () => {
      try { player?.destroy() } catch { /* ignore */ }
      playerRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // Sync external play/pause to player
  useEffect(() => {
    const p = playerRef.current
    if (!p || !ready) return
    syncInProgress.current = true

    try {
      const currentState = p.getPlayerState()
      const isCurrentlyPlaying = currentState === 1

      // Seek first if we received a time that's far off
      const curTime = p.getCurrentTime()
      if (Math.abs(curTime - currentTime) > 1.5) {
        p.seekTo(currentTime, true)
      }

      if (isPlaying && !isCurrentlyPlaying) {
        p.playVideo()
      } else if (!isPlaying && isCurrentlyPlaying) {
        p.pauseVideo()
      }
    } finally {
      setTimeout(() => { syncInProgress.current = false }, 100)
    }
  }, [isPlaying, currentTime, ready])

  if (!videoId) {
    return (
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ background: 'rgba(4,4,12,1)' }}
      >
        <p className="text-[#5a5a72] text-sm">No video configured for this room</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ background: 'rgba(4,4,12,1)' }}
      >
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ background: 'rgba(4,4,12,1)' }}
      >
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-[#5a5a72]">Loading player...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      <div
        id="youtube-player"
        ref={containerRef}
        className="w-full h-full"
      />
    </div>
  )
}
