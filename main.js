require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DisTube } = require('distube');
const { MusicPlugin } = require('./plugins/music-plugin');
const { Icons, Colors, musicEmbed, successEmbed, errorEmbed, infoEmbed, warningEmbed, formatDuration, detectSource, BOT_FOOTER } = require('./utils/theme');

// Point prism-media / @discordjs/voice at the bundled ffmpeg binary
// so the bot works on machines without ffmpeg on PATH.
process.env.FFMPEG_PATH = require('ffmpeg-static');

// Ensure yt-dlp binary exists (managed by @distube/yt-dlp package).
// Only download if missing — avoids EBUSY errors from overwriting a running binary.
const YTDLP_BIN = path.join(
    path.dirname(require.resolve('@distube/yt-dlp')),
    '..', 'bin',
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp',
);
if (!fs.existsSync(YTDLP_BIN)) {
    const { YtDlpPlugin: _YtDlpBinary } = require('@distube/yt-dlp');
    new _YtDlpBinary({ update: true });
    console.log('[yt-dlp] Binary not found, downloading...');
}

const prefix = process.env.PREFIX || '^';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Load commands
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

// DisTube with custom MusicPlugin (handles YouTube, Spotify, Apple Music, SoundCloud, etc.)
const musicPlugin = new MusicPlugin();
client.distube = new DisTube(client, {
    plugins: [musicPlugin],
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
});
// Give the plugin a reference to DisTube for background playlist loading
musicPlugin.distube = client.distube;
client.musicPlugin = musicPlugin; // Expose plugin for stop/cancel access

// Auto-leave timers: guildId -> setTimeout handle
const leaveTimers = new Map();
const LEAVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Alone-in-VC timers: guildId -> setTimeout handle
const aloneTimers = new Map();
const ALONE_TIMEOUT = 3 * 60 * 1000; // 3 minutes

// DisTube events — rich embed responses
client.distube
    .on('initQueue', (queue) => {
        console.log(`[DisTube] Joined voice channel: #${queue.voiceChannel.name}`);
    })
    .on('playSong', (queue, song) => {
        // Cancel any pending auto-leave timer since we're playing again
        const existingTimer = leaveTimers.get(queue.id);
        if (existingTimer) {
            clearTimeout(existingTimer);
            leaveTimers.delete(queue.id);
        }

        console.log(`[DisTube] Playing: "${song.name}" (${song.formattedDuration})`);
        const source = detectSource(song.url);

        const embed = musicEmbed()
            .setAuthor({ name: 'Now Playing', iconURL: undefined })
            .setTitle(`${Icons.PLAY}  ${song.name}`)
            .setURL(song.url || null)
            .setDescription(
                [
                    `${Icons.CLOCK}  \`${song.formattedDuration || formatDuration(song.duration)}\`  ${Icons.PEOPLE}  ${song.user || 'Unknown'}`,
                    song.uploader?.name ? `${Icons.STAR}  ${song.uploader.name}` : null,
                ].filter(Boolean).join('\n')
            )
            .setFooter({ text: BOT_FOOTER });

        if (song.thumbnail) embed.setThumbnail(song.thumbnail);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('skip_song')
                .setLabel('Skip')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⏭️'),
        );

        queue.textChannel.send({ embeds: [embed], components: [row] });
    })
    .on('addSong', (queue, song) => {
        console.log(`[DisTube] Queued: "${song.name}" — ${queue.songs.length} songs in queue`);
        const source = detectSource(song.url);
        const pos = queue.songs.length - 1;

        const embed = successEmbed(
            `${Icons.ADD}  **${song.name}**\n` +
            `${Icons.CLOCK}  \`${song.formattedDuration || formatDuration(song.duration)}\`  •  ` +
            `Position **#${pos}** in queue  •  ${song.user || ''}`
        ).setFooter({ text: `${source.icon}  ${source.name}  │  ${queue.songs.length} songs in queue` });

        if (song.thumbnail) embed.setThumbnail(song.thumbnail);

        queue.textChannel.send({ embeds: [embed] });
    })
    .on('addList', (queue, playlist) => {
        console.log(`[DisTube] Playlist queued: "${playlist.name}" (${playlist.songs.length} songs)`);

        const embed = successEmbed(
            `${Icons.PLAYLIST}  **${playlist.name}**\n` +
            `${Icons.MUSIC_NOTE}  **${playlist.songs.length}** songs added to the queue`
        ).setFooter({ text: `${queue.songs.length} songs in queue  │  ${BOT_FOOTER}` });

        queue.textChannel.send({ embeds: [embed] });
    })
    .on('finish', (queue) => {
        console.log('[DisTube] Queue finished');
        const embed = infoEmbed(`${Icons.MUSIC_DISC}  Queue finished — no more songs to play.\nUse \`/play\` to start a new session!\n${Icons.CLOCK}  Leaving voice in **5 minutes** if idle.`);
        queue.textChannel.send({ embeds: [embed] });

        // Start a 5-minute auto-leave timer
        const timer = setTimeout(() => {
            leaveTimers.delete(queue.id);
            const currentQueue = client.distube.getQueue(queue.id);
            if (!currentQueue) {
                // No active queue — leave the voice channel
                const vc = queue.voiceChannel;
                if (vc) {
                    client.distube.voices.leave(vc.guild.id);
                    console.log(`[DisTube] Auto-left voice channel after 5m idle`);
                    queue.textChannel.send({ embeds: [infoEmbed(`${Icons.LEAVE}  Left the voice channel after 5 minutes of inactivity.`)] }).catch(() => {});
                }
            }
        }, LEAVE_TIMEOUT);
        leaveTimers.set(queue.id, timer);
    })
    .on('disconnect', (queue) => {
        console.log('[DisTube] Disconnected from voice channel');
        // Clean up any pending timers for this guild
        const timer = leaveTimers.get(queue.id);
        if (timer) {
            clearTimeout(timer);
            leaveTimers.delete(queue.id);
        }
        const aloneTimer = aloneTimers.get(queue.id);
        if (aloneTimer) {
            clearTimeout(aloneTimer);
            aloneTimers.delete(queue.id);
        }
    })
    .on('error', (error, queue) => {
        console.error('[DisTube] Error:', error.message);
        if (queue?.textChannel) {
            queue.textChannel.send({ embeds: [errorEmbed(`Something went wrong: \`${error.message}\``)] });
        }
    });

// Bot ready
client.once(Events.ClientReady, () => {
    console.log(`DekBot has gone online :D — ${client.user.tag}`);
});

// Auto-leave when bot is alone in a voice channel for 3 minutes
// Also pause/resume when the bot is server-muted/unmuted
const mutePausedGuilds = new Set(); // track guilds where we paused due to mute

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const guild = oldState.guild || newState.guild;
    const botId = guild.members.me?.id;

    // --- Server mute/unmute detection (bot's own voice state changed) ---
    if (newState.id === botId) {
        const wasMuted = oldState.serverMute;
        const isMuted = newState.serverMute;
        const guildId = guild.id;

        if (!wasMuted && isMuted) {
            // Bot just got server-muted — pause playback
            const queue = client.distube.getQueue(guildId);
            if (queue && !queue.paused) {
                queue.pause();
                mutePausedGuilds.add(guildId);
                console.log(`[DisTube] Bot was server-muted — pausing playback`);
                queue.textChannel.send({ embeds: [warningEmbed(`${Icons.PAUSE}  I've been muted! Pausing playback until I'm unmuted.`)] }).catch(() => {});
            }
        } else if (wasMuted && !isMuted) {
            // Bot just got unmuted — resume if we paused it
            const queue = client.distube.getQueue(guildId);
            if (queue && queue.paused && mutePausedGuilds.has(guildId)) {
                queue.resume();
                mutePausedGuilds.delete(guildId);
                console.log(`[DisTube] Bot was unmuted — resuming playback`);
                queue.textChannel.send({ embeds: [successEmbed(`${Icons.PLAY}  Unmuted! Resuming playback.`)] }).catch(() => {});
            }
        }
    }

    // --- Alone-in-VC detection ---
    const botVoice = guild.members.me?.voice?.channel;
    if (!botVoice) return;

    // Count human members in the bot's VC (exclude bots)
    const humans = botVoice.members.filter(m => !m.user.bot).size;
    const guildId = guild.id;

    if (humans === 0) {
        // Bot is alone — start the 3-minute timer if not already running
        if (!aloneTimers.has(guildId)) {
            console.log(`[DisTube] Bot is alone in #${botVoice.name}, starting 3m auto-leave timer`);
            const timer = setTimeout(() => {
                aloneTimers.delete(guildId);
                // Re-check: still alone?
                const vc = guild.members.me?.voice?.channel;
                if (vc && vc.members.filter(m => !m.user.bot).size === 0) {
                    const queue = client.distube.getQueue(guildId);
                    if (queue) {
                        client.musicPlugin?.cancelBackgroundLoading(guildId);
                        queue.textChannel.send({ embeds: [infoEmbed(`${Icons.LEAVE}  No one in the voice channel — stopped playback and left after 3 minutes.`)] }).catch(() => {});
                        queue.stop().catch(() => {});
                    }
                    client.distube.voices.leave(guildId);
                    console.log(`[DisTube] Auto-left #${vc.name} — alone for 3 minutes`);
                }
            }, ALONE_TIMEOUT);
            aloneTimers.set(guildId, timer);
        }
    } else {
        // Someone is here — cancel the alone timer
        const timer = aloneTimers.get(guildId);
        if (timer) {
            clearTimeout(timer);
            aloneTimers.delete(guildId);
            console.log(`[DisTube] Alone timer cancelled — someone joined #${botVoice.name}`);
        }
    }
});

// Button interaction handler (skip button on Now Playing, queue pagination)
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    // --- Skip button ---
    if (interaction.customId === 'skip_song') {
        const member = interaction.member;
        if (!member.voice.channel) {
            return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel to skip!')], ephemeral: true });
        }

        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [warningEmbed('Nothing is playing right now.')], ephemeral: true });
        }

        try {
            const skippedName = queue.songs[0]?.name;

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('skip_song')
                    .setLabel('Skipped')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⏭️')
                    .setDisabled(true),
            );
            await interaction.update({ components: [disabledRow] });

            if (queue.songs.length <= 1) {
                await queue.stop();
                await interaction.followUp({ embeds: [infoEmbed(`${Icons.SKIP}  Skipped **${skippedName}** — queue is now empty.`)] });
            } else {
                const nextName = queue.songs[1]?.name;
                await queue.skip();
                await interaction.followUp({ embeds: [successEmbed(`${Icons.SKIP}  Skipped **${skippedName}**\n${Icons.PLAY}  Now playing **${nextName}**`)] });
            }
        } catch (e) {
            console.error('[Button] Skip error:', e.message);
            await interaction.followUp({ embeds: [errorEmbed('Failed to skip the song.')], ephemeral: true });
        }
        return;
    }

    // --- Queue pagination ---
    if (interaction.customId.startsWith('queue_page_')) {
        const page = parseInt(interaction.customId.replace('queue_page_', ''), 10);
        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.update({ embeds: [warningEmbed('The queue is no longer active.')], components: [] });
        }

        const { buildQueuePage } = require('./commands/queue');
        const { embed, row } = buildQueuePage(queue, page);
        await interaction.update({ embeds: [embed], components: row ? [row] : [] });
        return;
    }
});

// Slash command handler
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command?.execute) return;
    console.log(`[Slash] /${interaction.commandName} — by ${interaction.user.tag}`);

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error('[Slash] Error:', error.message);
        const reply = { embeds: [errorEmbed('Something went wrong while running this command.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

// Prefix command handler
client.on(Events.MessageCreate, async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const cmd = args.shift().toLowerCase();

    const command = client.commands.get(cmd)
        || client.commands.find(c => c.aliases?.includes(cmd));
    if (!command?.prefixExecute) return;
    console.log(`[Prefix] ${prefix}${cmd} ${args.join(' ')} — by ${message.author.tag}`);

    try {
        await command.prefixExecute(message, args, client);
    } catch (error) {
        console.error('[Prefix] Error:', error.message);
        message.reply({ embeds: [errorEmbed('Something went wrong while running this command.')] });
    }
});

client.login(process.env.BOT_TOKEN);
