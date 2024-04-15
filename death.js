const mineflayer = require('mineflayer');
var vec3 = require('vec3');
const { Movements, pathfinder } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin
const autoeat = require('mineflayer-auto-eat').plugin

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

let bots = []

async function deth() {
	for (i = 0; i < 3; i++) {
		const bot = mineflayer.createBot({
			username: "blank_attack_" + i,
			host: "nickname___.aternos.me",
			port: 38934,
			version: "1.12.2"
		});
		bot.loadPlugin(pathfinder)
		bot.loadPlugin(pvp)
		bot.loadPlugin(autoeat)
		
		bot.on('kicked', console.log);
		bot.on('error', console.log);
		
		bot.once('spawn', async ()=>{
			bot.defaultMove = new Movements(bot);
			bot.defaultMove.digCost = 35;
			bot.defaultMove.placeCost = 10;
			bot.defaultMove.canOpenDoors = true;
			
			bot.pvp.movements = bot.defaultMove;
			bot.pvp.followRange = 2;
			
			await bot.chat("/reg _sussybaka123")
			await delay(500)
			await bot.chat("/login _sussybaka123")
			await delay(500)
			await bot.chat("/skin https://cdn.discordapp.com/attachments/1038163443318001725/1227657822355984435/blank.png?ex=66293471&is=6616bf71&hm=90d0c8ccdb3fe759dce0d5dd07f523198abb5060020020da86726f31ce57b03d&")
			
			await bot.chat("WAVE " + i)
		});
		
		bot.inter = setInterval(() => {
			let entity = bot.nearestEntity((entity)=>{
				let name = entity.username || entity.displayName;
			
				return name && !name.toLowerCase().startsWith("blank_attack") && name.toLowerCase() !== "dropped item" && entity.type.toLowerCase() === "player";
			});
			if (entity) {
				try {
					bot.pvp.attack(entity);
				} catch {
					
				}
				return;
			}
			entity = bot.nearestEntity((entity)=>{
				let name = entity.username || entity.displayName;
			
				return name && !name.toLowerCase().startsWith("blank_attack") && name.toLowerCase() !== "dropped item";
			});
			if (entity) {
				try {
					bot.pvp.attack(entity);
				} catch {
					
				}
				return;
			}
			let block = bot.findBlock({
				matching: (block) => {
					return block.displayName !== "Air"
				}
			})
			if (entity) {
				try {
					bot.dig(block);
				} catch {
					
				}
			}
		}, 1000)
		
		await delay(100000)
	}
}

deth()