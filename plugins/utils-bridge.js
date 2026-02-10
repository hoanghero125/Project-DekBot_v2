// Bridge module: allows music-plugin.js to access theme utilities
// without importing from a path relative to commands/utils
const { successEmbed, Icons } = require('../utils/theme');
module.exports = { successEmbed, Icons };
