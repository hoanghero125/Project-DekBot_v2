const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),
    name: 'stop',
    aliases: [],

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: 'You must be in a voice channel to use this command!', ephemeral: true });
        }

        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ content: 'There is nothing playing right now.', ephemeral: true });
        }

        await queue.stop();
        await interaction.reply('Stopped the music and cleared the queue.');
    },

    async prefixExecute(message, args, client) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.channel.send('You must be in a voice channel to use this command!');
        }

        const queue = client.distube.getQueue(message.guildId);
        if (!queue) {
            return message.channel.send('There is nothing playing right now.');
        }

        await queue.stop();
        message.channel.send('Stopped the music and cleared the queue.');
    },
};
