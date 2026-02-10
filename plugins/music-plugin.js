const { ExtractorPlugin, Song, Playlist } = require('distube');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { fetch } = require('undici');

// yt-dlp binary lives inside the @distube/yt-dlp package (auto-downloaded)
// resolve() gives us dist/index.js -> go up to package root, then into bin/
const YTDLP_BIN = path.join(
    path.dirname(require.resolve('@distube/yt-dlp')),
    '..', 'bin',
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp',
);

// Spotify metadata extraction (no API key needed for single tracks)
const spotifyGetData = require('spotify-url-info')(fetch).getData;

function log(tag, msg) {
    console.log(`[${tag}] ${msg}`);
}

class MusicPlugin extends ExtractorPlugin {
    // --- DisTube interface ---

    validate(url) {
        return typeof url === 'string';
    }

    async resolve(url, options) {
        if (isSpotifyUrl(url)) return this._resolveSpotify(url, options);
        if (isAppleMusicUrl(url)) return this._resolveAppleMusic(url, options);
        return this._resolveYtDlp(url, options);
    }

    async searchSong(query, options) {
        log('Search', `Searching YouTube for: "${query}"`);
        const searchFlags = { 'dump-json': true, 'dump-single-json': false };

        // Try the full query first
        let info = await this._runYtDlp(`ytsearch:${query}`, searchFlags);
        if (info?.id) {
            log('Search', `Found: "${info.title}" [${info.webpage_url}]`);
            return this._makeSong(info, options);
        }

        // If full query returned nothing and it's long, try a shorter version
        const words = query.split(' ');
        if (words.length > 4) {
            const short = words.slice(0, 4).join(' ');
            log('Search', `No results, retrying with shorter query: "${short}"`);
            info = await this._runYtDlp(`ytsearch:${short}`, searchFlags);
            if (info?.id) {
                log('Search', `Found: "${info.title}" [${info.webpage_url}]`);
                return this._makeSong(info, options);
            }
        }

        log('Search', 'No results found');
        return null;
    }

    async getStreamURL(song) {
        log('Stream', `Getting stream URL for: "${song.name}"`);
        const info = await this._runYtDlp(song.url, { format: 'ba/ba*' });

        if (!info.url) throw new Error(`Cannot get stream URL for: ${song.name}`);
        log('Stream', `Stream ready (${info.acodec || 'unknown'} codec)`);
        return info.url;
    }

    // --- Scored search (for Spotify / Apple Music) ---
    // Scrapes YouTube search results and picks the one that best matches the known artist + track name.

    async _searchBestMatch(artist, trackName, options) {
        // Strip all parenthetical content (subtitles, feat info, etc.) for a cleaner search
        const cleanName = trackName.replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').trim();
        const query = cleanQuery(`${artist} ${cleanName}`);
        log('Search', `Searching YouTube (scored) for: "${query}"`);

        // Primary: scrape YouTube search page (much more reliable than yt-dlp search)
        let results = [];
        try {
            results = await this._scrapeYouTubeSearch(query);
        } catch (e) {
            log('Search', `YouTube scrape failed: ${e.message}`);
        }

        // Fallback: yt-dlp search
        if (!results.length) {
            log('Search', 'Falling back to yt-dlp search');
            const searchFlags = { 'dump-json': true, 'dump-single-json': false };
            try {
                const info = await this._runYtDlp(`ytsearch:${query}`, searchFlags);
                if (info?.id) results = [info];
            } catch {}
        }

        if (!results.length) {
            log('Search', 'No results found');
            return null;
        }

        log('Search', `Got ${results.length} candidates, scoring...`);
        const best = this._pickBestMatch(results, artist, trackName);
        log('Search', `Best match: "${best.title}" [${best.webpage_url}]`);
        return this._makeSong(best, options);
    }

    async _scrapeYouTubeSearch(query, count = 5) {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            },
        });
        const html = await res.text();

        const match = html.match(/ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
        if (!match) throw new Error('Could not find ytInitialData in YouTube response');

        const data = JSON.parse(match[1]);
        const sections = data?.contents?.twoColumnSearchResultsRenderer
            ?.primaryContents?.sectionListRenderer?.contents || [];

        const results = [];
        for (const section of sections) {
            for (const item of (section?.itemSectionRenderer?.contents || [])) {
                const v = item?.videoRenderer;
                if (!v?.videoId) continue;
                results.push({
                    id: v.videoId,
                    title: v.title?.runs?.map(r => r.text).join('') || '',
                    webpage_url: `https://www.youtube.com/watch?v=${v.videoId}`,
                    uploader: v.ownerText?.runs?.[0]?.text || '',
                    channel: v.ownerText?.runs?.[0]?.text || '',
                    thumbnail: v.thumbnail?.thumbnails?.slice(-1)[0]?.url || '',
                });
                if (results.length >= count) return results;
            }
        }
        return results;
    }

    _pickBestMatch(results, artist, trackName) {
        const cleanArtist = artist.toLowerCase().trim();
        const cleanTitle = trackName.toLowerCase()
            .replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '')  // strip parenthetical content
            .trim();

        let bestScore = -1;
        let bestResult = results[0];

        for (const r of results) {
            const rTitle = (r.title || '').toLowerCase();
            const rChannel = (r.uploader || r.channel || '').toLowerCase();
            let score = 0;

            // Strong signals: artist or song title found in video title / channel
            if (rTitle.includes(cleanArtist) || rChannel.includes(cleanArtist)) score += 10;
            if (cleanTitle.length > 1 && rTitle.includes(cleanTitle)) score += 15;

            // Word-level matches
            for (const word of cleanTitle.split(/\s+/)) {
                if (word.length > 1 && rTitle.includes(word)) score += 3;
            }
            for (const word of cleanArtist.split(/[\s,]+/)) {
                if (word.length > 1 && (rTitle.includes(word) || rChannel.includes(word))) score += 3;
            }

            log('Search', `  [${score}] "${r.title}"`);

            if (score > bestScore) {
                bestScore = score;
                bestResult = r;
            }
        }

        return bestResult;
    }

    // --- Spotify ---

    async _resolveSpotify(url, options) {
        log('Spotify', `Resolving: ${url}`);

        let data;
        try {
            data = await spotifyGetData(url);
        } catch (e) {
            throw new Error(`Failed to get Spotify data: ${e.message}`);
        }

        if (data.type === 'track') {
            return this._resolveSpotifyTrack(data, options);
        }

        // Playlist or album
        const tracks = data.trackList || [];
        if (!tracks.length) throw new Error(`No tracks found in Spotify ${data.type}: "${data.name}"`);
        log('Spotify', `${data.type}: "${data.name}" (${tracks.length} tracks)`);

        const songs = [];
        for (let i = 0; i < tracks.length; i++) {
            const t = tracks[i];
            const name = t.title || t.name || 'Unknown';
            const artist = t.subtitle || '';
            log('Spotify', `  [${i + 1}/${tracks.length}] "${name}" by ${artist}`);
            try {
                const ytSong = artist
                    ? await this._searchBestMatch(artist, name, options)
                    : await this.searchSong(cleanQuery(name), options);
                if (ytSong) {
                    ytSong.name = artist ? `${name} - ${artist}` : name;
                    songs.push(ytSong);
                }
            } catch {
                log('Spotify', `  [${i + 1}/${tracks.length}] Failed, skipping`);
            }
        }

        if (!songs.length) throw new Error('Could not find any tracks from Spotify on YouTube');
        log('Spotify', `Resolved ${songs.length}/${tracks.length} tracks`);

        return new Playlist({ source: 'spotify', songs, name: data.name || 'Spotify Playlist', url }, options);
    }

    async _resolveSpotifyTrack(data, options) {
        const name = data.name;
        const artist = data.artists?.map(a => a.name).join(', ') || 'Unknown';
        log('Spotify', `Track: "${name}" by ${artist}`);

        const ytSong = await this._searchBestMatch(artist, name, options);
        if (!ytSong) throw new Error(`No YouTube result for: ${name} - ${artist}`);

        ytSong.name = `${name} - ${artist}`;
        return ytSong;
    }

    // --- Apple Music ---

    async _resolveAppleMusic(url, options) {
        log('Apple Music', `Resolving: ${url}`);

        // Extract the numeric ID from the URL
        const trackIdMatch = url.match(/[?&]i=(\d+)/);
        const pathIdMatch = url.match(/\/(?:album|song|music-video)\/[^/]+\/(\d+)/);
        const id = trackIdMatch?.[1] || pathIdMatch?.[1];

        if (id) {
            return this._resolveAppleMusicById(id, !!trackIdMatch, url, options);
        }

        // No ID found — fall back to page scraping
        return this._resolveAppleMusicByScraping(url, options);
    }

    async _resolveAppleMusicById(id, isSingleTrack, url, options) {
        log('Apple Music', `Looking up iTunes ID: ${id}`);
        const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song`);
        const data = await res.json();

        if (!data.results?.length) {
            log('Apple Music', 'iTunes API returned no results, falling back to scraping');
            return this._resolveAppleMusicByScraping(url, options);
        }

        const tracks = data.results.filter(r => r.wrapperType === 'track');
        const collection = data.results.find(r => r.wrapperType === 'collection');

        if (isSingleTrack && tracks.length) {
            // Single track
            const t = tracks[0];
            log('Apple Music', `Track: "${t.trackName}" by ${t.artistName}`);
            const ytSong = await this._searchBestMatch(t.artistName, t.trackName, options);
            if (!ytSong) throw new Error(`No YouTube result for: ${t.trackName} - ${t.artistName}`);
            ytSong.name = `${t.trackName} - ${t.artistName}`;
            return ytSong;
        }

        if (tracks.length > 1) {
            // Album
            const albumName = collection?.collectionName || 'Apple Music Album';
            log('Apple Music', `Album: "${albumName}" (${tracks.length} tracks)`);
            const songs = [];
            for (let i = 0; i < tracks.length; i++) {
                const t = tracks[i];
                log('Apple Music', `  [${i + 1}/${tracks.length}] "${t.trackName}" by ${t.artistName}`);
                try {
                    const ytSong = await this._searchBestMatch(t.artistName, t.trackName, options);
                    if (ytSong) {
                        ytSong.name = `${t.trackName} - ${t.artistName}`;
                        songs.push(ytSong);
                    }
                } catch {
                    log('Apple Music', `  [${i + 1}/${tracks.length}] Failed, skipping`);
                }
            }
            if (!songs.length) throw new Error('Could not find any Apple Music tracks on YouTube');
            return new Playlist({ source: 'apple-music', songs, name: albumName, url }, options);
        }

        // Fallback
        return this._resolveAppleMusicByScraping(url, options);
    }

    async _resolveAppleMusicByScraping(url, options) {
        log('Apple Music', 'Scraping page for metadata');
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await res.text();

        const title = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)?.[1]
            || html.match(/<title>([^<]+)<\/title>/)?.[1];

        if (!title) throw new Error('Could not extract info from Apple Music page');

        const clean = title.replace(/\s*[-\u2013\u2014]\s*Apple Music.*$/i, '').trim();
        log('Apple Music', `Extracted: "${clean}"`);

        const query = cleanQuery(clean);
        const ytSong = await this.searchSong(query, options);
        if (!ytSong) throw new Error(`No YouTube result for: ${clean}`);

        ytSong.name = clean;
        return ytSong;
    }

    // --- yt-dlp ---

    async _resolveYtDlp(url, options) {
        log('yt-dlp', `Resolving: ${url}`);

        // Detect YouTube radio/mix playlists (list=RD...) and cap them at 25 tracks.
        // These are auto-generated infinite playlists that can expand to 1000+ entries.
        const isRadio = /[?&]list=RD/.test(url) || /[?&]start_radio=1/.test(url);
        const isPlaylist = /[?&]list=/.test(url) || /\/playlist\b/.test(url) || /\/album\b/.test(url) || /\/sets\//.test(url);
        const flags = {};
        if (isPlaylist) {
            flags['flat-playlist'] = true;
        }
        if (isRadio) {
            flags['playlist-end'] = 25;
            log('yt-dlp', 'Detected YouTube radio/mix — limiting to 25 tracks');
        }

        const info = await this._runYtDlp(url, flags);

        if (Array.isArray(info.entries)) {
            const entries = info.entries.filter(e => e && e.id);
            if (!entries.length) throw new Error('The playlist is empty');
            log('yt-dlp', `Playlist: "${info.title}" (${entries.length} tracks)`);
            return new Playlist(
                {
                    source: info.extractor || 'yt-dlp',
                    songs: entries.map(e => this._makeSong(e, options)),
                    id: String(info.id),
                    name: info.title || 'Playlist',
                    url: info.webpage_url || url,
                    thumbnail: info.thumbnail || info.thumbnails?.[0]?.url,
                },
                options,
            );
        }

        log('yt-dlp', `Track: "${info.title}" (${formatDuration(info.duration)})`);
        return this._makeSong(info, options);
    }

    // --- Helpers ---

    _makeSong(info, options) {
        return new Song(
            {
                plugin: this,
                source: info.extractor || 'yt-dlp',
                playFromSource: true,
                id: String(info.id || ''),
                name: info.title || 'Unknown',
                url: info.webpage_url || info.url || '',
                thumbnail: info.thumbnail || info.thumbnails?.[info.thumbnails?.length - 1]?.url || '',
                duration: info.duration || 0,
                uploader: {
                    name: info.uploader || info.channel || '',
                    url: info.uploader_url || info.channel_url || '',
                },
                views: info.view_count || 0,
                likes: info.like_count || 0,
            },
            options,
        );
    }

    _runYtDlp(url, extraFlags = {}) {
        if (!fs.existsSync(YTDLP_BIN)) {
            throw new Error(
                'yt-dlp binary not found. It should download automatically on first run. '
                + 'If this persists, install yt-dlp manually: https://github.com/yt-dlp/yt-dlp#installation',
            );
        }

        const flags = {
            'dump-single-json': true,
            'no-warnings': true,
            'prefer-free-formats': true,
            'skip-download': true,
            'simulate': true,
            ...extraFlags,
        };

        const args = [url];
        for (const [key, value] of Object.entries(flags)) {
            if (value === true) args.push(`--${key}`);
            else if (value !== false && value != null) args.push(`--${key}`, String(value));
        }

        return new Promise((resolve, reject) => {
            const proc = spawn(YTDLP_BIN, args);
            let stdout = '';
            let stderr = '';
            let done = false;

            const timeout = setTimeout(() => {
                if (!done) {
                    done = true;
                    proc.kill();
                    reject(new Error(`yt-dlp timed out for: ${url}`));
                }
            }, 30000);

            proc.stdout.on('data', chunk => { stdout += chunk; });
            proc.stderr.on('data', chunk => { stderr += chunk; });

            proc.on('close', code => {
                if (done) return;
                done = true;
                clearTimeout(timeout);
                if (code === 0) {
                    if (!stdout.trim()) {
                        resolve(null);
                        return;
                    }
                    try {
                        resolve(JSON.parse(stdout));
                    } catch {
                        reject(new Error(`Failed to parse yt-dlp output for: ${url}`));
                    }
                } else {
                    const clean = stderr.replace(/^(WARNING|Deprecated Feature):.*\n?/gm, '').trim();
                    reject(new Error(clean || `yt-dlp exited with code ${code}`));
                }
            });

            proc.on('error', err => {
                if (done) return;
                done = true;
                clearTimeout(timeout);
                reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
            });
        });
    }
}

// --- Utility functions ---

function isSpotifyUrl(url) {
    return /open\.spotify\.com\/(track|album|playlist)/.test(url);
}

function isAppleMusicUrl(url) {
    return /music\.apple\.com/.test(url);
}

function stripFeatured(name) {
    return name
        .replace(/\s*[\(\[]\s*(feat\.?|ft\.?|featuring)\s+[^\)\]]*[\)\]]/gi, '')
        .replace(/\s+(feat\.?|ft\.?|featuring)\s+.*/gi, '')
        .trim();
}

function cleanQuery(query) {
    return query
        .replace(/[()[\]{}"'`]/g, '')   // remove brackets, quotes
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')  // replace non-letter/non-digit special chars (keeps Unicode letters)
        .replace(/\s+/g, ' ')            // collapse whitespace
        .trim();
}

function formatDuration(seconds) {
    if (!seconds) return '?:??';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

module.exports = { MusicPlugin };
