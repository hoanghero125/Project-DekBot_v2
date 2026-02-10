# DekBot v2

A Discord music bot with multi-platform support, built with discord.js v14 and DisTube v5.

Supports **YouTube**, **Spotify**, **SoundCloud**, **Apple Music**, and [700+ other sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) via yt-dlp.

## Features

- Slash commands (`/play`, `/skip`, etc.) and prefix commands (`^play`, `^skip`, etc.)
- Music playback with queue management (play, skip, stop, queue display)
- Spotify and SoundCloud link resolution
- Minecraft server status lookup
- Configurable via `.env`

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation) installed and available in PATH
- [FFmpeg](https://ffmpeg.org/) (bundled via `ffmpeg-static`, no manual install needed)
- A [Discord bot application](https://discord.com/developers/applications) with a bot token

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

   Spotify credentials are optional -- Spotify links will still work without them, but rate limits may apply.

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
├─ deploy-commands.js
├─ LICENSE
├─ main.js
├─ package-lock.json
├─ package.json
└─ README.md
```

## License

[MIT](LICENSE)

