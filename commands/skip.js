const { SlashCommandBuilder } = require('discord.js');
const { Icons, successEmbed, errorEmbed, warningEmbed, infoEmbed } = require('../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    name: 'skip',
    aliases: ['s'],

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel to use this command!')], ephemeral: true });
        }

        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [warningEmbed('Nothing is playing right now.')], ephemeral: true });
        }

        const skippedName = queue.songs[0]?.name;

        if (queue.songs.length <= 1) {
            await queue.stop();
            return interaction.reply({ embeds: [infoEmbed(`${Icons.SKIP}  Skipped **${skippedName}** — queue is now empty.`)] });
        }

        const nextName = queue.songs[1]?.name;
        await queue.skip();
        await interaction.reply({ embeds: [successEmbed(`${Icons.SKIP}  Skipped **${skippedName}**\n${Icons.PLAY}  Now playing **${nextName}**`)] });
    },

    async prefixExecute(message, args, client) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.channel.send({ embeds: [errorEmbed('You must be in a voice channel to use this command!')] });
        }

        const queue = client.distube.getQueue(message.guildId);
        if (!queue) {
            return message.channel.send({ embeds: [warningEmbed('Nothing is playing right now.')] });
        }

        const skippedName = queue.songs[0]?.name;

        if (queue.songs.length <= 1) {
            await queue.stop();
            return message.channel.send({ embeds: [infoEmbed(`${Icons.SKIP}  Skipped **${skippedName}** — queue is now empty.`)] });
        }

        const nextName = queue.songs[1]?.name;
        await queue.skip();
        message.channel.send({ embeds: [successEmbed(`${Icons.SKIP}  Skipped **${skippedName}**\n${Icons.PLAY}  Now playing **${nextName}**`)] });
    },
};
