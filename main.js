require('dotenv').config();
const fs = require('fs');
const { Client, Collection, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DisTube } = require('distube');
const { MusicPlugin } = require('./plugins/music-plugin');
const { Icons, Colors, musicEmbed, successEmbed, errorEmbed, infoEmbed, warningEmbed, formatDuration, detectSource, BOT_FOOTER } = require('./utils/theme');

// Ensure yt-dlp binary exists (managed by @distube/yt-dlp package).
// Only download if missing — avoids EBUSY errors from overwriting a running binary.
const path = require('path');
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
client.distube = new DisTube(client, {
    plugins: [new MusicPlugin()],
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
});

// DisTube events — rich embed responses
client.distube
    .on('initQueue', (queue) => {
        console.log(`[DisTube] Joined voice channel: #${queue.voiceChannel.name}`);
    })
    .on('playSong', (queue, song) => {
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
        const embed = infoEmbed(`${Icons.MUSIC_DISC}  Queue finished — no more songs to play.\nUse \`/play\` to start a new session!`);
        queue.textChannel.send({ embeds: [embed] });
    })
    .on('disconnect', (queue) => {
        console.log('[DisTube] Disconnected from voice channel');
    })
    .on('error', (error, queue) => {
        console.error('[DisTube] Error:', error.message);
        if (queue?.textChannel) {
            queue.textChannel.send({ embeds: [errorEmbed(`Something went wrong: \`${error.message}\``)] });
        }
    });

// Bot ready
client.once(Events.ClientReady, () => {
    console.log(`DekBot online — ${client.user.tag}`);
});

// Button interaction handler (skip button on Now Playing)
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'skip_song') return;

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

        // Disable the button on the original message
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
