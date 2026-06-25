'use client'

import { useEffect, useRef, useState } from 'react'
import { parseYouTubeUrl } from '@/lib/utils'

interface YouTubePlayerProps {
  videoUrl: string
  isPlaying: boolean
  currentTime: number
  onStateChange: (state: { isPlaying: boolean; currentTime: number }) => void
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
      PlayerState: { UNSTARTED: number; ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiLoadPromise: Promise<void> | null = null

function loadYouTubeAPI(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise
  if (typeof window === 'undefined') return Promise.reject(new Error('Server-side'))
  if (window.YT?.Player) return Promise.resolve()

  apiLoadPromise = new Promise<void>((resolve) => {
    window.onYouTubeIframeAPIReady = () => { resolve() }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })

  // Timeout after 15s
  const timeout = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('YouTube API load timeout')), 15000)
  )

  apiLoadPromise = Promise.race([apiLoadPromise, timeout])
  return apiLoadPromise
}

let playerIdCounter = 0

export function YouTubePlayer({
  videoUrl,
  isPlaying,
  currentTime,
  onStateChange,
}: YouTubePlayerProps) {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const syncRef = useRef(false)
  const videoId = parseYouTubeUrl(videoUrl)
  const playerId = useRef(`yt-${++playerIdCounter}`)

  // Initialize player — container div is always in DOM
  useEffect(() => {
    if (!videoId) return
    let destroyed = false
    let player: YTPlayer | null = null

    loadYouTubeAPI()
      .then(() => {
        if (destroyed) return
        const id = playerId.current
        const div = document.getElementById(id)
        if (!div) return

        try {
          player = new window.YT!.Player(id, {
            height: '100%',
            width: '100%',
            videoId,
            playerVars: {
              autoplay: 0,
              controls: 1,
              modestbranding: 1,
              rel: 0,
              enablejsapi: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                playerRef.current = player
                setStatus('ready')
              },
              onStateChange: (e: { data: number }) => {
                if (syncRef.current || !player) return
                const state = e.data
                if (state === 1 || state === 2) {
                  onStateChange({
                    isPlaying: state === 1,
                    currentTime: player.getCurrentTime(),
                  })
                }
              },
              onError: (e: { data: number }) => {
                const msgs: Record<number, string> = {
                  2: 'Invalid video ID',
                  5: 'Video playback error',
                  100: 'Video not found or removed',
                  101: 'Embedding not allowed by content owner',
                  150: 'Embedding not allowed by content owner',
                }
                setStatus('error')
                setErrorMsg(msgs[e.data] ?? `YouTube error (code ${e.data})`)
              },
            },
          })
        } catch (err) {
          setStatus('error')
          setErrorMsg('Failed to create YouTube player')
        }
      })
      .catch(() => {
        if (!destroyed) {
          setStatus('error')
          setErrorMsg('YouTube API failed to load. Check your internet or ad blocker.')
        }
      })

    return () => {
      destroyed = true
      try { player?.destroy() } catch { /* ignore */ }
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // Sync external play/pause/seek to the player
  useEffect(() => {
    const p = playerRef.current
    if (!p) return
    syncRef.current = true

    try {
      const curState = p.getPlayerState()
      const curTime = p.getCurrentTime()

      if (Math.abs(curTime - currentTime) > 2) {
        p.seekTo(currentTime, true)
      }

      if (isPlaying && curState !== 1) {
        p.playVideo()
      } else if (!isPlaying && curState === 1) {
        p.pauseVideo()
      }
    } finally {
      setTimeout(() => { syncRef.current = false }, 150)
    }
  }, [isPlaying, currentTime])

  if (!videoId) {
    return (
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ background: 'rgba(4,4,12,1)' }}
      >
        <p className="text-[#5a5a72] text-sm">No video configured. Click "Set Video" above.</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" style={{ background: '#000' }}>
      {/* Container div — always rendered so YT.Player can find it */}
      <div
        id={playerId.current}
        ref={containerRef}
        className="w-full h-full"
        style={status !== 'ready' ? { display: 'none' } : undefined}
      />

      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin mx-auto" />
            <p className="text-sm text-[#5a5a72]">Loading YouTube player...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center max-w-sm px-4">
            <p className="text-red-400 text-sm mb-1">{errorMsg}</p>
            <p className="text-[#5a5a72] text-xs">Try a different YouTube link or click "Change URL" above.</p>
          </div>
        </div>
      )}
    </div>
  )
}
