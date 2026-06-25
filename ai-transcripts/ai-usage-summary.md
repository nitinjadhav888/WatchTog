# AI Usage Summary

## Tools Used

- **OpenCode** — Primary AI coding assistant for all development work

## What AI Helped With

### Analysis & Planning
- Analyzed the existing CineMesh codebase against the 11auction assignment requirements
- Identified gaps: YouTube URL input, embedded player, mode toggle, missing documentation
- Created a structured execution plan with clear priorities

### YouTube Player Integration
- Built `YouTubePlayer` component using YouTube IFrame API
- Wired YouTube player state changes (play/pause/seek) through the existing Supabase Realtime sync system
- Handled edge cases: late joiner sync, loading states, error states (invalid video ID, embedding blocked)
- Prevents sync loops with `syncInProgress` ref flag

### Room Creation Flow
- Added video URL input field to the 2-step room creation form
- Added client-side YouTube URL validation with regex
- Passes `videoUrl` through URL params: create → lobby → room
- Shows video URL in room summary

### Lobby Page
- Reads `videoUrl` from search params and forwards to room page
- Zero changes to existing lobby UX — video URL is transparent passthrough

### Room Page
- Added `viewMode` toggle (YouTube / Screen Share)
- Mode toggle UI in top bar with YouTube and Monitor icons
- YouTube player renders in the main view area with proper aspect ratio and styling
- Both modes coexist — users can switch between embedded video and screen share

### Documentation
- Updated README with assignment-required sections:
  - Live Demo, Demo Credentials, Tech Stack, Features
  - Architecture diagram, Realtime Design, Database Schema
  - AI Usage notes, Running Locally, Environment Variables
  - Known Limitations, Future Improvements
- Created AI usage summary and transcript folder

## Important Manual Decisions

1. **Dual-mode architecture**: Kept the existing screen-sharing as a separate mode rather than replacing it. Users get the best of both — embedded YouTube sync OR screen sharing for any content.

2. **Reused existing sync infrastructure**: The YouTube player was wired into the existing `PlaybackState`/`SyncPayload` system rather than creating a parallel sync mechanism. This means chat, presence, and all other features work unchanged with the new mode.

3. **No DB persistence for sync state**: Sync state (current time, playing status) is ephemeral via Supabase Broadcast. This was a deliberate choice — storing millisecond-precision timestamps in the DB would add latency and complexity without meaningful benefit.

4. **YouTube IFrame API over custom player**: Using the official YouTube IFrame API gives us reliable playback, ad handling, quality selection, and DRM compliance without building a custom video player.

5. **Client-side URL validation**: YouTube URLs are validated with regex patterns before room creation. This gives immediate feedback without a server round-trip.

6. **URL passthrough, not DB fetch on join**: The video URL is passed through URL params rather than fetched from the DB on every room join. This reduces latency and works even in local (BroadcastChannel) mode without Supabase.

## What I Rejected from AI Suggestions

- The AI initially suggested storing `currentTime` in the database for persistence — rejected because broadcast-based sync is adequate and avoids DB write amplification
- The AI suggested a full-screen YouTube overlay that replaces the participant strip — rejected in favor of keeping the existing layout with the player in the main view area

## Known Limitations (AI-Generated Code)

- The YouTube player component uses `id="youtube-player"` as a fixed element ID, which could conflict if multiple players exist on the same page (not an issue in current architecture)
- Sync timing uses a 100ms debounce on `syncInProgress` — very brief but could theoretically miss a rapid play→pause sequence
- No YouTube URL validation on the server side — relies on client-side regex and YouTube API error handling

## How to Reproduce This Work

The full session context is captured in this conversation. To reproduce, load the CineMesh project in an AI coding tool with access to the file system and provide the 11auction assignment requirements as context.
