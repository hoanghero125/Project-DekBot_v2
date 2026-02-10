const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show the list of available commands'),
    name: 'help',
    aliases: [],

    async execute(interaction) {
        const embed = buildHelpEmbed();
        await interaction.reply({ embeds: [embed] });
    },

    async prefixExecute(message) {
        const embed = buildHelpEmbed();
        message.channel.send({ embeds: [embed] });
    },
};

function buildHelpEmbed() {
    return new EmbedBuilder()
        .setColor('#4E5D94')
        .setTitle('List of commands')
        .addFields(
            { name: 'Play music / Add music to queue', value: '`/play` or `^play` (`^p`) [link or search query]\nSupports YouTube, Spotify, Apple Music, SoundCloud, and more' },
            { name: 'Skip music', value: '`/skip` or `^skip` (`^s`)' },
            { name: 'Stop music', value: '`/stop` or `^stop`' },
            { name: 'View queue', value: '`/queue` or `^queue` (`^q`)' },
            { name: "Minecraft server status", value: '`/mcsv` or `^mcsv` [server ip] [port]' },
            { name: "Show creator's Youtube channel", value: '`/youtube` or `^youtube`' },
        )
        .setFooter({ text: 'DekBot - Created by Dek' });
}
