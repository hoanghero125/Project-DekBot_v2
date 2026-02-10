const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const util = require('minecraft-server-util');

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
            const embed = buildEmbed(response);
            await interaction.editReply({ embeds: [embed] });
        } catch {
            await interaction.editReply('There was an error finding this server.');
        }
    },

    async prefixExecute(message, args) {
        if (!args[0]) return message.channel.send("Please enter a Minecraft server IP.");
        if (!args[1]) return message.channel.send("Please enter a Minecraft server port.");

        try {
            const response = await util.status(args[0], { port: parseInt(args[1]) });
            const embed = buildEmbed(response);
            message.channel.send({ embeds: [embed] });
        } catch {
            message.channel.send('There was an error finding this server.');
        }
    },
};

function buildEmbed(response) {
    return new EmbedBuilder()
        .setColor('#4E5D94')
        .setTitle("Minecraft server status")
        .addFields(
            { name: 'Server IP', value: String(response.host) },
            { name: 'Online Players', value: String(response.players.online) },
            { name: 'Max Players', value: String(response.players.max) },
            { name: 'Version', value: String(response.version.name) },
        )
        .setFooter({ text: "Minecraft server status by Dek" });
}
