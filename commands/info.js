const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, Icons, baseEmbed, BOT_FOOTER } = require('../utils/theme');

const PORTFOLIO_URL = 'https://dek.io.vn/';
const GITHUB_URL = 'https://github.com/hoanghero125/Project-DekBot_v2';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Show information about DekBot'),
    name: 'info',
    aliases: [],

    async execute(interaction) {
        const { embed, row } = buildInfoCard(interaction.client);
        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async prefixExecute(message) {
        const { embed, row } = buildInfoCard(message.client);
        message.channel.send({ embeds: [embed], components: [row] });
    },
};

function buildInfoCard(client) {
    const guilds = client.guilds.cache.size;
    const uptime = formatUptime(client.uptime);

    const embed = baseEmbed(Colors.PRIMARY)
        .setAuthor({ name: 'About DekBot' })
        .setTitle(`${Icons.COMMAND}  DekBot v2`)
        .setDescription(
            [
                `A multi-platform music bot built with **discord.js v14** and **DisTube v5**.`,
                ``,
                `${Icons.HEADPHONES}  **Music Playback**`,
                `> YouTube, Spotify, Apple Music, SoundCloud & 700+ sites`,
                `> Queue management, playlist support`,
                ``,
                `${Icons.GAMING}  **Utilities**`,
                `> Minecraft server status lookup`,
                ``,
                `${Icons.BOLT}  **Stats**`,
                `> Servers: **${guilds}**  •  Uptime: **${uptime}**`,
                ``,
                `${Icons.MEOW}  Built by **DekTheDev**`,
            ].join('\n')
        )
        .setFooter({ text: BOT_FOOTER });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel("Check out my Portfolio!")
            .setStyle(ButtonStyle.Link)
            .setURL(PORTFOLIO_URL)
            .setEmoji('🌐'),
        new ButtonBuilder()
            .setLabel('Code source')
            .setStyle(ButtonStyle.Link)
            .setURL(GITHUB_URL)
            .setEmoji('🔗'),
    );

    return { embed, row };
}

function formatUptime(ms) {
    if (!ms) return 'N/A';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60) % 60;
    const h = Math.floor(s / 3600) % 24;
    const d = Math.floor(s / 86400);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (!parts.length) parts.push(`${s}s`);
    return parts.join(' ');
}
