const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colors, Icons, BOT_FOOTER, baseEmbed } = require('../utils/theme');

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
    const divider = '─'.repeat(32);

    return baseEmbed(Colors.PRIMARY)
        .setAuthor({ name: 'DekBot  •  Command Center', iconURL: undefined })
        .setTitle(`${Icons.COMMAND}  Available Commands`)
        .setDescription(
            `Welcome! Here's everything I can do.\n` +
            `Use **slash commands** or the **\`^\` prefix**.\n\n` +
            `${divider}`
        )
        .addFields(
            {
                name: `${Icons.HEADPHONES}  Music`,
                value: [
                    `> ${Icons.PLAY} **Play** — \`/play\` · \`^play\` · \`^p\``,
                    `> *Play a song or add it to the queue*`,
                    `> Supports YouTube, Spotify, Apple Music and SoundCloud!`,
                    `> `,
                    `> ${Icons.SKIP} **Skip** — \`/skip\` · \`^skip\` · \`^s\``,
                    `> *Skip the current song*`,
                    `> `,
                    `> ${Icons.STOP} **Stop** — \`/stop\` · \`^stop\``,
                    `> *Stop playback and clear the queue*`,
                    `> `,
                    `> ${Icons.QUEUE} **Queue** — \`/queue\` · \`^queue\` · \`^q\``,
                    `> *View the current music queue*`,
                ].join('\n'),
                inline: false,
            },
            {
                name: `${Icons.HAMMER}  Utilities`,
                value: [
                    `> ${Icons.GAMING} **MC Server** — \`/mcsv\` · \`^mcsv\``,
                    `> *Check a Minecraft server's status*`,
                    `> `,
                    `> ${Icons.GLOBE} **Info** — \`/info\` · \`^info\``,
                    `> *About DekBot and its creator*`,
                ].join('\n'),
                inline: false,
            },
        )
        .setFooter({ text: `${BOT_FOOTER}  •  /help for this menu` });
}
