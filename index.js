const mineflayer = require("mineflayer")
const mcGPT = require("./gpt-for-mc.js")
const { Movements, pathfinder } = require("mineflayer-pathfinder")
const bloodhoundPlugin = require("mineflayer-bloodhound")(mineflayer)
const deathEvent = require("mineflayer-death-event")
const pvp = require("mineflayer-pvp").plugin
const autoeat = require("mineflayer-auto-eat").plugin
const toolPlugin = require("mineflayer-tool").plugin
const mineflayerViewer = require('prismarine-viewer').mineflayer

const config = require("./config.json")

let character = require("./characters/blank.json")
character.outputFilter = (text) => {return text.toLowerCase()}

const bot = mineflayer.createBot({
	username: character.username,
	host: config.server.ip,
	port: config.server.port,
	version: config.server.version
})
bot.loadPlugin(pathfinder)
bloodhoundPlugin(bot)
bot.bloodhound.yaw_correlation_enabled = true
bot.loadPlugin(deathEvent)
bot.loadPlugin(pvp)
bot.loadPlugin(autoeat)
bot.loadPlugin(toolPlugin)

bot.on("kicked", console.log)
bot.on("error", console.log)

mcGPT(bot, {
	personality: character.personality,
	dummyMode: character.dummyMode,
	outputFilter: character.outputFilter
})

bot.once("spawn", () => {
	bot.defaultMove = new Movements(bot)
	bot.defaultMove.digCost = 15
	bot.defaultMove.placeCost = 5
	bot.defaultMove.canOpenDoors = true
		
	bot.pvp.movements = bot.defaultMove
	bot.pvp.followRange = 2
		
	if (config.server.crackedServerLogin) {
		bot.chat("/register " + config.server.crackedServerLogin)
		bot.chat("/login " + config.server.crackedServerLogin)
	}

	mineflayerViewer(bot, { port: 3000 })
})

bot.on("chat", (username, message) => {
	if (username === bot.username) return
	if (!message.startsWith(character.prefix)) return
		
	if (bot.gpt.dummyMode) {
		bot.gpt.action(message.slice(character.prefix.length))
		return
	}
	bot.gpt.send(username + " said: " + message.slice(character.prefix.length))
})

bot.on("onCorrelateAttack", (attacker, victim, weapon) => {
	let victimText = (victim.username === bot.entity.username) ? "You are" : ((victim.displayName || victim.username ) + " is")
	let attackerText = (attacker.username === bot.entity.username) ? "you" : (attacker.displayName || attacker.username)
	let fullText = "SYSTEM: " + victimText + " being attacked by " + attackerText
	if (weapon) fullText += " with: " + weapon.displayName
	bot.gpt.send(fullText)
})

bot.prevHealth = bot.health

bot.on("health", () => {
	if (bot.prevHealth > bot.health) {
		bot.gpt.send("SYSTEM: Your health decreased. Your health now is: " + (bot.health / 20 * 100).toFixed(2) + "%")
	}
	bot.prevHealth = bot.health
	if (bot.food < 7) {
		bot.gpt.send("SYSTEM: You want to eat")
	}
})

bot.on("playerCollect", (collector, collected) => {
	if (!collected.getDroppedItem()) return
	if (collector.username === bot.entity.username) {
		bot.gpt.send("SYSTEM: You just have picked up " + collected.getDroppedItem().displayName + " x" + collected.getDroppedItem().count + ".")
	}
})

bot.on("attackedTarget", () => {
	bot.gpt.send("SYSTEM: You dealt damage to " + (bot.pvp.target.username || bot.pvp.target.displayName))
})

bot.on("stoppedAttacking", () => {
	bot.gpt.send("SYSTEM: you have stopped attacking the target")
})

bot.on("respawn", () => {
	bot.pathfinder.setGoal()
})

//  NEEDS TO BE FIXED:

//bot.on("rain", () => {
//	if (bot.rainState) {
//		bot.gpt.send("It is raining now")
//	} else {
//		bot.gpt.send("It is no longer raining")
//	}
//})

//bot.on("itemDrop", (entity) => {
//	if (entity.position.distanceTo(bot.entity.position) > 10) return
//	bot.gpt.send("Item entity with name " + entity.displayName + " was dropped. Item type is " + entity.getDroppedItem().name + ".")
//})

//bot.on("path_update", (path) => {
//	if (path.status === "timeout") {
//		bot.gpt.send("SYSTEM: You are near player that you following")
//	}
//})

//bot.on("breath", () => {
//	bot.gpt.send("You are drowning")
//})

//bot.on("playerDeath", (data) => {
//	console.log(data)
//    bot.gpt.send("SYSTEM: You died (and respawned because you are in minecraft).")
//})
