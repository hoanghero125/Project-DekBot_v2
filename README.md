# DekBot v2

A feature-rich Discord music bot with multi-platform support, rich embed UI, and utility commands — built with **discord.js v14** and **DisTube v5**.

Supports **YouTube**, **Spotify**, **Apple Music**, **SoundCloud**, and [700+ other sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) via yt-dlp.

## Features

### Music
- Play songs via URL or search query from YouTube, Spotify, Apple Music, SoundCloud, and 700+ more sites
- Full queue management — play, skip, stop, view queue
- YouTube playlist & radio/mix support (auto-capped at 25 tracks for infinite mixes)
- Spotify track, album, and playlist resolution (no API key needed)
- Apple Music track and album resolution via iTunes API with page-scraping fallback
- Scored best-match search — picks the most accurate YouTube result for Spotify/Apple Music tracks
- Full song names, thumbnails, durations, requester info, and platform icons in all embeds

### Utilities
- Minecraft server status lookup with player count bar
- Bot info card with live stats (server count, uptime) and creator portfolio link

### Bot UX
- Dual interface: slash commands (`/play`, `/skip`, …) and prefix commands (`^play`, `^skip`, …)
- Consistent branded embeds with semantic colors (music pink, success green, error red, warning yellow)
- Centralized theme system (`utils/theme.js`) — shared color palette, emoji icon kit, embed builders
- Source-aware styling — YouTube red, Spotify green, Apple Music red, SoundCloud orange
- Timestamps, footers, and thumbnails on every response
- Graceful error handling with rich error embeds

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [FFmpeg](https://ffmpeg.org/) (bundled via `ffmpeg-static`, no manual install needed)
- A [Discord bot application](https://discord.com/developers/applications) with a bot token

yt-dlp is downloaded automatically on first run (managed by `@distube/yt-dlp`).

## Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/hoanghero125/Project-DekBot_v2.git
   cd Project-DekBot_v2
   npm install
   ```

2. **Configure environment**

   Create a `.env` file in the project root:

   ```env
   BOT_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here
   PREFIX=^
   ```

   `GUILD_ID` registers slash commands instantly to that server (good for development). Remove it to register global commands instead (takes up to an hour to propagate).

3. **Register slash commands**

   ```bash
   npm run deploy
   ```

4. **Start the bot**

   ```bash
   npm start
   ```

## Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `/play <query>` | `^play`, `^p` | Play a song or add it to the queue. Accepts URLs or search terms. |
| `/skip` | `^skip`, `^s` | Skip the current song |
| `/stop` | `^stop` | Stop playback and clear the queue |
| `/queue` | `^queue`, `^q` | Show the current music queue |
| `/help` | `^help` | List all commands |
| `/mcsv <ip> <port>` | `^mcsv` | Check a Minecraft server's status |
| `/info` | `^info` | Show bot info, stats, and creator portfolio |

## How Music Resolution Works

The bot uses a custom `MusicPlugin` (`plugins/music-plugin.js`) that routes URLs to the right handler:

| Source | Method |
|--------|--------|
| **YouTube URLs & text searches** | Direct yt-dlp resolution |
| **YouTube playlists & mixes** | yt-dlp with flat-playlist; radio mixes capped at 25 tracks |
| **Spotify tracks** | `spotify-url-info` → metadata → scored YouTube search |
| **Spotify albums & playlists** | Each track resolved individually via scored YouTube search |
| **Apple Music tracks** | iTunes API lookup → scored YouTube search |
| **Apple Music albums** | iTunes API lookup → per-track scored YouTube search |
| **Apple Music (fallback)** | Page scraping for `og:title` → YouTube search |
| **All other URLs** | yt-dlp (supports SoundCloud, Bandcamp, and 700+ sites) |

**Scored search** scrapes YouTube search results and picks the candidate that best matches the known artist + track name, avoiding mismatches on cover versions or lyric videos.

No Spotify API credentials are needed — `spotify-url-info` extracts metadata without authentication.

## Project Structure

```
Project-DekBot_v2/
├── commands/
│   ├── help.js          # /help — categorized command list
│   ├── info.js          # /info — bot info & creator portfolio
│   ├── mcserver.js      # /mcsv — Minecraft server status
│   ├── play.js          # /play — music playback
│   ├── queue.js         # /queue — queue display
│   ├── skip.js          # /skip — skip current song
│   └── stop.js          # /stop — stop & clear queue
├── plugins/
│   └── music-plugin.js  # Custom DisTube plugin (YouTube, Spotify, Apple Music)
├── utils/
│   └── theme.js         # Centralized UI theme (colors, icons, embed builders)
├── deploy-commands.js   # Slash command registration script
├── main.js              # Bot entry point & DisTube event handlers
├── package.json
├── LICENSE
└── README.md
```

## Tech Stack

| Package | Purpose |
|---------|---------|
| `discord.js` v14 | Discord API client |
| `distube` v5 | Music framework |
| `@distube/yt-dlp` | YouTube & 700+ site extraction |
| `spotify-url-info` | Spotify metadata (no API key) |
| `minecraft-server-util` | Minecraft server pings |
| `@discordjs/voice` + `@discordjs/opus` | Voice connection & audio encoding |
| `ffmpeg-static` | Bundled FFmpeg binary |

## License

[MIT](LICENSE)
