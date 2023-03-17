const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();
require('dotenv').config();

const gameChannelID = "1004187152344686672"; //channel for completed games & stats
const bossChannelId = "1004471441191862392"; //channel for boss kill logs
const serverTrackerChannelId = "1008020313222680647"; //channel for server tracker logs

// function that puts commas in a number
function toComma(number) {
	return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

function formatNumber(number) {
	return toComma(Number(number));
};

app.get('/', async (request, response) => {
	response.sendStatus(200);
});

app.post('/send-request', express.json(), async (request, response) => {

	if (request.headers.type === "update") {

		let updateMessage = new Discord.MessageEmbed()
			.setTitle(request.body.title)
			.setDescription(request.body.description)
			.setColor("#1fb975")
			.setTimestamp()
			.setFooter("Otyrna Communications");

		let updateChannel = client.channels.cache.get(request.body.channel);

		message = updateChannel.send('<@&983579513348821032>', {
			embed: updateMessage
		});

		return response.sendStatus(200); //.send("Success!");
	};

	if (request.headers.type === "test-server-update") {

		let updateMessage = new Discord.MessageEmbed()
			.setTitle(request.body.title)
			.setDescription(request.body.description)
			.setColor("#1fb975")
			.setTimestamp()
			.setFooter("Otyrna Communications");

		let updateChannel = client.channels.cache.get(request.body.channel);

		message = updateChannel.send('Test Server Update', {
			embed: updateMessage
		});

		return response.sendStatus(200); //.send("Success!");
	};

	if (request.headers.type === "roundover") {

		let roundoverMessage = new Discord.MessageEmbed()
			.setTitle("Round Over - " + (request.body.win == "true" ? "Victory" : "Defeat"))
			.setDescription(
				"**Difficulty:** " + request.body.difficulty + "\n" +
				"**Total Score:** " + request.body.score + "\n" +
				"**Total Deaths:** " + request.body.deaths + "\n" +
				"**Time:** " + request.body.time + "\n" +
				(request.body.win == "true" ? `**Remaining Lives:** ${request.body.remaininglives}\n` : `**Wave:** ${request.body.wave}\n`) +
				"**Number of Players:** " + request.body.numplayers + "\n")
			.setColor(request.body.difficultycolor)
			.setTimestamp()
			.setFooter("Otyrna Communications");

		/* removed in an attempt to reduce discord logging the bot out from too many requests
		let playerMessage = new Discord.MessageEmbed()
			.setTitle("Player Stats")
			//.setDescription("")
			.setColor((request.body.win == "true" ? "#1fb975" : "#ff0000"))
			.setTimestamp()
			.setFooter("Otyrna Communications");
		*/

		// sort players by score
		let players = request.body.players;
		players.sort((a, b) => {
			return b.score - a.score;
		}).forEach(player => {
			// playerMessage
			roundoverMessage.addField(player.displayname + ` (@${player.name})`, `Level: ${formatNumber(player.level)}\nScore: ${formatNumber(player.score)}\nDeaths: ${formatNumber(player.deaths)}`, true);
		});

		/*
		for (const obj of request.body.players) {
			playerMessage.addField(obj.displayname + ` (@${obj.name})`, `Level: ${obj.level}\nScore: ${obj.score}\nDeaths: ${obj.deaths}`, true);
		}
		*/

		let roundoverChannel = await client.channels.fetch(gameChannelID)
		/*
		roundoverChannel.send({
			embeds: [
				roundoverMessage;
				playerMessage
					]
		});
		*/

		roundoverChannel.send(roundoverMessage);

		return response.sendStatus(200); //.send("Success!");
	};

	if (request.headers.type === "bosskill") {

		let bosskillMessage = new Discord.MessageEmbed()
			.setTitle("Boss Kill - " + request.body.boss)
			.setDescription(
				"**Difficulty:** " + request.body.difficulty + "\n" +
				//"**Boss:** " + request.body.boss + "\n" +
				"**Wave:** " + request.body.wave + "\n" +
				"**Remaining Lives:** " + request.body.remaininglives + "\n" +
				"**Time:** " + request.body.time + "\n" +
				"**Number of Players:** " + request.body.numplayers + "\n")
			.setColor(request.body.bosscolor)
			//.setColor(request.body.difficultycolor)
			.setTimestamp()
			.setFooter("Otyrna Communications");

		// sort players by score and add to message
		let players = request.body.players;

		players.sort((a, b) => {
			return (b.percentage * 100000) - (a.percentage * 100000);
		}).forEach(player => {
			bosskillMessage.addField(
				player.displayname + ` (@${player.name})` + (player.morph == "false" ? "" : ` as ${player.morph}\n`),

				// combat stats
				`Percentage: ${Math.round(Number(player.percentage) * 100)}%\n\n` +

				// player stats
				`Level: ${player.level}\nScore: ${player.score}\nCash: ${player.cash}\nDeaths: ${player.deaths}\n\n` +

				// rewards (why don't these numbers have commas but the ones above do??) - idk
				`Cash Reward: ${formatNumber(player.cashreward)}\nScore Reward: ${formatNumber(player.scorereward)}\nXP Reward: ${formatNumber(player.xpreward)}`,

				// inline
				true
			);
		});

		let bosskillChannel = await client.channels.fetch(bossChannelId);
		bosskillChannel.send(bosskillMessage);

		return response.sendStatus(200);
	};

	if (request.headers.type === "sendmessage") {
		let general = await client.channels.fetch(request.body.channel);
		general.send(request.body.message);
	};

	return response.sendStatus(200); //.send("Did not post message.");
});

let listener = app.listen(process.env.PORT, () => {
	console.log(`Your app is currently listening on port: ${listener.address().port}`);
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.on("message", async message => {
	if (message.author.bot) return;
	if (message.channel.type == "dm") return;

	if (message.mentions.users.has(client.user.id) && message.channel.name !== "general") {
		message.channel.send("Stop pinging me!!!");
	};
});

client.login(token);