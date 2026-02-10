/**
 * DekBot v2 — Shared UI Theme & Embed Utilities
 * Provides a consistent visual identity across all commands.
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ─── Color Palette ───────────────────────────────────────────────
const Colors = {
    PRIMARY:   0x5865F2,   // Discord blurple
    SUCCESS:   0x57F287,   // Green
    ERROR:     0xED4245,   // Red
    WARNING:   0xFEE75C,   // Yellow
    MUSIC:     0xEB459E,   // Fuchsia / pink
    INFO:      0x5865F2,   // Blurple
    GAMING:    0x57F287,   // Green
    NEUTRAL:   0x2F3136,   // Dark embed bg
    YOUTUBE:   0xFF0000,   // YouTube red
    SPOTIFY:   0x1DB954,   // Spotify green
    APPLE:     0xFC3C44,   // Apple Music red
    SOUNDCLOUD:0xFF5500,   // SoundCloud orange
};

// ─── Emoji Kit ───────────────────────────────────────────────────
const Icons = {
    // Music
    PLAY:       '▶️',
    PAUSE:      '⏸️',
    SKIP:       '⏭️',
    STOP:       '⏹️',
    QUEUE:      '📋',
    MUSIC_NOTE: '🎵',
    MUSIC_DISC: '💿',
    HEADPHONES: '🎧',
    SPEAKER:    '🔊',
    SEARCH:     '🔎',
    PLAYLIST:   '📑',
    ADD:        '➕',

    // Status
    SUCCESS:    '✅',
    ERROR:      '❌',
    WARNING:    '⚠️',
    INFO:       'ℹ️',
    LOADING:    '⏳',
    CLOCK:      '🕐',

    // General
    LINK:       '🔗',
    STAR:       '⭐',
    SPARKLE:    '✨',
    WAVE:       '👋',
    HAMMER:     '🔨',
    GLOBE:      '🌐',
    GAMING:     '🎮',
    SERVER:     '🖥️',
    PEOPLE:     '👥',
    CROWN:      '👑',
    BOLT:       '⚡',
    HEART:      '❤️',
    YOUTUBE:    '📺',
    COMMAND:    '🤖',
    MEOW:      '🐱',

    // Progress bar parts
    BAR_START_FULL:  '▰',
    BAR_START_EMPTY: '▱',
};

// ─── Bot Branding ────────────────────────────────────────────────
const BOT_NAME = 'DekBot';
const BOT_FOOTER = `${BOT_NAME} [v2]  •  Made with ${Icons.HEART} by DekTheDev`;
const BOT_ICON = null; // Set to a URL string if you have a bot avatar URL

// ─── Embed Builder Helpers ───────────────────────────────────────

/**
 * Base embed with consistent branding.
 */
function baseEmbed(color = Colors.PRIMARY) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: BOT_FOOTER });
    return embed;
}

/**
 * Music-themed embed.
 */
function musicEmbed() {
    return baseEmbed(Colors.MUSIC);
}

/**
 * Success embed (green).
 */
function successEmbed(description) {
    return baseEmbed(Colors.SUCCESS)
        .setDescription(`${Icons.SUCCESS}  ${description}`);
}

/**
 * Error embed (red).
 */
function errorEmbed(description) {
    return baseEmbed(Colors.ERROR)
        .setDescription(`${Icons.ERROR}  ${description}`);
}

/**
 * Warning embed (yellow).
 */
function warningEmbed(description) {
    return baseEmbed(Colors.WARNING)
        .setDescription(`${Icons.WARNING}  ${description}`);
}

/**
 * Info / neutral embed.
 */
function infoEmbed(description) {
    return baseEmbed(Colors.INFO)
        .setDescription(`${Icons.INFO}  ${description}`);
}

// ─── Progress Bar ────────────────────────────────────────────────

/**
 * Renders a text-based progress bar.
 * @param {number} current  Current position in seconds
 * @param {number} total    Total duration in seconds
 * @param {number} length   Bar character length (default 12)
 * @returns {string}
 */
function progressBar(current, total, length = 12) {
    if (!total || total <= 0) return '▱'.repeat(length);
    const filled = Math.round((current / total) * length);
    return Icons.BAR_START_FULL.repeat(filled) + Icons.BAR_START_EMPTY.repeat(length - filled);
}

/**
 * Format seconds into m:ss or h:mm:ss.
 */
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Truncate text with ellipsis.
 */
function truncate(text, max = 50) {
    if (!text) return '';
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/**
 * Detects the source platform from a URL and returns { color, icon, name }.
 */
function detectSource(url) {
    if (!url) return { color: Colors.MUSIC, icon: Icons.MUSIC_NOTE, name: 'Music' };
    if (/spotify\.com/i.test(url)) return { color: Colors.SPOTIFY, icon: '🟢', name: 'Spotify' };
    if (/music\.apple\.com/i.test(url)) return { color: Colors.APPLE, icon: '🍎', name: 'Apple Music' };
    if (/soundcloud\.com/i.test(url)) return { color: Colors.SOUNDCLOUD, icon: '☁️', name: 'SoundCloud' };
    if (/youtu(be\.com|\.be)/i.test(url)) return { color: Colors.YOUTUBE, icon: Icons.YOUTUBE, name: 'YouTube' };
    return { color: Colors.MUSIC, icon: Icons.MUSIC_NOTE, name: 'Music' };
}

module.exports = {
    Colors,
    Icons,
    BOT_NAME,
    BOT_FOOTER,
    BOT_ICON,
    baseEmbed,
    musicEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed,
    progressBar,
    formatDuration,
    truncate,
    detectSource,
};
