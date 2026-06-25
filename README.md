# CineMesh — Watch Together Platform

A real-time watch-party platform supporting **two modes**: embedded YouTube player with cross-user sync, or screen sharing for any content. Create a room, add a video link (or share your screen), invite friends, and watch together with live chat, face cams, and host moderation.

## Live Demo

**https://cinemesh.vercel.app**

## Demo Credentials

No login required. Just:
1. Create a room with any name
2. Add an optional YouTube URL
3. Share the 6-character room code with friends
4. They join by entering the code at /join

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

- **Dual watching modes** — Embed a YouTube URL for synced playback OR share your screen for any content
- **Synced YouTube player** — play, pause, seek syncs across all room participants
- **Late joiner sync** — new joiners are placed at the correct timestamp
- **Screen sharing** with system audio (works for YouTube, Twitch, games, presentations)
- **Real-time chat** with emoji picker, custom stickers, and 50-language auto-translation
- **Face cameras** via WebRTC (mesh mode) or LiveKit SFU (for 20+ person rooms)
- **Floating PiP window** — pop chat + cams into an always-on-top window
- **Host moderation** — mute, disable cam, stop share, or remove participants
- **Zero account required** — share a 6-character code or invite link
- **Room persistence** — rooms stored in PostgreSQL with 12-hour expiry

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

## Realtime Design

### Transport
- **Supabase Realtime** — Presence for participant tracking, Broadcast for chat/sync/signaling
- **LocalChannel** — Web BroadcastChannel API for same-browser testing (zero config)

### Sync Protocol
1. User plays/pauses/seeks → `sendSync(action, time)` → Supabase Broadcast
2. All other clients receive `syncState` → update local player
3. Late joiners receive current state on presence sync
4. YouTube player uses the same protocol via YouTube IFrame API events

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
- README structure and documentation

**Important manual decisions:**
- Kept the existing screen-sharing architecture as a fallback mode rather than replacing it
- Used YouTube IFrame API instead of a custom video player for reliability
- Wired YouTube sync through the existing PlaybackState/SyncPayload system to reuse proven code
- Added mode toggle (Video / Share) in the top bar rather than hiding the choice in menus
- Validated YouTube URLs client-side with regex before room creation
- Chose not to store `currentTime` in the database — sync state is ephemeral via broadcast

**See also:** `ai-transcripts/` folder for detailed session transcripts.

## Running Locally

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- Optional: LiveKit Cloud project for SFU mode

### Setup
```bash
git clone https://github.com/your-username/cinemesh.git
cd cinemesh
npm install

cp .env.local.example .env.local
# Fill in Supabase credentials
```

### Database
Open Supabase SQL editor and paste `scripts/cinemesh-migration.sql`. Add `cinemesh` to exposed schemas in Settings → API.

### Run
```bash
npm run dev
```

Visit http://localhost:3000.

## Environment Variables

See `.env.local.example`:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (required)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (required)
- `NEXT_PUBLIC_APP_URL` — App URL (default: http://localhost:3000)
- `NEXT_PUBLIC_LIVEKIT_URL` — LiveKit WebSocket URL (optional, for SFU)
- `LIVEKIT_API_KEY` — LiveKit API key (optional)
- `LIVEKIT_API_SECRET` — LiveKit API secret (optional)

## Known Limitations

- YouTube embedding restrictions: some videos block embedding (set by content owner)
- Screen sharing DRM: browsers block capture of Netflix/Hotstar/Prime tabs
- WebRTC mesh limited to ~8 people on home connections; LiveKit SFU recommended for larger rooms
- LocalChannel mode works only across tabs in the same browser (single device testing)
- No persistent chat history — messages are realtime broadcast only
- Room expiry is fixed at 12 hours from creation

## Future Improvements

- Watch queue (playlist of videos)
- Start-at-same-time countdown
- Emoji reactions overlay on video
- Private rooms with passwords
- Mobile-responsive viewing mode
- Chromecast support
- Persistent chat history
- Room templates and saved rooms
