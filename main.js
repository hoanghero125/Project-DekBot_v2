require('dotenv').config();
const fs = require('fs');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');

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

// DisTube setup
const spotifyOptions = process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
    ? { api: { clientId: process.env.SPOTIFY_CLIENT_ID, clientSecret: process.env.SPOTIFY_CLIENT_SECRET } }
    : {};

client.distube = new DisTube(client, {
    plugins: [
        new SpotifyPlugin(spotifyOptions),
        new SoundCloudPlugin(),
        new YtDlpPlugin({ update: true }),
    ],
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
});

// DisTube events
client.distube
    .on('playSong', (queue, song) => {
        queue.textChannel.send(`Now playing **${song.name}** - \`${song.formattedDuration}\` — requested by ${song.user}`);
    })
    .on('addSong', (queue, song) => {
        queue.textChannel.send(`Added **${song.name}** - \`${song.formattedDuration}\` to the queue`);
    })
    .on('addList', (queue, playlist) => {
        queue.textChannel.send(`Added playlist **${playlist.name}** (${playlist.songs.length} songs) to the queue`);
    })
    .on('finish', (queue) => {
        queue.textChannel.send('Queue finished! No more songs to play.');
    })
    .on('error', (error, queue) => {
        console.error(error);
        if (queue?.textChannel) {
            queue.textChannel.send(`An error occurred: ${error.message}`);
        }
    });

// Bot ready
client.once(Events.ClientReady, () => {
    console.log(`DekBot just went online :D — logged in as ${client.user.tag}`);
});

// Slash command handler
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command || !command.execute) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(error);
        const reply = { content: 'There was an error executing this command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

// Prefix command handler
client.on(Events.MessageCreate, (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const cmd = args.shift().toLowerCase();

    const command = client.commands.get(cmd)
        || client.commands.find(c => c.aliases && c.aliases.includes(cmd));
    if (!command || !command.prefixExecute) return;

    try {
        command.prefixExecute(message, args, client);
    } catch (error) {
        console.error(error);
        message.reply('There was an error executing this command.');
    }
});

client.login(process.env.BOT_TOKEN);
