const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    name: 'skip',
    aliases: ['s'],

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: 'You must be in a voice channel to use this command!', ephemeral: true });
        }

        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ content: 'There is nothing playing right now.', ephemeral: true });
        }

        if (queue.songs.length <= 1) {
            await queue.stop();
            return interaction.reply('Skipped! No more songs in the queue.');
        }

        await queue.skip();
        await interaction.reply('Skipped!');
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

        if (queue.songs.length <= 1) {
            await queue.stop();
            return message.channel.send('Skipped! No more songs in the queue.');
        }

        await queue.skip();
        message.channel.send('Skipped!');
    },
};
