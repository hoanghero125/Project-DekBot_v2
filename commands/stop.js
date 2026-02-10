const { SlashCommandBuilder } = require('discord.js');
const { Icons, successEmbed, errorEmbed, warningEmbed } = require('../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),
    name: 'stop',
    aliases: [],

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel to use this command!')], ephemeral: true });
        }

        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [warningEmbed('Nothing is playing right now.')], ephemeral: true });
        }

        const songCount = queue.songs.length;
        // Cancel any background playlist loading before stopping
        client.musicPlugin?.cancelBackgroundLoading(interaction.guildId);
        await queue.stop();
        await interaction.reply({
            embeds: [successEmbed(`${Icons.STOP}  Stopped playback and cleared **${songCount}** song${songCount === 1 ? '' : 's'} from the queue.`)],
        });
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

        const songCount = queue.songs.length;
        // Cancel any background playlist loading before stopping
        client.musicPlugin?.cancelBackgroundLoading(message.guildId);
        await queue.stop();
        message.channel.send({
            embeds: [successEmbed(`${Icons.STOP}  Stopped playback and cleared **${songCount}** song${songCount === 1 ? '' : 's'} from the queue.`)],
        });
    },
};
