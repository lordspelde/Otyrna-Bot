const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	
	execute(client) {
		console.log(`Logged into the Discord account - ${c.user.tag}`);
		client.user.setActivity('Watching over EoC');
	},
};