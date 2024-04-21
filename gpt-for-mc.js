const openai = require("openai")
const { GoalNear, GoalFollow, GoalInvert } = require("mineflayer-pathfinder").goals
const fs = require('fs');
const { Vec3 } = require("vec3")

const config = require("./config.json");

const FEEDBACK_DELAY = 500

const aiClient = new openai({
	baseURL: (config.endpoints || [])[0],
	apiKey: config.apiKey,
	timeout: 30000
})

async function getChatGPTResponse(bot, messages) {
	try {
		//messages = [{ role: "user", content: "Say this is a test" }]
		const completion = await aiClient.chat.completions.create({
			model: bot.gpt.model,
			messages: messages,
		})
    	return completion.choices[0].message.content
	} catch (e) {
		console.log(e)
		await bot.chat(bot.entity.username + " is sleepy today")
		throw new Error("Gpt isnt working")
	}
}

const COMMAND_LIST = {
	//"remem": "Saves important data. Usage: remem <key> <value>",
	//"mem": "Tells you data you saved using remem command. Usage: mem",
	"pos": "Tells you your xyz coordinates. Usage: pos",
	"near_blocks": "Returns a list of nearby blocks",
	"near_entities": "Returns a list of nearby entities",
	"follow": "Makes you follow a specified entity. Pathfinding is done automatically. Usage: follow <entityName>",
	"run_away": "Makes you run away from specified entity. Usage: run_away <entityName>",
	"attack": "Makes you start fighting specified entity. Usage: attack <entityName>",
	"stop": "Makes you stop moving and stand in place. Also stops attacking. Usage: stop",
	"lookat": "Makes you look in the direction of a specified entity. Usage: lookat <entityName>",
	"rotate": "Makes you rotate your head by specified yaw and pitch in radians. Usage: rotate <yaw> <pitch>",
	"punch": "Punches the specified entity. Usage: punch <entityName>",
	"sneak": "Activate/deactivate sneaking. Takes one argument which can be either ON or OFF. Usage: sneak <on/off>",
	"jump": "Makes you jump. Usage: jump",
	"mine": "Breaks multiple of the nearest blocks of specified type. Usage: mine <blockName> <count>",
	"goto": "Makes you go to specified coordinates. Usage: goto <x> <y> <z>",
	"goto_block": "Makes you go to specified block (for entities use follow). Usage: goto <blockName>",
	"place_here": "Places block from your inventory in the world. Usage: place_here <itemName>",
	"activate": "Activates specified block. Usage: activate <blockName>",
	"inv": "Tells you a list of items in your inventory. Usage: inv",
	"equip": "Moves specified item to specified destination. Destination can be: hand, head, torso, legs, feet, off-hand. Usage: equip <itemName> <destination>",
	"unequip": "Moves item from specified destination. Destination can be: hand, head, torso, legs, feet, off-hand. Usage: equip <destination>",
	"toss": "Toss items out of inventory. Usage: toss <itemName> <count>",
}

let COMMAND_PROMPT = `You are a minecraft bot.
Each line of your response should be either command to use or text to say.
Arguments to these commands are seperated by spaces.
Commands should be prefixed with "!".

You must use the following commands to control your minecraft character:
<INSERT COMMANDS HERE>
You can refer to nearest entities by their name of type. DO NOT USE QUOTES.
To communicate with others, type plain text without the "!" prefix. Your character will respond to events based on the commands you provide.
Use commands promptly to control your character effectively.

To perform action you MUST use command for that action.

Here are some examples:
"""
Event > frank said: hello! follow me
Respond with the following:
!follow frank
Hello! I'm following you now.

Event > frank said: what items do you have?
Respond with the following:
!inv

Event > SYSTEM: You don't have any items
Respond with the following:
It seems like i don't have any items.

Event > frank said: whats your position?
Respond with the following:
!pos

Event > SYSTEM: Your position: -212.36 65.00 232.85
Respond with the following:
My position is -212.36 65.00 232.85

Event > SYSTEM: Damage was dealt to you (probably not by someone)
Event > SYSTEM: You are being attacked by frank
Respond with the following:
Stop attacking me please.

Event > SYSTEM: You are being attacked by frank
Respond with the following:
!attack frank
You leave me no choice.
"""

Please respond in multiple lines with a command then a response.
Remember to use one line for one command!
Do not respond to all system messages. You still may use that information.
You will be given time of request.
Events will be presented to you, and you should respond accordingly.
`

async function getActionsFromCommand(bot, data) {
	if (bot.gpt.log.length + 2 > config.messageLimit) {
		bot.gpt.log.splice(1, 2)
	}
	
	//bot.gpt.log.push({"role": "user", "content": data})
	bot.gpt.log.push({"role": "system", "content": data})
	let response = ""
	if (bot.gpt.outputFilter) {
    	response = bot.gpt.outputFilter(await getChatGPTResponse(bot, bot.gpt.log))
	} else {
    	response = await getChatGPTResponse(bot, bot.gpt.log)
	}
	bot.gpt.log.push({"role": "assistant", "content": response})
	
	if (config.saveMessages) {
		fs.writeFile("messages.json", JSON.stringify(bot.gpt.log), function(err) {
			if (err) {
				console.log(err);
			}
		});
	}
	
	for (msg of bot.gpt.log) {
		console.log(msg.role[0] + ": " + msg.content)
	}

    return response
}

function findEntity(bot, search="None") {
	let entity = bot.nearestEntity((entity)=>{
		let name = entity.username || entity.displayName
	
		return name && name.toLowerCase().includes(search.toLowerCase())
	})
	return entity
}

function findBlock(bot, search="None") {
	let block = bot.findBlock({
		matching: (block) => {
			try {
				return block.displayName.toLowerCase().includes(search.toLowerCase().replace("_", " "))
			} catch {
				return false
			}
		}
	})
	return block
}

function findBlocks(bot, search="None", count) {
	let blocks = bot.findBlocks({
		matching: (block) => {
			try {
				return block.displayName.toLowerCase().includes(search.toLowerCase().replace("_", " "))
			} catch {
				return false
			}
		},
		count: count
	})
	return blocks
}

async function mineBlocks(bot, blockName, count) {
	let stop = false
	bot.once("stop_all", () => {
		stop = true
	})
	let mined = 0

	for (let i = 0; i < count; i++) {
		if (stop) break
		let block = findBlock(bot, blockName)
		if (!block) {
			break
		}
		bot.pathfinder.setMovements(bot.defaultMove)
		let goalBlock = new GoalNear(block.position.x + 0.5, block.position.y + 0.5, block.position.z + 0.5, 1.5)
		try {
			await bot.pathfinder.goto(goalBlock, true)
		} catch (e) {
			console.log(e)
			break
		}
		let canBreak = false
		try {
			await bot.tool.equipForBlock(block, {requireHarvest: true})
		} catch (e) {
			setTimeout(() => {bot.gpt.send("SYSTEM: You can't break this block")}, FEEDBACK_DELAY)
			canBreak = true
			console.log(e)
		}
		if (!canBreak) {
			let errored = false
			try {
				await bot.dig(block, true, "raycast")
			} catch (e) {
				console.log("block break err")
				errored = true
			}
			if (!errored) {
				mined++
			}
		}
		await bot.waitForTicks(10)
	}
	setTimeout(() => {bot.gpt.send("SYSTEM: Mined " + mined + " blocks!")}, FEEDBACK_DELAY)
	bot.emit("stop_all")
}

function findItemInv(bot, search="None") {
	let items = bot.inventory.items()
	let foundItem = null
	items.forEach(item => {
		if (item.displayName.toLowerCase().includes(search.toLowerCase().replace("_", " "))) {
			foundItem = item
		}
	})
	return foundItem
}

function findItemInv(bot, search="None") {
	let items = bot.inventory.items()
	let foundItem = null
	items.forEach(item => {
		if (item.displayName.toLowerCase().includes(search.toLowerCase().replace("_", " "))) {
			foundItem = item
		}
	})
	return foundItem
}

const COMMAND_FUNCTIONS = {
	"remem": async (bot, [key], fullText)=>{
        bot.gpt.memory[key] = fullText.slice(7 + key.length)
    },
	
	"mem": async (bot)=>{
		let fullText = "SYSTEM: Saved data: "
		for (key in bot.gpt.memory) {
			fullText += key + "=" + bot.gpt.memory[key] + ""
		}
		setTimeout(() => {bot.gpt.send(fullText)}, FEEDBACK_DELAY)
    },
	
	"pos": async (bot) => {
		setTimeout(() => {bot.gpt.send(`SYSTEM: Your position: ${bot.entity.position.x.toFixed(2)} ${bot.entity.position.y.toFixed(2)} ${bot.entity.position.z.toFixed(2)}`)}, FEEDBACK_DELAY)
    },
	
	"follow": async (bot, [entityName]) => {
		let entity = findEntity(bot, entityName)
		if (!entity) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Entity not found")}, FEEDBACK_DELAY)
			return
		}
		bot.pathfinder.setMovements(bot.defaultMove)
		bot.pathfinder.setGoal(new GoalFollow(entity, 2), true)
    },
	
	"run_away": async (bot, [entityName]) => {
		let entity = findEntity(bot, entityName)
		if (!entity) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Entity not found")}, FEEDBACK_DELAY)
			return
		}
		bot.pathfinder.setMovements(bot.defaultMove)
		bot.pathfinder.setGoal(new GoalInvert(new GoalFollow(entity, 50)), true)
    },
	
	"attack": async (bot, [entityName]) => {
		let entity = findEntity(bot, entityName)
		if (!entity || entity.getDroppedItem()) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Entity not found")}, FEEDBACK_DELAY)
			return
		}
		bot.pvp.attack(entity)
    },
	
	"stop": async (bot) => {
		bot.pathfinder.setGoal()
		bot.pvp.stop()
		bot.stopDigging()
		bot.emit("stop_all")
    },

    "lookat": async (bot, [entityName]) => {
		clearInterval(bot.gpt.lookInterval)
		let entity = findEntity(bot, entityName)
		if (!entity) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Entity not found")}, FEEDBACK_DELAY)
			return
		}
		bot.gpt.lookInterval = setInterval(() => {
			bot.lookAt(entity.position.offset(0, (entity || bot.nearestEntity()).height, 0))
		}, 100)
    },

    "rotate": async (bot, [yaw, pitch]) => {
		yaw = bot.entity.yaw + (parseFloat(yaw) || 0)
		pitch = bot.entity.pitch + (parseFloat(pitch) || 0)
		bot.look(yaw, pitch)
    },

    "punch": async (bot, [entityName]) => {
		let entity = findEntity(bot, entityName)
		if (!entity) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Entity not found")}, FEEDBACK_DELAY)
			return
		}
        await bot.lookAt(entity.position.offset(0, entity.height, 0), true)
        await bot.attack(entity)
    },

    "inv": async (bot) => {
        let items = bot.inventory.items()
		if (!items.length) {
			setTimeout(() => {bot.gpt.send("SYSTEM: You don't have any items")}, FEEDBACK_DELAY)
			return
 		}
		let itemList = "SYSTEM: Items you have:"
		items.forEach(item => {
			itemList += " " + item.displayName + " = " + item.count
		})
		setTimeout(() => {bot.gpt.send(itemList)}, FEEDBACK_DELAY)
    },

    "equip": async (bot, itemName) => {
		let destination = itemName.pop()
		let item = findItemInv(bot, itemName.join(" "))
		
		if (!item) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Item not found")}, FEEDBACK_DELAY)
			return
		}
		try {
        	await bot.equip(item, destination)
		} catch (e) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Destination not found")}, FEEDBACK_DELAY)
		}
    },

    "unequip": async (bot, [destination]) => {
		try {
        	await bot.unequip(destination)	
		} catch (e) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Destination not found")}, FEEDBACK_DELAY)
		}
    },

    "toss": async (bot, itemName)=>{
		let quantity = parseInt(itemName.pop()) || 1
		let item = findItemInv(bot, itemName.join(" "))
		
		if (!item) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Item not found")}, FEEDBACK_DELAY)
			return
		}

		try {
			await bot.toss(item.type, null, quantity)
		} catch {
			
		}
    },

    "sneak": async (bot, [state]) => {
		if (!state) {
			await bot.setControlState("sneak", true)
			await bot.waitForTicks(4)
			await bot.setControlState("sneak", false)
			return
		}
        if (state.toLowerCase() === "on") bot.setControlState('sneak', true)
        else if (state.toLowerCase() === "off") bot.setControlState('sneak', false)
    },
	
	"jump": async (bot) => {
		await bot.setControlState("jump", true)
		await bot.waitForTicks(1)
		await bot.setControlState("jump", false)
		await bot.waitForTicks(7)
	},
	
	"mine": async (bot, blockName) => {
		let count = parseInt(blockName.pop()) || 1
		mineBlocks(bot, blockName.join(" "), count)
	},
	
	"place_here": async (bot, itemName) => {
		let item = findItemInv(bot, itemName.join(" "))
		
		if (!item) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Item not found")}, FEEDBACK_DELAY)
			return
		}

		const target_dest = new Vec3(Math.floor(bot.entity.position.x), Math.floor(bot.entity.position.y), Math.floor(bot.entity.position.z))

		let buildOffBlock = null
    	let faceVec = null
    	const dirs = [new Vec3(0, -1, 0), new Vec3(0, 1, 0), new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)]
    	for (let d of dirs) {
    	    const block = bot.blockAt(target_dest.plus(d))
    	    buildOffBlock = block
    	    faceVec = new Vec3(-d.x, -d.y, -d.z)
    	    break
    	}

		bot.pathfinder.setMovements(bot.defaultMove)
		await bot.equip(item, 'hand')
		bot.pathfinder.setGoal(new GoalInvert(new GoalNear(bot.entity.position.x, bot.entity.position.y, bot.entity.position.z, 2)), true)
		await bot.waitForTicks(10)
		try {
			await bot.placeBlock(buildOffBlock, faceVec)
		} catch (err) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Failed to place block")}, FEEDBACK_DELAY)
		}
	},
	
	"activate": async (bot, blockName) => {
		let block = findBlock(bot, blockName.join(" "))
		if (!block) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Block not found")}, FEEDBACK_DELAY)
			return
		}
		try {
			bot.activateBlock(block)
		} catch (e) {
			console.log(e)
		}
	},
	
	"goto_block": async (bot, blockName) => {
		let block = findBlock(bot, blockName.join(" "))
		if (!block) {
			setTimeout(() => {bot.gpt.send("SYSTEM: Block not found")}, FEEDBACK_DELAY)
			return
		}
		bot.pathfinder.setMovements(bot.defaultMove)
		bot.pathfinder.setGoal(new GoalNear(block.position.x + 0.5, block.position.y + 0.5, block.position.z + 0.5, 1), true)
	},
	
	"goto": async (bot, [x, y, z]) => {
		x = parseFloat(x) || bot.entity.position.x
		y = parseFloat(y) || bot.entity.position.y
		z = parseFloat(z) || bot.entity.position.z
		bot.pathfinder.setMovements(bot.defaultMove)
		bot.pathfinder.setGoal(new GoalNear(x + 0.5, y + 0.5, z + 0.5, 1), true)
	},
	
	"near_blocks": async (bot) => {
		let blockNames = findBlocks(bot, "", 1000).map((block) => bot.blockAt(block).displayName)
		let blockList = "SYSTEM: Blocks near you:"
		for (blockName of new Set(blockNames)) {
			if (blockName === "Air") continue;
			blockList += ` "${blockName}"`
		}
		setTimeout(() => {bot.gpt.send(blockList)}, FEEDBACK_DELAY)
	},
	
	"near_entities": async (bot) => {
		let entityList = "SYSTEM: Entities near you:"
		console.log(bot.entities)
		for (entityID in bot.entities) {
			let entity = bot.entities[entityID]
			if (bot.entity.position.distanceTo(entity.position) <= 16 && entity.username !== bot.entity.username) {
				entityList += ` "${entity.username || entity.displayName}"`
			}
		}
		setTimeout(() => {bot.gpt.send(entityList)}, FEEDBACK_DELAY)
	},
	
	"write_book": async (bot, _, fullText) => {
		fullText = fullText.slice("write_book".length)
		let pages = []
		for (let i = 0; i < fullText.length; i += 256) {
			pages.push(fullText.slice(i, i + 256))
		}
		try {
			await bot.writeBook(36, pages)
		} catch (e) {
			console.log(e)
		}
	}
}

async function performActions(bot, actions) {
    actions = actions.split("\n")

    for (action of actions) {
        let tokens = action.split(" ")

		if (tokens[0].startsWith("!")) {
			let commandFunction = bot.gpt.COMMAND_FUNCTIONS[tokens[0].slice(1).toLowerCase()]
	
			if (commandFunction === undefined) {
				setTimeout(() => {bot.gpt.send("SYSTEM: No such command")}, FEEDBACK_DELAY)
			} else {
				await commandFunction(bot, tokens.slice(1), action)
			}
		} else {
			bot.chat(action)
		}

        await bot.waitForTicks(bot.gpt.actionDelay)
    }
}

function plugin(bot, {key, personality, dummyMode=false, outputFilter}) {	
    bot.gpt = {
        COMMAND_FUNCTIONS: COMMAND_FUNCTIONS,
        COMMAND_LIST: COMMAND_LIST,
        actionDelay: 4, // How long to wait between executing commands. (ticks)
        model: config.model,
        personality: personality,
        log: [],
		onCooldown: true,
		dataBus: "",
		dummyMode: dummyMode,
		memory: {},
		outputFilter: outputFilter,
		lookInterval: null
    }
	
	let listOfCommands = ""
	for (key of Object.keys(bot.gpt.COMMAND_LIST)) {
		listOfCommands += `!${key} -> ${bot.gpt.COMMAND_LIST[key]}\n`
	}

    if (!bot.registry) bot.registry = require("minecraft-data")(bot.version)

    bot.gpt.send = async (data) => {
		if (data && !bot.gpt.dataBus.endsWith(data)) {
			bot.gpt.dataBus += "\n" + data
		}
		if (bot.gpt.onCooldown) return
		if (!bot.gpt.dataBus) return
		clearInterval(bot.gpt.lookInterval)
		bot.gpt.onCooldown = true
		console.log("EXECUTING", bot.gpt.dataBus)
		if (!bot.gpt.dummyMode) {
			let actions = await getActionsFromCommand(bot, bot.gpt.dataBus.slice(1))

			performActions(bot, actions)
		}
		bot.gpt.dataBus = ""
		setTimeout(() => {
			bot.gpt.onCooldown = false
			bot.gpt.send()
		}, 5000)
    }

    bot.gpt.action = (action)=>{
        performActions(bot, action)
    }
	
	function initChat() {
		try {
			bot.gpt.log = require("./messages.json")
		} catch (e) {
			console.log(e)
			bot.gpt.log.push({"role": "system", "content": COMMAND_PROMPT.replace("<INSERT COMMANDS HERE>", listOfCommands) + "\n" + bot.gpt.personality})
		}
		setTimeout(() => {
			bot.gpt.onCooldown = false
			bot.gpt.send()
		}, 1000)
	}

	if (!bot.gpt.dummyMode) {
		initChat()
	} else {
		bot.gpt.onCooldown = false
	}
	
	for (msg of bot.gpt.log) {
		console.log(msg.role[0] + ": " + msg.content)
	}
}

module.exports = plugin