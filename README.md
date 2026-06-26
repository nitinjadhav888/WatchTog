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

### Transport
- **Supabase Realtime** — Presence for participant tracking, Broadcast for chat/sync/signaling
- **LocalChannel** — Web BroadcastChannel API for same-browser testing (zero config, falls back automatically)

### Sync Protocol
1. User plays/pauses/seeks → `sendSync(action, time)` → Supabase Broadcast
2. All other clients receive `syncState` → update local player
3. Late joiners receive current state on presence sync
4. YouTube player uses the same protocol via YouTube IFrame API events

### Concurrency Handling
- `syncInProgress` ref flag prevents echo loops (player event → sync → remote player event → sync back)
- Sync state includes `issuerId` to ignore events from self
- Playback ticks forward locally using `setInterval` when in screen-share mode

### Late Joiner Flow
1. Join room → receive presence-sync with all participants
2. Receive current sync state (play/pause + timestamp)
3. YouTube player seeks to the correct time and applies play/pause state
4. If no sync state yet, player starts paused at time 0

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
