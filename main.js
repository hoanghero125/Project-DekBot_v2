require('dotenv').config();
const fs = require('fs');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const { DisTube } = require('distube');
const { MusicPlugin } = require('./plugins/music-plugin');

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

// DisTube events
client.distube
    .on('initQueue', (queue) => {
        console.log(`[DisTube] Joined voice channel: #${queue.voiceChannel.name}`);
    })
    .on('playSong', (queue, song) => {
        console.log(`[DisTube] Playing: "${song.name}" (${song.formattedDuration})`);
        queue.textChannel.send(`Now playing **${song.name}** - \`${song.formattedDuration}\` — requested by ${song.user}`);
    })
    .on('addSong', (queue, song) => {
        console.log(`[DisTube] Queued: "${song.name}" — ${queue.songs.length} songs in queue`);
        queue.textChannel.send(`Added **${song.name}** - \`${song.formattedDuration}\` to the queue`);
    })
    .on('addList', (queue, playlist) => {
        console.log(`[DisTube] Playlist queued: "${playlist.name}" (${playlist.songs.length} songs)`);
        queue.textChannel.send(`Added playlist **${playlist.name}** (${playlist.songs.length} songs) to the queue`);
    })
    .on('finish', (queue) => {
        console.log('[DisTube] Queue finished');
        queue.textChannel.send('Queue finished! No more songs to play.');
    })
    .on('disconnect', (queue) => {
        console.log('[DisTube] Disconnected from voice channel');
    })
    .on('error', (error, queue) => {
        console.error('[DisTube] Error:', error.message);
        if (queue?.textChannel) {
            queue.textChannel.send(`An error occurred: ${error.message}`);
        }
    });

// Bot ready
client.once(Events.ClientReady, () => {
    console.log(`DekBot online — ${client.user.tag}`);
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
        const reply = { content: 'There was an error executing this command.', ephemeral: true };
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
        message.reply('There was an error executing this command.');
    }
});

client.login(process.env.BOT_TOKEN);
