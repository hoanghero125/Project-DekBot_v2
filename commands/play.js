const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or add it to the queue')
        .addStringOption(opt =>
            opt.setName('query')
                .setDescription('Song name, URL (YouTube, Spotify, SoundCloud, etc.)')
                .setRequired(true)),
    name: 'play',
    aliases: ['p'],

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: 'You must be in a voice channel to use this command!', ephemeral: true });
        }

        const query = interaction.options.getString('query');
        await interaction.reply(`Searching for **${query}**...`);

        try {
            await client.distube.play(voiceChannel, query, {
                textChannel: interaction.channel,
                member: interaction.member,
            });
        } catch (e) {
            console.error(e);
            await interaction.followUp({ content: `Could not play: ${e.message}` });
        }
    },

    async prefixExecute(message, args, client) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.channel.send('You must be in a voice channel to use this command!');
        }
        if (!args.length) {
            return message.channel.send('Please provide a song name or URL.');
        }

        const query = args.join(' ');
        try {
            await client.distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member,
                message: message,
            });
        } catch (e) {
            console.error(e);
            message.channel.send(`Could not play: ${e.message}`);
        }
    },
};
