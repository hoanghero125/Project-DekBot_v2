const { SlashCommandBuilder } = require('discord.js');

const YOUTUBE_URL = "https://www.youtube.com/c/DekuranVN";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('youtube')
        .setDescription("Show creator's Youtube channel"),
    name: 'youtube',
    aliases: [],

    async execute(interaction) {
        await interaction.reply(`Here is my creator's Youtube channel: ${YOUTUBE_URL} | Go subscribe!`);
    },

    async prefixExecute(message) {
        message.channel.send(`Here is my creator's Youtube channel: ${YOUTUBE_URL} | Go subscribe!`);
    },
};
