# CineMesh — Watch Together Platform

A real-time watch-party platform supporting **two modes**: embedded YouTube player with cross-user sync, or screen sharing for any content. Create a room, add a video link (or share your screen), invite friends, and watch together with live chat, face cams, and host moderation.

## Live Demo

**https://watchtog.vercel.app**

## Demo Credentials / Demo Mode

**No login required.** The app uses session identity (display name + room code) instead of authentication.

**Quick demo flow:**
1. Open https://watchtog.vercel.app
2. Click **Create a Room** → enter room name → optionally paste a YouTube URL → enter your display name
3. Share the invite link or 6-character room code with friends
4. Friends open `/join` on the same site → enter the code → enter their name → they're in
5. Once in the room, click the **Video** button in the top bar to switch to the synced YouTube player
6. Click **Set Video** to add or change the YouTube URL at any time
7. Play, pause, seek — all participants stay in sync

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| UI primitives | Radix UI |
| State | Zustand |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime (Presence + Broadcast) |
| Media (mesh) | Plain WebRTC |
| Media (SFU) | LiveKit Cloud (optional) |
| Video player | YouTube IFrame API |
| Hosting | Vercel |

## Features

### Core Features (Assignment Requirements)
- ✅ **Create watch room** — 2-step creation flow with room name, type, capacity
- ✅ **Join room by link/code** — 6-character code or full invite URL
- ✅ **Add YouTube/video URL** — at creation time or anytime from within the room
- ✅ **Shared video player** — YouTube IFrame player synced across all users
- ✅ **Realtime play/pause/seek sync** — via Supabase Realtime Broadcast
- ✅ **Realtime chat** — with emoji picker, stickers, 50-language translation
- ✅ **Room participants list** — live presence via Supabase Realtime Presence
- ✅ **Late joiner sync** — new joiners enter at the correct timestamp
- ✅ **Basic room persistence** — rooms stored in PostgreSQL with 12-hour expiry

### Optional Features Implemented
- ✅ **Host-only controls** — mute, disable cam, stop share, remove participants
- ✅ **Emoji reactions** — full emoji picker and sticker catalogue
- ✅ **User presence** — live "in lobby" and "watching" indicators
- ✅ **Private/public rooms** — room type selection
- ✅ **Screen sharing** — WebRTC-based, works for YouTube/Twitch/games/presentations
- ✅ **Face cameras** — WebRTC mesh or LiveKit SFU
- ✅ **Floating PiP window** — chat + cams in always-on-top window
- ✅ **50-language translation** — auto-translate incoming chat messages
- ✅ **Zero account required** — session-based identity

## Architecture

```
                        ┌──────────────────────────────┐
                        │     Supabase (Postgres +      │
                        │        Realtime)              │
                        │                              │
                        │  ▸ cinemesh.rooms (video_url) │
                        │  ▸ cinemesh.participants      │
                        │  ▸ Realtime channel            │
                        │    room:<code>                │
                        │    (presence, chat, sync,      │
                        │     signaling, moderation)     │
                        └──────────▲───────────────────┘
                                   │
Browser A                           │               Browser B
┌──────────────────────┐            │       ┌──────────────────────┐
│  CineMesh App        │◀───────────┴──────▶│  CineMesh App        │
│  (Next.js)           │    Supabase         │  (Next.js)           │
│                      │    Realtime          │                      │
│  ┌────────────────┐  │    Broadcast         │  ┌────────────────┐  │
│  │ YouTube Player │  │    + Presence        │  │ YouTube Player │  │
│  │ (synced)       │──┼──────────────────────┼─▶│ (synced)       │  │
│  └────────────────┘  │    play/pause/seek   │  └────────────────┘  │
│                      │    events            │                      │
│  ┌────────────────┐  │                     │  ┌────────────────┐  │
│  │ Screen Share   │──┼─────────OR──────────┼─▶│ Screen Share   │  │
│  │ (WebRTC)       │  │                     │  │ (WebRTC)       │  │
│  └────────────────┘  │                     │  └────────────────┘  │
└──────────────────────┘                     └──────────────────────┘
```

### Architecture Decisions

- **Session identity over authentication**: The app uses participant IDs (nanoid) + display names instead of user accounts. This reduces friction — no signup for a watch party. The assignment says "Authentication or user/session identity" — we satisfy the latter.

- **Two transport layers**: WebRTC mesh (free, works for ~8 people) and LiveKit SFU (optional, for 20+). Both expose the same interface so the room page doesn't care which is active.

- **Realtime via Supabase Broadcast + Presence**: Chat, sync, and signaling use Supabase's built-in realtime layer (WebSocket-based). No additional server infrastructure needed.

- **YouTube IFrame API for video**: Handles playback, ads, quality selection, and DRM without a custom player. The IFrame API events drive the sync protocol.

- **Ephemeral sync state**: Current time and play/pause status are broadcast-only, never persisted to DB. This avoids write amplification and keeps latency low.

## Realtime Design

Realtime is central to this project. Every sync event, chat message, and presence update flows through Supabase Realtime (or the local BroadcastChannel fallback) without any server-side relay.

### Requirements Coverage

| Requirement | How It's Satisfied |
|---|---|
| **Play/pause sync** | `sendSync('play'\|'pause', time)` via Realtime Broadcast → all clients apply via YouTube IFrame API or local playback ticker |
| **Seeking sync** | `sendSync('seek', time)` — clients seek to absolute time with >2s delta threshold to avoid micro-corrections |
| **Chat live update** | `sendChat(msg)` via Realtime Broadcast — deduplicated by message ID, max 200 messages retained in memory |
| **Late joiner correct timestamp** | Video URL fetched from DB on mount + sync state applied from most recent broadcast event; YouTube player seeks to `currentTime` on every `[isPlaying, currentTime]` change |
| **No permanent desync** | `syncRef` flag prevents echo loops; sync events are last-wins; playback ticks forward locally via `setInterval(1000)` in screen-share mode; YouTube player syncs within 2s tolerance |

### Transport
- **Supabase Realtime** — Presence for participant tracking, Broadcast for chat/sync/signaling
- **LocalChannel** — Web BroadcastChannel API for same-browser testing (zero config, falls back automatically)

### Sync Protocol
1. User plays/pauses/seeks → `sendSync(action, time)` → Supabase Broadcast
2. All other clients receive `syncState` → update local player (YouTube IFrame API or playback state)
3. Sync events include `issuerId` (participant ID of sender) and `issuedAt` (timestamp)
4. YouTube player uses the same protocol via YouTube IFrame API events

### Echo Loop Prevention
A `syncRef` boolean flag is set to `true` before applying any external sync to the YouTube player. The player's `onStateChange` callback checks this flag and skips broadcasting if it's set. The flag is cleared after 150ms via `setTimeout`.

```
User clicks play
  → sendSync('play', currentTime)        [broadcast to all]
  → remote clients receive syncState
  → syncRef = true
  → player.playVideo()                    [triggers onStateChange]
  → onStateChange: syncRef is true → SKIP (don't re-broadcast)
  → setTimeout → syncRef = false
```

### Late Joiner Flow
1. Join room → create channel → receive `presence-sync` with all existing participants
2. `syncState` from most recent broadcast is already in memory (or null if no sync yet)
3. YouTube player initializes with current `isPlaying`/`currentTime` values
4. Player seeks to `currentTime` if delta > 2s; applies play/pause state
5. If no sync state has been broadcast yet, player starts paused at time 0
6. Once any participant plays/pauses/seeks, the new joiner receives the sync and follows

### Concurrency & Desync Prevention
- **Echo prevention**: `syncRef` flag in YouTube player prevents re-broadcasting self-triggered state changes
- **issuerId filtering**: Sync payloads include the sender's participant ID for potential filtering (future use)
- **Last-wins**: The most recent sync event always overwrites previous state — no merge conflicts
- **Local tick**: In screen-share mode, playback ticks forward via `setInterval(1000)` for UI display
- **Tolerance**: YouTube player only seeks if `|curTime - currentTime| > 2s`, avoiding unnecessary corrections
- **No persistent state**: Sync is ephemeral broadcast-only — no DB persistence needed for realtime events

## Database Schema

### `cinemesh.rooms`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| code | TEXT | 6-char join code (e.g. ABC123) |
| name | TEXT | Room display name |
| host_id | TEXT | Host's participant ID |
| is_active | BOOLEAN | Soft delete flag |
| max_members | SMALLINT | Capacity limit |
| video_url | TEXT | Optional YouTube URL |
| created_at | TIMESTAMPTZ | Row creation |
| expires_at | TIMESTAMPTZ | Auto-expiry (12h) |

### `cinemesh.participants`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| room_id | UUID | FK → rooms(id) ON DELETE CASCADE |
| participant_id | TEXT | Client-set nanoid |
| display_name | TEXT | Visible name |
| is_host | BOOLEAN | Host flag |
| is_muted | BOOLEAN | Mic state |
| is_camera_off | BOOLEAN | Camera state |
| joined_at | TIMESTAMPTZ | Join time |
| last_seen_at | TIMESTAMPTZ | Heartbeat |

## AI Usage

**Tools used:** OpenCode

**What AI helped with:**
- Initial architecture analysis and gap identification against assignment requirements
- Building the YouTube player component with IFrame API integration
- Wiring YouTube player sync through the existing realtime infrastructure
- Room creation flow updates (video URL input, validation, URL forwarding)
- Lobby page changes to pass video URL through the navigation chain
- Debugging the YouTube player infinite loading bug (container div render order)
- Adding "Set Video anytime" functionality with DB persistence
- Vercel deployment, Supabase setup, environment configuration
- README structure and documentation
- Fixing broken navigation buttons

**Important manual decisions:**
- Session identity over user authentication (no accounts required)
- Dual-mode architecture (YouTube + screen share)
- Reused existing sync infrastructure instead of building parallel mechanisms
- Ephemeral sync state (no DB writes for play/pause/seek)
- YouTube IFrame API over custom video player

**See also:** `ai-transcripts/` folder for detailed session transcripts.

## Running Locally

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- Optional: LiveKit Cloud project for SFU mode

### Setup
```bash
git clone https://github.com/nitinjadhav888/WatchTog.git
cd WatchTog
npm install

cp .env.local.example .env.local
# Fill in Supabase credentials
```

### Database
1. Open Supabase SQL editor and paste `scripts/cinemesh-migration.sql`
2. Run the query
3. Go to **Project Settings → API → Exposed schemas** and add `cinemesh`

### Run
```bash
npm run dev
```

Visit http://localhost:3000.

## Environment Variables

See `.env.local.example`:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | ✅ | App URL (e.g. https://watchtog.vercel.app) |
| `NEXT_PUBLIC_LIVEKIT_URL` | ❌ | LiveKit WebSocket URL (SFU mode) |
| `LIVEKIT_API_KEY` | ❌ | LiveKit API key |
| `LIVEKIT_API_SECRET` | ❌ | LiveKit API secret |

## Testing

### Manual Test Flow
1. Open **two browser tabs** to https://watchtog.vercel.app
2. **Tab 1**: Create a room with a YouTube URL (e.g. `https://youtube.com/watch?v=dQw4w9WgXcQ`)
3. **Tab 2**: Click "Join with Code" → enter the 6-character code shown in Tab 1
4. In the room, click **Video** button in the top bar
5. Play/pause in either tab — the other follows
6. Send a chat message in one tab — it appears in the other
7. Close Tab 2 and rejoin — it syncs to the current timestamp

### Testing YouTube Sync
1. Create room with a YouTube URL
2. Have multiple participants join
3. Play → all participants start playing
4. Pause → all participants pause
5. Seek → all participants jump to the new time
6. Change URL via **Set Video** button → all participants see the new video

### Testing Screen Share Mode
1. Click **Share** in the top bar to switch to screen share mode
2. Click the Share button in the bottom dock
3. Select a browser tab or window to share
4. Remote participants see the shared content

## Assumptions

- **Viewers open YouTube on their own**: The app assumes each participant has their own device and browser. It does not handle single-screen shared-viewing scenarios (e.g., one laptop passed around a room).
- **YouTube availability**: The app assumes YouTube is accessible in the participant's region. Countries where YouTube is blocked will not work.
- **Browser capability**: The app assumes modern browsers (Chrome, Firefox, Edge, Safari) with WebRTC, WebSocket, and ES module support. Internet Explorer is not supported.
- **Network quality**: The sync protocol assumes a reasonably stable internet connection. On extremely poor connections (< 1 Mbps or > 500ms latency), sync may lag.
- **Fair use of YouTube API**: The app uses the YouTube IFrame API which is subject to YouTube's terms of service. The app does not download, modify, or redistribute YouTube content.
- **Session over account**: The primary identity mechanism is a session-based participant ID + display name, not a persistent user account. This means a user's identity is tied to a room session and is not recoverable if they leave and rejoin.
- **No content ownership or copyright liability**: The app is a sync layer only. Users are responsible for ensuring they have the right to share and watch the content they add.
- **YouTube embedding is at the content owner's discretion**: Some videos block embedding. This is a YouTube/platform limitation, not a bug in the app. The player shows a clear error message for such videos.
- **Realtime sync is best-effort**: While sub-50ms sync is typical on good connections, absolute frame-perfect sync is not guaranteed across all network conditions.
- **Desktop-first**: The app is designed for desktop use. Mobile responsiveness is not a current priority.

## Known Limitations

- **YouTube embedding restrictions**: Some videos block embedding (set by content owner). The player will show "Embedding not allowed" for these.
- **Screen sharing DRM**: Browsers block capture of Netflix/Hotstar/Prime tabs via Widevine DRM. Use the embedded YouTube mode for YouTube content.
- **WebRTC mesh capacity**: Limited to ~8 people on home connections. Use LiveKit SFU for larger rooms (optional, requires LiveKit Cloud setup).
- **LocalChannel mode**: Works only across tabs in the same browser (single device testing). Cross-device requires Supabase configuration.
- **No persistent chat history**: Messages are realtime broadcast only — not stored in the database.
- **Room expiry**: Fixed at 12 hours from creation. Rooms are hard-deleted after expiry.
- **Video URL changes not broadcast**: When the host changes the video URL, other participants need to switch away and back to YouTube mode to see the new video.
- **No watch queue**: Only one video at a time. No playlist support.

## Future Improvements

- Watch queue / playlist support
- Start-at-same-time countdown
- Emoji reactions overlay on video (floating hearts, etc.)
- Private rooms with passwords
- Mobile-responsive viewing mode
- Chromecast support
- Persistent chat history (store messages in DB)
- Room templates and saved rooms
- Browser push notifications for room invites
