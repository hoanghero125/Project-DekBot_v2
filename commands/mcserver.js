const { SlashCommandBuilder } = require('discord.js');
const { Icons, Colors, baseEmbed, errorEmbed, BOT_FOOTER } = require('../utils/theme');

/**
 * Queries a Java-edition Minecraft server via the mcstatus.io public API.
 * @param {string} address  host or host:port
 * @returns {Promise<object>}
 */
async function fetchServerStatus(address) {
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(address)}`);
    if (!res.ok) throw new Error(`mcstatus.io responded ${res.status}`);
    return res.json();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mcsv')
        .setDescription("Check a Minecraft server's status")
        .addStringOption(opt => opt.setName('ip').setDescription('Server IP address').setRequired(true))
        .addIntegerOption(opt => opt.setName('port').setDescription('Server port').setRequired(false)),
    name: 'mcsv',
    aliases: [],

    async execute(interaction) {
        const ip = interaction.options.getString('ip');
        const port = interaction.options.getInteger('port');
        const address = port ? `${ip}:${port}` : ip;
        await interaction.deferReply();

        try {
            const response = await fetchServerStatus(address);
            if (!response.online) throw new Error('offline');
            const embed = buildMcEmbed(response, address);
            await interaction.editReply({ embeds: [embed] });
        } catch {
            await interaction.editReply({ embeds: [errorEmbed('Could not reach that server. Double-check the IP and port.')] });
        }
    },

    async prefixExecute(message, args) {
        if (!args[0]) return message.channel.send({ embeds: [errorEmbed('Please enter a Minecraft server IP.')] });

        const address = args[1] ? `${args[0]}:${args[1]}` : args[0];

        try {
            const response = await fetchServerStatus(address);
            if (!response.online) throw new Error('offline');
            const embed = buildMcEmbed(response, address);
            message.channel.send({ embeds: [embed] });
        } catch {
            message.channel.send({ embeds: [errorEmbed('Could not reach that server. Double-check the IP and port.')] });
        }
    },
};

function buildMcEmbed(response, address) {
    const online = response.players.online;
    const max = response.players.max;
    const playerBar = buildPlayerBar(online, max);
    const host = response.host || address;
    const version = response.version?.name_clean || response.version?.name_raw || 'Unknown';

    return baseEmbed(Colors.GAMING)
        .setAuthor({ name: 'Minecraft Server Status' })
        .setTitle(`${Icons.GAMING}  ${host}`)
        .setDescription(
            `${Icons.SUCCESS}  **Online**\n\n` +
            `${Icons.SERVER}  **IP**\n> \`${host}\`\n\n` +
            `${Icons.PEOPLE}  **Players** — ${online} / ${max}\n> ${playerBar}\n\n` +
            `${Icons.BOLT}  **Version**\n> ${version}`
        )
        .setFooter({ text: BOT_FOOTER });
}

function buildPlayerBar(online, max) {
    const length = 12;
    if (!max || max <= 0) return '▱'.repeat(length);
    const filled = Math.round((online / max) * length);
    return '▰'.repeat(filled) + '▱'.repeat(length - filled) + `  \`${online}/${max}\``;
}
