const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Icons, Colors, musicEmbed, warningEmbed, formatDuration, BOT_FOOTER } = require('../utils/theme');

const SONGS_PER_PAGE = 10;

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

        const { embed, row } = buildQueuePage(queue, 0);
        await interaction.reply({ embeds: [embed], components: row ? [row] : [] });
    },

    async prefixExecute(message, args, client) {
        const queue = client.distube.getQueue(message.guildId);
        if (!queue) {
            return message.channel.send({ embeds: [warningEmbed('Nothing is playing right now.')] });
        }

        const { embed, row } = buildQueuePage(queue, 0);
        message.channel.send({ embeds: [embed], components: row ? [row] : [] });
    },

    // Exported for use by the button handler in main.js
    buildQueuePage,
    SONGS_PER_PAGE,
};

function buildQueuePage(queue, page) {
    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1); // all songs after current
    const totalPages = Math.max(1, Math.ceil(upcoming.length / SONGS_PER_PAGE));
    const safePage = Math.min(Math.max(0, page), totalPages - 1);

    const start = safePage * SONGS_PER_PAGE;
    const pageItems = upcoming.slice(start, start + SONGS_PER_PAGE);

    // Now playing section
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

    // Up next list for this page
    if (pageItems.length > 0) {
        const list = pageItems
            .map((song, i) => {
                const globalIdx = start + i + 1;
                const num = `\`${String(globalIdx).padStart(2, ' ')}\``;
                return `${num}  **${song.name}** — \`${song.formattedDuration}\``;
            })
            .join('\n');

        embed.addFields({ name: `\u200b\n${Icons.QUEUE}  Up Next`, value: list, inline: false });
    }

    // Footer with totals and page info
    const totalSongs = queue.songs.length;
    const totalDuration = queue.songs.reduce((acc, s) => acc + (s.duration || 0), 0);
    const footerParts = [
        `${totalSongs} song${totalSongs === 1 ? '' : 's'}`,
        `${formatDuration(totalDuration)} total`,
    ];
    if (totalPages > 1) {
        footerParts.push(`Page ${safePage + 1}/${totalPages}`);
    }
    embed.setFooter({ text: `${footerParts.join('  •  ')}  │  ${BOT_FOOTER}` });

    // Pagination buttons
    let row = null;
    if (totalPages > 1) {
        const buttons = [];

        if (safePage > 0) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`queue_page_${safePage - 1}`)
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('◀️'),
            );
        }

        if (safePage < totalPages - 1) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`queue_page_${safePage + 1}`)
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('▶️'),
            );
        }

        if (buttons.length) {
            row = new ActionRowBuilder().addComponents(...buttons);
        }
    }

    return { embed, row };
}
