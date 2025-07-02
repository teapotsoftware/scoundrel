let cvs;
let ctx;

let mouseX;
let mouseY;

let loadingTime = 200; // shhhh
let ScrW = 640;
let ScrH = 480;

let loading = 0;
let loaded = 0;
let sprites = {};

let health = 20;
let deck = [];
let room = {[0]: -1, [1]: -1, [2]: -1, [3]: -1};
let hoveredCard = -1;
let hoveredTrash = -1;
let hoveredOther = -1;
let ranLast = false;

let settingsMenu = false;
let volume = 1;
let musicVolume = 0;

// value of our weapon, used as damage and to load sprite
let heldWeapon = -1;

// durability of held weapon, 0 at first, 14 when picking up a weapon
let heldWeaponDurability = 0;

// suit enums - types of cards
const ENEMY = 0;
const WEAPON = 1;
const HEAL = 2;

const attackSounds = {}
attackSounds[10] = "shoot";

const SUITS = [
	{
		name: "Enemy",
		color: "red",
		click: function(val) {
			health -= getEnemyDamage(val)
			if (health <= 0) {
				playSound("dead");
			}
			// no affect on weapon durability if we punch
			if (mustPunchEnemy(val)) {
				playSound("punch");
			} else {
				playSound(attackSounds[heldWeapon] ? attackSounds[heldWeapon] : "stab");
				if (isHoldingWeapon()) {
					heldWeaponDurability = val;
				}
			}
			playSound("monster");
		},
		getHoverSprite: function(val) {return mustPunchEnemy(val) ? "fist" : getWeaponSprite(heldWeapon);}
	}, {
		name: "Weapon",
		color: "orange",
		click: function(val) {
			heldWeapon = val;
			heldWeaponDurability = 14;
			playSound("pickup");
		},
		getHoverSprite: function(val) {return "hand";}
	}, {
		name: "Heal",
		color: "lime",
		click: function(val) {
			health += val;
			if (health > 20) {
				health = 20;
			}
			playSound("eat");
		},
		getHoverSprite: function(val) {return "heal";}
	}
]

function getWeaponSprite(weapon) {return "weapon/" + (weapon - 2)}

// if durability less than enemy value, we must punch
function mustPunchEnemy(enemyVal) {return heldWeaponDurability < enemyVal;}

// helper func, -1 is placeholder for fists (no weapon)
function isHoldingWeapon() {return heldWeapon != -1;}

// how much damage this enemy would do if we choose to fight it
function getEnemyDamage(enemyVal) {return mustPunchEnemy(enemyVal) ? enemyVal : Math.max(0, enemyVal - heldWeapon);}

function shuffle(array) {
	let currentIndex = array.length;
	while (currentIndex != 0) {
		let randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}
}

// build card object, load its sprite if necessary, and return card
function makeCard(suit, val) {
	return {
		suit: suit,
		value: val + 2,
		sprite: loadSprite(SUITS[suit].name.toLowerCase() + "/" + val)
	};
}

// reset the deck, loading all the sprites if necessary
function resetDeck() {
	deck = [];
	for (let i = 0; i < 9; i++) {
		deck.push(makeCard(HEAL, i));
		deck.push(makeCard(WEAPON, i));
	}
	for (let i = 0; i < 13; i++) {
		let enemy = makeCard(ENEMY, i);
		// add twice the amount of enemies to the deck than other suits
		deck.push(enemy);
		deck.push(enemy);
	}
	shuffle(deck);
}

function checkRoomFullness() {
	let cardsLeft = 0;
	for (let i = 0; i < 4; i++) {
		if (room[i] != -1) {
			cardsLeft++;
		}
	}
	if (cardsLeft <= 1) {
		fillRoom();
	}
}

function clickRoomCard(i) {
	if (i == -1) {return;}
	let card = room[i];
	if (!card || card == -1) {return;}
	SUITS[card.suit].click(card.value);
	room[i] = -1;
	checkRoomFullness();
}

function discardWeapon(i) {
	if (room[i] && room[i].suit == WEAPON) {
		room[i] = -1;
	}
	playSound("trash");
	checkRoomFullness();
}

// return sprite NAME not sprite object
function loadSprite(name) {
	if (!sprites[name]) {
		sprites[name] = new Image();
		sprites[name].onload = function() {
			setTimeout(function() {
				loaded++;
			}, Math.random() * loadingTime);
		}
		sprites[name].src = `32x32/${name}.png`
		loading++;
	}
	return name;
}

function sprite(name, x, y, scale = 2) {
	let img = sprites[name];
	if (!img || img == -1) {
		console.error("can't find sprite " + name);
		return;
	}
	let hsize = scale * 16;
	ctx.drawImage(img, x - hsize, y - hsize, hsize * 2, hsize * 2);
}

let sounds = {};

function loadSound(name) {
	sounds[name] = new Audio("sound/" + name + ".mp3");
	sounds[name].preload = true;
	sounds[name].addEventListener('canplaythrough', function() {
		setTimeout(function() {
			loaded++;
		}, Math.random() * loadingTime);
	}, false);
	loading++;
	return name;
}

function calcVolume(vol) {
	return 1.0 / Math.pow(1.8, 8 - vol);
}

function playSound(name) {
	if (volume == 0) {return;}
	sounds[name].volume = calcVolume(volume);
	sounds[name].currentTime = 0;
	sounds[name].play();
}

function fillRoom() {
	for (let i = 0; i < 4; i++) {
		if (room[i] == -1 && deck.length > 0) {
			room[i] = deck.pop();
		}
	}
	ranLast = false;
}

function runFromRoom() {
	if (ranLast) {return;}
	let returns = [];
	for (let i = 0; i < 4; i++) {
		if (room[i] != -1) {
			returns.push(room[i]);
			room[i] = -1;
		}
	}
	shuffle(returns);
	for (let i = 0; i < returns.length; i++) {
		deck.unshift(returns.pop());
	}
	fillRoom();
	ranLast = true;
	playSound("door");
}

function topRightHovered() {return isMouseNear(ScrW - 24, 24, 24);}

function getCardX(i) {return ScrW * 0.2 * (i + 1);}
function getCardY(i) {return ScrH * 0.3;}

function draw() {
	ctx.fillStyle = "gray";
	ctx.fillRect(0, 0, ScrW, ScrH);

	let tileSprite = sprites.mossy;
	let tileSize = 64;
	for (let x = 0; x < ScrW; x += tileSize) {
		for (let y = 0; y < ScrH; y += tileSize) {
			ctx.drawImage(tileSprite, x, y, tileSize, tileSize);
		}
	}

	// reset cursor in case we don't get to that logic (loading/dead)
	cvs.style.cursor = "";

	// draw loading bar before anything game-related
	if (loaded < loading) {
		ctx.fillStyle = "black";
		ctx.fillRect(180, 260, 280, 30);
		ctx.fillStyle = "lime";
		ctx.fillRect(180, 260, (280 * loaded) / loading, 30);
		ctx.font = "50px MedievalSharp";
		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		ctx.fillText("Silk Scoundrel", ScrW * 0.5, ScrH * 0.45);
		return;
	}

	// Death screen detour
	if (health <= 0) {
		sprite("dead", ScrW * 0.5, ScrH * 0.44, 3)
		ctx.font = "50px MedievalSharp";
		ctx.fillStyle = "red";
		ctx.textAlign = "center";
		ctx.fillText("You died!", ScrW * 0.5, ScrH * 0.6);
		ctx.font = "24px MedievalSharp";
		ctx.fillText("Click to restart.", ScrW * 0.5, ScrH * 0.67);
		return;
	}

	// Settings menu detour
	if (settingsMenu) {
		sprite("x", ScrW - 24, 24, 1);
		ctx.font = "30px MedievalSharp";
		ctx.fillStyle = "aqua";
		ctx.textAlign = "center";
		ctx.fillText("SFX Volume", ScrW * 0.5, ScrH * 0.28);
		ctx.fillText("Music Volume", ScrW * 0.5, ScrH * 0.53);
		sprite("volume_down", ScrW * 0.18, ScrH * 0.35, 1.5);
		sprite("volume_down", ScrW * 0.18, ScrH * 0.6, 1.5);
		sprite("volume_up", ScrW * 0.82, ScrH * 0.35, 1.5);
		sprite("volume_up", ScrW * 0.82, ScrH * 0.6, 1.5);
		for (let i = 0; i < 8; i++) {
			sprite("box" + (volume > i ? 1 : 0), ScrW * (0.251 + 0.07 * i), ScrH * 0.35, 1);
			sprite("box" + (musicVolume > i ? 1 : 0), ScrW * (0.251 + 0.07 * i), ScrH * 0.6, 1);
		}
		let hovering = topRightHovered()
					|| isMouseNear(ScrW * 0.18, ScrH * 0.35, 24)
					|| isMouseNear(ScrW * 0.18, ScrH * 0.6, 24)
					|| isMouseNear(ScrW * 0.82, ScrH * 0.35, 24)
					|| isMouseNear(ScrW * 0.82, ScrH * 0.6, 24);
		if (hovering) {
			cvs.style.cursor = "none";
			sprite("point", mouseX, mouseY, 1);
		}
		return;
	} else {
		sprite("cog", ScrW - 24, 24, 1);
	}

	// Draw different health bar if hovering an enemy or a potion
	let potentialHealth = 0;
	let displayHealth = health;
	if (hoveredCard > -1) {
		let card = room[hoveredCard];
		if (card.suit == ENEMY) {
			potentialHealth = health;
			displayHealth -= getEnemyDamage(card.value);
		} else if (card.suit == HEAL) {
			potentialHealth = health + card.value;
		}
	}

	// Draw hearts one at a time
	for (let i = 0; i < 20; i += 2) {
		let hx = ((i + 1) * 32);
		let hy = ScrH - 32;
		sprite("heart0", hx, hy);
		if (i < potentialHealth) {
			if (displayHealth < health) {
				sprite((i == potentialHealth - 1) ? "heart5" : "heart6", hx, hy);
			} else {
				sprite((i == potentialHealth - 1) ? "heart3" : "heart4", hx, hy);
			}
		}
		if (i < displayHealth) {
			sprite((i == displayHealth - 1) ? "heart1" : "heart2", hx, hy);
		}
	}

	// Run button
	if (!ranLast) {
		sprite("run", ScrW * 0.1, ScrH * 0.7, (hoveredOther == 1) ? 3 : 2);
	}

	// Draw up to four cards in current room
	let showCursor = true;
	for (let i = 0; i < 4; i++) {
		let card = room[i];
		if (card != -1) {
			let gonnaTrash = card.suit == WEAPON && hoveredTrash == i
			// Give option to discard weapons
			if (card.suit == WEAPON) {
				sprite((hoveredTrash == i) ? "bin_open" : "bin", getCardX(i) - ((hoveredTrash == i) ? ScrW * 0.015 : 0), getCardY(i) + ScrH * 0.2, (hoveredTrash == i) ? 2 : 1.5);
				if (hoveredTrash == i) {
					sprite("arrow_down", getCardX(i), getCardY(i) + ScrH * 0.08)
				}
			}

			// Draw weapon in front of its bin
			sprite(card.sprite, getCardX(i), getCardY(i), (hoveredCard == i || gonnaTrash) ? 3 : 2);

			// Override cursor if hovering item
			if (hoveredCard == i) {
				let suit = SUITS[card.suit];
				ctx.font = "30px MedievalSharp";
				ctx.fillStyle = suit.color;
				ctx.textAlign = "center";
				ctx.fillText(suit.name + " " + card.value, getCardX(i), ScrH * 0.15);
				sprite(suit.getHoverSprite(card.value), mouseX, mouseY, 2);
				showCursor = false;
			} else if (gonnaTrash) {
				ctx.font = "30px MedievalSharp";
				ctx.fillStyle = SUITS[ENEMY].color;
				ctx.textAlign = "center";
				ctx.fillText("Discard", getCardX(i), ScrH * 0.15);
				sprite("point", mouseX, mouseY, 2);
				showCursor = false;
			}
		}
	}

	if (showCursor && hoveredOther != -1) {
		if (hoveredOther == 1) {
			ctx.font = "30px MedievalSharp";
			ctx.fillStyle = "aqua";
			ctx.textAlign = "left";
			ctx.fillText("Retreat", ScrW * 0.16, ScrH * 0.7);
		}
		sprite("point", mouseX, mouseY, (hoveredOther == 1) ? 2 : 1);
		showCursor = false;
	}

	cvs.style.cursor = showCursor ? "" : "none";
	if (isHoldingWeapon()) {
		sprite(getWeaponSprite(heldWeapon), ScrW * 0.4, ScrH * 0.7);
		ctx.font = "20px MedievalSharp";
		ctx.fillStyle = SUITS[WEAPON].color;
		ctx.textAlign = "left";
		ctx.fillText("Blocks " + heldWeapon + " damage", ScrW * 0.45, ScrH * 0.7);
		if (heldWeaponDurability) {
			ctx.fillText("Durability: " + heldWeaponDurability, ScrW * 0.45, ScrH * 0.75);
		}
	}
}

function startGame() {
	heldWeapon = -1;
	heldWeaponDurability = 0;
	health = 20;
	resetDeck();
	fillRoom();
}

function isMouseNear(x, y, dist = 40) {
	return Math.abs(mouseX - x) < dist && Math.abs(mouseY - y) < dist;
}

function init() {
	cvs = document.getElementById("gameCanvas");
	cvs.addEventListener("mousemove", event => {
		const rect = cvs.getBoundingClientRect();
		mouseX = event.clientX - rect.left;
		mouseY = event.clientY - rect.top;

		// Any cards hovered?
		hoveredCard = -1;
		hoveredTrash = -1;
		for (let i = 0; i < 4; i++) {
			if (isMouseNear(getCardX(i), getCardY(i))) {
				hoveredCard = i;
			} else if (isMouseNear(getCardX(i), getCardY(i) + ScrH * 0.2, 24)) {
				hoveredTrash = i;
			}
		}

		// Run button hovered?
		hoveredOther = -1;
		if (topRightHovered()) {
			hoveredOther = 2;
		} else if (!ranLast && isMouseNear(ScrW * 0.1, ScrH * 0.7)) {
			hoveredOther = 1;
		}
	})
	cvs.addEventListener("click", event => {
		if (settingsMenu) {
			if (topRightHovered()) {
				settingsMenu = false;
			} else if (isMouseNear(ScrW * 0.18, ScrH * 0.35, 24)) {
				volume = Math.max(0, volume - 1);
				playSound("punch");
			} else if (isMouseNear(ScrW * 0.18, ScrH * 0.6, 24)) {
				musicVolume = Math.max(0, musicVolume - 1);
				sounds.icebreaker.volume = calcVolume(musicVolume);
			} else if (isMouseNear(ScrW * 0.82, ScrH * 0.35, 24)) {
				volume = Math.min(8, volume + 1);
				playSound("punch");
			} else if (isMouseNear(ScrW * 0.82, ScrH * 0.6, 24)) {
				musicVolume = Math.min(8, musicVolume + 1);
				sounds.icebreaker.volume = calcVolume(musicVolume);
				if (musicVolume == 1) {
					sounds.icebreaker.currentTime = 0;
					sounds.icebreaker.play();
				}
			}
			return;
		}
		if (health <= 0) {
			startGame();
			return;
		}
		if (hoveredCard != -1) {
			clickRoomCard(hoveredCard);
		} else if (hoveredOther != -1) {
			if (hoveredOther == 1) {
				runFromRoom();
			} else if (hoveredOther == 2) {
				settingsMenu = true;
			}
		} else if (hoveredTrash != -1) {
			discardWeapon(hoveredTrash);
		}
	})
	ctx = cvs.getContext("2d");
	ctx.imageSmoothingEnabled = false;
	ctx.textBaseline = "middle";

	// load non-card sprites manually
	loadSprite("mossy");
	loadSprite("heart0");
	loadSprite("heart1");
	loadSprite("heart2");
	loadSprite("heart3");
	loadSprite("heart4");
	loadSprite("heart5");
	loadSprite("heart6");
	loadSprite("hand");
	loadSprite("fist");
	loadSprite("point");
	loadSprite("heal");
	loadSprite("bin");
	loadSprite("bin_open");
	loadSprite("arrow_down");
	loadSprite("run");
	loadSprite("dead");
	loadSprite("cog");
	loadSprite("x");
	loadSprite("box0");
	loadSprite("box1");
	loadSprite("volume_up");
	loadSprite("volume_down");

	// load all sounds
	loadSound("icebreaker");
	loadSound("dead");
	loadSound("punch");
	loadSound("stab");
	loadSound("pickup");
	loadSound("pickup_blade");
	loadSound("pickup_gun");
	loadSound("monster");
	loadSound("dead");
	loadSound("door");
	loadSound("eat");
	loadSound("trash");
	loadSound("shoot");

	// it begins!
	startGame();
	setInterval(draw, 16);
}
