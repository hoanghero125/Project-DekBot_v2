const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue'),
    name: 'queue',
    aliases: ['q'],

    async execute(interaction, client) {
        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ content: 'There is nothing playing right now.', ephemeral: true });
        }

        const embed = buildQueueEmbed(queue);
        await interaction.reply({ embeds: [embed] });
    },

    async prefixExecute(message, args, client) {
        const queue = client.distube.getQueue(message.guildId);
        if (!queue) {
            return message.channel.send('There is nothing playing right now.');
        }

        const embed = buildQueueEmbed(queue);
        message.channel.send({ embeds: [embed] });
    },
};

function buildQueueEmbed(queue) {
    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1, 10);

    const embed = new EmbedBuilder()
        .setColor('#4E5D94')
        .setTitle('Music Queue')
        .addFields({
            name: 'Now Playing',
            value: `**${current.name}** - \`${current.formattedDuration}\``,
        });

    if (upcoming.length > 0) {
        const list = upcoming
            .map((song, i) => `${i + 1}. **${song.name}** - \`${song.formattedDuration}\``)
            .join('\n');
        embed.addFields({ name: 'Up Next', value: list });
    }

    if (queue.songs.length > 11) {
        embed.setFooter({ text: `...and ${queue.songs.length - 11} more` });
    } else {
        embed.setFooter({ text: `${queue.songs.length} song${queue.songs.length === 1 ? '' : 's'} in queue` });
    }

    return embed;
}
