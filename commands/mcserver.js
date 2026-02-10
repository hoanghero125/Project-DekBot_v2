const { SlashCommandBuilder } = require('discord.js');
const util = require('minecraft-server-util');
const { Icons, Colors, baseEmbed, errorEmbed, BOT_FOOTER } = require('../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mcsv')
        .setDescription("Check a Minecraft server's status")
        .addStringOption(opt => opt.setName('ip').setDescription('Server IP address').setRequired(true))
        .addIntegerOption(opt => opt.setName('port').setDescription('Server port').setRequired(true)),
    name: 'mcsv',
    aliases: [],

    async execute(interaction) {
        const ip = interaction.options.getString('ip');
        const port = interaction.options.getInteger('port');
        await interaction.deferReply();

        try {
            const response = await util.status(ip, { port });
            const embed = buildMcEmbed(response);
            await interaction.editReply({ embeds: [embed] });
        } catch {
            await interaction.editReply({ embeds: [errorEmbed('Could not reach that server. Double-check the IP and port.')] });
        }
    },

    async prefixExecute(message, args) {
        if (!args[0]) return message.channel.send({ embeds: [errorEmbed('Please enter a Minecraft server IP.')] });
        if (!args[1]) return message.channel.send({ embeds: [errorEmbed('Please enter a Minecraft server port.')] });

        try {
            const response = await util.status(args[0], { port: parseInt(args[1]) });
            const embed = buildMcEmbed(response);
            message.channel.send({ embeds: [embed] });
        } catch {
            message.channel.send({ embeds: [errorEmbed('Could not reach that server. Double-check the IP and port.')] });
        }
    },
};

function buildMcEmbed(response) {
    const online = response.players.online;
    const max = response.players.max;
    const playerBar = buildPlayerBar(online, max);

    return baseEmbed(Colors.GAMING)
        .setAuthor({ name: 'Minecraft Server Status' })
        .setTitle(`${Icons.GAMING}  ${response.host}`)
        .setDescription(
            `${Icons.SUCCESS}  **Online**\n\n` +
            `${Icons.SERVER}  **IP**\n> \`${response.host}\`\n\n` +
            `${Icons.PEOPLE}  **Players** — ${online} / ${max}\n> ${playerBar}\n\n` +
            `${Icons.BOLT}  **Version**\n> ${response.version.name}`
        )
        .setFooter({ text: BOT_FOOTER });
}

function buildPlayerBar(online, max) {
    const length = 12;
    if (!max || max <= 0) return '▱'.repeat(length);
    const filled = Math.round((online / max) * length);
    return '▰'.repeat(filled) + '▱'.repeat(length - filled) + `  \`${online}/${max}\``;
}
