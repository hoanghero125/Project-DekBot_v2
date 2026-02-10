const { SlashCommandBuilder } = require('discord.js');
const { Icons, Colors, musicEmbed, warningEmbed, formatDuration, BOT_FOOTER } = require('../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue'),
    name: 'queue',
    aliases: ['q'],

    async execute(interaction, client) {
        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [warningEmbed('Nothing is playing right now.')], ephemeral: true });
        }

        const embed = buildQueueEmbed(queue);
        await interaction.reply({ embeds: [embed] });
    },

    async prefixExecute(message, args, client) {
        const queue = client.distube.getQueue(message.guildId);
        if (!queue) {
            return message.channel.send({ embeds: [warningEmbed('Nothing is playing right now.')] });
        }

        const embed = buildQueueEmbed(queue);
        message.channel.send({ embeds: [embed] });
    },
};

function buildQueueEmbed(queue) {
    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1, 10);

    const nowPlaying = [
        `${Icons.MUSIC_DISC}  **[${current.name}](${current.url})**`,
        `${Icons.CLOCK}  \`${current.formattedDuration || formatDuration(current.duration)}\``,
        `${Icons.PEOPLE}  Requested by ${current.user || 'Unknown'}`,
    ].join('\n');

    const embed = musicEmbed()
        .setAuthor({ name: 'Music Queue', iconURL: undefined })
        .setTitle(`${Icons.SPEAKER}  Now Playing`)
        .setDescription(nowPlaying);

    if (current.thumbnail) {
        embed.setThumbnail(current.thumbnail);
    }

    if (upcoming.length > 0) {
        const list = upcoming
            .map((song, i) => {
                const num = `\`${String(i + 1).padStart(2, ' ')}\``;
                return `${num}  **${song.name}** — \`${song.formattedDuration}\``;
            })
            .join('\n');

        embed.addFields({ name: `\u200b\n${Icons.QUEUE}  Up Next`, value: list, inline: false });
    }

    // Summary footer
    const totalSongs = queue.songs.length;
    const totalDuration = queue.songs.reduce((acc, s) => acc + (s.duration || 0), 0);
    const footerParts = [
        `${totalSongs} song${totalSongs === 1 ? '' : 's'}`,
        `${formatDuration(totalDuration)} total`,
    ];

    if (totalSongs > 11) {
        footerParts.push(`+${totalSongs - 11} more`);
    }

    embed.setFooter({ text: `${footerParts.join('  •  ')}  │  ${BOT_FOOTER}` });

    return embed;
}
