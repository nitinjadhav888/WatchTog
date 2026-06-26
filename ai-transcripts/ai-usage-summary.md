# AI Usage Summary

## Tools Used

- **OpenCode** — Primary AI coding assistant for all development work

## What AI Helped With

### Phase 1: Analysis & Planning
- Analyzed the existing CineMesh codebase against the 11auction assignment requirements
- Identified gaps: YouTube URL input, embedded player, mode toggle, missing documentation, deployment setup
- Created a structured execution plan with clear priorities

### Phase 2: YouTube Player Integration
- Built `YouTubePlayer` component using YouTube IFrame API (src/components/room/youtube-player.tsx)
- Wired YouTube player state changes (play/pause/seek) through the existing Supabase Realtime sync system
- Added error handling: invalid video ID, embedding blocked, network failures, API timeout
- Fixed critical bug: player container div not rendered before player init — caused infinite loading
- Added unique player IDs to prevent conflicts on re-renders
- Added 15-second API load timeout with user-visible error message

### Phase 3: Video URL Management
- Added video URL input to the 2-step room creation form
- Added client-side YouTube URL validation with regex
- Stored `video_url` in the database (cinemesh.rooms table)
- Added "Set Video" / "Change URL" button in the room top bar (always accessible)
- Added modal to set/change video URL from within the room
- Fetches video_url from DB for late joiners (not just URL params)

### Phase 4: Room Creation & Navigation Flow
- URL propagation: create → lobby → room for video URL
- DB fallback: room page fetches video_url from DB if not in URL params
- Added `updateRoomVideoUrl` API function to room-service.ts
- Added `parseYouTubeUrl` utility function with support for multiple YouTube URL formats

### Phase 5: UI Fixes
- Fixed broken "Sign in" button in landing nav (was a static button with no handler)
- Removed non-existent "Pricing" nav link
- Replaced with working "Join a Room" link

### Phase 6: Documentation & Deployment
- Updated README with assignment-required sections
- Created AI usage summary and transcript folder
- Set up Vercel deployment with environment variables
- Set up Supabase project with database migration
- Configured `cinemesh` schema exposure

## Important Manual Decisions

1. **Dual-mode architecture**: Kept screen-sharing as a separate mode. Users get embedded YouTube sync OR screen sharing for any content. This covers both the assignment spec and the existing codebase.

2. **Reused existing sync infrastructure**: YouTube player wired into the existing `PlaybackState`/`SyncPayload` system. Chat, presence, and all other features work unchanged with the new mode.

3. **No DB persistence for sync state**: Current time and playing status are ephemeral via Supabase Broadcast. Storing millisecond-precision timestamps in the DB would add latency without benefit.

4. **YouTube IFrame API over custom player**: Official YouTube IFrame API gives reliable playback, ad handling, quality selection, and DRM compliance without building a custom video player.

5. **Session identity over authentication**: The assignment says "Authentication or user/session identity". We chose session identity (participant ID + display name + room code) because it reduces friction — no signup required for a watch party. The "Sign in" button was removed since the app doesn't need it.

6. **Unique player element IDs**: Changed from static `id="youtube-player"` to generated IDs (`yt-1`, `yt-2`, etc.) to prevent conflicts when the component remounts.

7. **DB-backed video URL**: Initially video URL was only passed via URL params. Changed to also fetch from DB so joiners always get the right URL even if they joined via a link without URL params.

## What Was Rejected from AI Suggestions

- **DB persistence for currentTime**: AI suggested storing currentTime in the DB — rejected because broadcast-based sync is adequate and avoids DB write amplification
- **Full-screen YouTube overlay**: AI suggested replacing the participant strip with a full-screen player — rejected in favor of keeping the existing layout
- **Server-side YouTube URL validation**: AI suggested validating URLs server-side — rejected because client-side regex + YouTube API error handling covers all cases without extra latency

## Known Limitations

- YouTube embedding restrictions: some videos block embedding (set by content owner)
- Screen sharing DRM: browsers block capture of Netflix/Hotstar/Prime tabs
- WebRTC mesh limited to ~8 people; LiveKit SFU needed for larger rooms
- No persistent chat history — messages are realtime broadcast only
- Room expiry is fixed at 12 hours from creation
- Video URL changes don't broadcast in realtime (other users need to refresh or re-click the video mode)

## How to Reproduce This Work

The full session context is captured in this conversation. To reproduce, load the CineMesh project in an AI coding tool with access to the file system and provide the 11auction assignment requirements as context.
