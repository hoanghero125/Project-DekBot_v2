# DekBot v2

A Discord music bot with multi-platform support, built with discord.js v14 and DisTube v5.

Supports **YouTube**, **Spotify**, **Apple Music**, **SoundCloud**, and [700+ other sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) via yt-dlp.

## Features

- Slash commands (`/play`, `/skip`, etc.) and prefix commands (`^play`, `^skip`, etc.)
- Music playback with queue management (play, skip, stop, queue display)
- Multi-platform link support: YouTube, Spotify, Apple Music, SoundCloud, and more
- YouTube playlist support
- Minecraft server status lookup
- Configurable via `.env`

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [FFmpeg](https://ffmpeg.org/) (bundled via `ffmpeg-static`, no manual install needed)
- A [Discord bot application](https://discord.com/developers/applications) with a bot token

yt-dlp is downloaded automatically on first run (managed by `@distube/yt-dlp`).

## Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/your-username/Project-DekBot_v2.git
   cd Project-DekBot_v2
   npm install
   ```

2. **Configure environment**

   Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env
   ```

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
| `/queue` | `^queue`, `^q` | Show the current queue |
| `/help` | `^help` | List all commands |
| `/mcsv <ip> <port>` | `^mcsv` | Check a Minecraft server's status |
| `/youtube` | `^youtube` | Show the creator's YouTube channel |

## How music resolution works

The bot uses a custom `MusicPlugin` that routes URLs to the right handler:

- **YouTube URLs** and **text searches** go directly through yt-dlp
- **Spotify links** are resolved via `spotify-url-info` to get track metadata, then searched on YouTube
- **Apple Music links** are resolved via the iTunes API to get track metadata, then searched on YouTube
- **All other URLs** (SoundCloud, Bandcamp, etc.) go through yt-dlp, which supports 700+ sites

No Spotify API credentials are needed for single tracks and small playlists.

## Project Structure

```
Project-DekBot_v2
├─ commands
│  ├─ help.js
│  ├─ mcserver.js
│  ├─ play.js
│  ├─ queue.js
│  ├─ skip.js
│  ├─ stop.js
│  └─ youtube.js
├─ plugins
│  └─ music-plugin.js
├─ deploy-commands.js
├─ main.js
├─ package.json
├─ LICENSE
└─ README.md
```

## License

[MIT](LICENSE)
