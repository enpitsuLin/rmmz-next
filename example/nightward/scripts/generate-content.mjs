import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createPropEvents } from './prop-layout.mjs'

// Gameplay data stays in MZ; the reference importer owns visual/audio assets.
const root = fileURLToPath(new URL('../', import.meta.url))
const save = (path, value) => writeFileSync(`${root}${path}`, value)
const json = (name, value) => save(`data/${name}.json`, `${JSON.stringify(value)}\n`)
const note = value => `<nightward:${JSON.stringify(value)}>`
const families = [
  { key: 'lash', name: 'Lash', icon: 96, description: 'A sweeping whip. Rank II also lashes behind you.', damage: [14, 17, 20, 24, 30], cooldown: [1.25, 1.2, 1.12, 1.05, .95], reach: [2.6, 2.8, 3, 3.3, 3.7], halfHeight: [.85, .9, 1, 1.1, 1.25], knockback: 4, initialDelay: .3, backDelay: .16 },
  { key: 'wand', name: 'Wand', icon: 97, description: 'Homing magic bolts seek the nearest enemy.', damage: [10, 11, 13, 15, 18], cooldown: [1, .9, .82, .72, .6], count: [1, 2, 2, 3, 4], pierce: [1, 1, 1, 2, 2], speed: 15, turnRate: 9, life: 1.6, range: 15, height: .9, radiusHit: .25, stagger: .08, knockback: 2.5, initialDelay: .4 },
  { key: 'tomes', name: 'Tomes', icon: 98, description: 'Ancient books orbit you, then rest before returning.', damage: [10, 12, 14, 17, 21], count: [2, 2, 3, 3, 4], radius: [2.2, 2.4, 2.7, 2.9, 3.2], duration: [3, 3.5, 4, 4.5, 5], rest: [3.5, 3.3, 3.1, 2.9, 2.6], spin: 3.4, rehit: .45, radiusHit: .5, fadeIn: .25, fadeOut: .3, knockback: 3, initialDelay: .3 },
  { key: 'storm', name: 'Storm', icon: 99, description: 'Lightning strikes nearby enemies with a wide blast.', damage: [18, 22, 28, 34, 42], cooldown: [4.2, 4, 3.7, 3.4, 3], count: [2, 3, 3, 4, 5], radius: [1.3, 1.45, 1.6, 1.8, 2.1], range: [9, 10, 10, 11, 12], stagger: .07, knockback: 2, initialDelay: .8 },
  { key: 'ward', name: 'Ward', icon: 100, description: 'A holy circle damages and repels enemies around you.', damage: [5, 6, 7, 9, 11], cooldown: [.62, .56, .5, .45, .4], radius: [1.6, 1.85, 2.1, 2.4, 2.7], pulseFade: .35, knockback: 3.2, initialDelay: .2 },
  { key: 'flask', name: 'Flask', icon: 101, description: 'Thrown flasks leave pools of burning oil.', damage: [6, 8, 10, 12, 15], cooldown: [3.6, 3.3, 3, 2.8, 2.5], count: [1, 2, 2, 3, 4], radius: [1.25, 1.35, 1.5, 1.65, 1.85], duration: [2.6, 3, 3.2, 3.6, 4], tick: .35, flight: .55, gravity: 20, throwHeight: 1.3, range: 8, stagger: .09, knockback: 0, initialDelay: .6 },
]
const skillBase = { animationId: 0, damage: { critical: false, elementId: 1, formula: '0', type: 1, variance: 0 }, effects: [], hitType: 0, message1: '', message2: '', mpCost: 0, occasion: 1, repeats: 1, requiredWtypeId1: 0, requiredWtypeId2: 0, scope: 1, speed: 0, stypeId: 1, successRate: 100, tpCost: 0, tpGain: 0, messageType: 1 }
const skills = [null]
const weapons = [null], armors = [null]
const equipBase = { price: 0, params: Array(8).fill(0), traits: [] }
for (const family of families) {
  const { name, icon, description, ...parameters } = family
  const skillId = skills.length
  skills.push({ ...skillBase, id: skillId, name: `${name} Attack`, iconIndex: icon, description: '', note: note({ key: family.key, category: 'weaponAttack' }) })
  for (let rank = 1; rank <= 5; rank++) {
    const values = Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, Array.isArray(value) ? value[rank - 1] : value]))
    weapons.push({ ...equipBase, id: weapons.length, etypeId: 1, wtypeId: 1, animationId: 0, name: `${name} ${rank}`, iconIndex: icon, description, traits: [{ code: 43, dataId: skillId, value: 1 }], note: note({ ...values, rank }) })
  }
}
const contactSkillId = skills.length
for (const [key, damage] of [['contact', 1], ['reaperWave', 25]]) skills.push({ ...skillBase, id: skills.length, name: key, iconIndex: 0, description: '', damage: { ...skillBase.damage, formula: String(damage) }, note: note({ key, category: 'enemyAttack' }) })
json('Skills', skills)
const states = [null, { id: 1, autoRemovalTiming: 0, chanceByDamage: 100, iconIndex: 1, maxTurns: 1, minTurns: 1, motion: 3, name: 'Death', note: '', overlay: 0, priority: 100, releaseByDamage: false, removeAtBattleEnd: false, removeByDamage: false, removeByRestriction: false, removeByWalking: false, restriction: 4, stepsToRemove: 100, traits: [], message1: '', message2: '', message3: '', message4: '', messageType: 1 }]
json('States', states)
for (const [i, [key, name, description, value]] of [
  ['might', 'Might', 'Damage +10% per rank.', .1],
  ['haste', 'Haste', 'Movement speed +10% per rank.', .1],
  ['lodestone', 'Lodestone', 'Pickup range +35% per rank.', .35],
  ['cinder', 'Cinder', 'Weapon cooldown -8% per rank.', .08],
].entries()) for (let rank = 1; rank <= 5; rank++) armors.push({ ...equipBase, id: armors.length, etypeId: 5, atypeId: 1, name: `${name} ${rank}`, iconIndex: 102 + i, description, note: note({ key, rank, value: value * rank }) })
json('Weapons', weapons)
json('Armors', armors)
json('Actors', [null, { id: 1, name: 'The Warden', nickname: '', profile: '', classId: 1, initialLevel: 1, maxLevel: 99, characterName: '$NightwardHero', characterIndex: 0, faceName: '', faceIndex: 0, battlerName: 'NightwardHero', equips: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], traits: [], note: note({ key: 'warden', radius: .34, speed: 4.5, invulnerable: .85, magnet: 1.8 }) }])
json('Classes', [null, { id: 1, name: 'Night Warden', expParams: [5, 10, 0, 0], params: [100, 0, 1, 0, 1, 0, 1, 1].map(value => Array(100).fill(value)), learnings: [], traits: [{ code: 22, dataId: 0, value: 1 }, { code: 22, dataId: 7, value: .01 }, { code: 51, dataId: 1, value: 1 }, { code: 52, dataId: 1, value: 1 }], note: note({ key: 'nightward', experience: '5*(level-1)^2' }) }])
const enemyValues = [
  ['bat', 'Bat', 5, 3.8, .28, .6, .8, .16, 1.5, 1.3, .5, 12, 'air', 0],
  ['skeleton', 'Skeleton', 13, 2.2, .34, 1.4, 0, 0, 2.5, 1, 1, 7, 'ground', .04],
  ['ghoul', 'Ghoul', 42, 1.6, .42, 1.4, 0, 0, 4.5, .45, 2.5, 5, 'ground', .35],
  ['wraith', 'Wraith', 22, 2.6, .34, 1.3, .3, .12, 4, .8, 1, 6, 'ghost', .25],
  ['skull', 'Flying Skull', 18, 3, .26, .6, .9, .12, 4, 1, .6, 10, 'air', .6],
  ['reaper', 'The Reaper', 2000, 2.2, 1.3, 5, 0, 0, 15, 0, 50, 5, 'ground', 0],
]
json('Enemies', [null, ...enemyValues.map(([key, name, hp, speed, radius, height, hover, bob, damage, knockback, mass, animRate, layer, midChance], index) => ({ id: index + 1, name, battlerName: `Nightward_${key}`, battlerHue: 0, exp: 0, gold: 0, actions: [{ conditionParam1: 0, conditionParam2: 0, conditionType: 0, rating: 5, skillId: contactSkillId }], params: [hp, 0, 1, 0, 1, 0, 1, 1], traits: [], dropItems: [{ kind: 1, dataId: 1, denominator: 1 }, { kind: 1, dataId: 2, denominator: 25 }, { kind: 0, dataId: 0, denominator: 1 }], note: note({ key, speed, radius, height, hover, bob, damage, knockback, mass, animRate, layer, midChance }) }))])
const formations = [
  { key: 'swarm', first: 14, every: 22, baseCount: 12, growth: 2, maxCount: 30, timeline: [0, 30, 55, 90, 115, 150, 180, 300], weights: [[6, 4, 0, 0, 0], [5, 5, 0, 0, 0], [4, 5, .6, .6, 0], [3, 4, 2, 2, 0], [2.5, 3.5, 2, 2, .6], [2, 3, 2.5, 2, 2], [2, 3, 3, 2, 3], [2, 3, 3, 2, 4]] },
  { key: 'ring', first: 60, every: 60, baseCount: 40, growth: 16, maxCount: 96, afterReaper: .6 },
  { key: 'elite', first: 35, every: 35, transitions: [70, 110, 150] },
  { key: 'reaper', first: 180, rise: 1.8, firstSwing: 1.5, swingEvery: 4.6, windup: .45, recover: .55, range: 16, waveSpeed: 10, waveLife: 2.6, waveRadius: 1.3, damage: 25 },
]
// Troop event comments remain editable in the standard RPG Maker database.
json('Troops', [null, ...formations.map((data, i) => ({ id: i + 1, name: ['Bat Swarms', 'Encirclement', 'Elites', 'The Reaper'][i], members: [{ enemyId: i === 3 ? 6 : i === 2 ? 2 : 1, x: 400, y: 300, hidden: false }], pages: [{ conditions: { turnEnding: false, turnValid: false, enemyValid: false, actorValid: false, switchValid: false, turnA: 0, turnB: 0, enemyIndex: 0, enemyHp: 50, actorId: 1, actorHp: 50, switchId: 1 }, span: 0, list: [{ code: 108, indent: 0, parameters: [note(data)] }, { code: 0, indent: 0, parameters: [] }] }] }))])
const itemValues = [
  ['gemSmall', 'Sapphire', 'Gain 1 experience.', 1], ['gemMedium', 'Emerald', 'Gain 5 experience.', 5], ['gemBig', 'Ruby', 'Gain 25 experience.', 25], ['coin', 'Gold', 'Gain 10 gold.', 0], ['chicken', 'Roast Chicken', 'Restore 30 health.', 0], ['vacuum', 'Vacuum', 'Collect every experience gem.', 0], ['relic', 'Relic', 'Purge everything in a wide radius.', 0], ['chest', 'Treasure', 'Upgrade your current equipment.', 0],
]
json('Items', [null, ...itemValues.map(([key, name, description, xp], i) => ({ id: i + 1, name, description, iconIndex: 106 + i, consumable: true, itypeId: 1, occasion: 0, price: 0, scope: key === 'chicken' ? 7 : 0, speed: 0, successRate: 100, repeats: 1, tpGain: 0, hitType: 0, animationId: 0, damage: { critical: false, elementId: 0, formula: '0', type: 0, variance: 0 }, effects: key === 'chicken' ? [{ code: 11, dataId: 0, value1: 0, value2: 30 }] : [], note: note({ key, xp }) }))])
json('CommonEvents', [null, ...['Night Begins', 'The Reaper Arrives', 'Dawn', 'Fallen'].map((name, i) => ({ id: i + 1, name, trigger: 0, switchId: 1, list: [{ code: 241, indent: 0, parameters: [{ name: ['Nightward', 'Reaper', 'Dawn', 'Nightward'][i], volume: 65, pitch: 100, pan: 0 }] }, { code: 0, indent: 0, parameters: [] }] }))])
json('Animations', [null])
const reference = JSON.parse(readFileSync(`${root}img/nightward/reference/manifest.json`, 'utf8'))
const events = createPropEvents(reference, 90)
const tiles = new Array(181 * 181 * 6).fill(0)
for (let y = 0; y < 181; y++) for (let x = 0; x < 181; x++) tiles[y * 181 + x] = Math.abs(x - 90) <= 1 && y > 97 && y < 135 ? 1537 : 1536
if (!existsSync(`${root}data/Map001.json`)) json('Map001', { autoplayBgm: true, autoplayBgs: false, battleback1Name: '', battleback2Name: '', bgm: { name: 'Nightward', volume: 65, pitch: 100, pan: 0 }, bgs: { name: '', volume: 90, pitch: 100, pan: 0 }, disableDashing: true, displayName: 'The Graveyard', encounterList: [], encounterStep: 30, height: 181, width: 181, note: note({ center: 90, bounds: 90, path: { start: 9, end: 44, width: 3.2 }, propLayout: 'events' }), parallaxLoopX: false, parallaxLoopY: false, parallaxName: '', parallaxShow: false, parallaxSx: 0, parallaxSy: 0, scrollType: 0, specifyBattleback: false, tilesetId: 1, data: tiles, events })
if (!existsSync(`${root}data/MapInfos.json`)) json('MapInfos', [null, { id: 1, expanded: true, name: 'Graveyard', order: 1, parentId: 0, scrollX: 816, scrollY: 624 }])
json('Tilesets', [null, { id: 1, name: 'Nightward', mode: 1, note: '', tilesetNames: ['', '', '', '', 'NightwardGround', '', '', '', ''], flags: Array(8192).fill(0) }])
const system = JSON.parse(readFileSync(`${root}data/System.json`, 'utf8'))
system.equipTypes = ['', 'Weapon', 'Shield', 'Head', 'Body', 'Accessory']
system.weaponTypes = ['', 'Nightward']
system.armorTypes = ['', 'Nightward']
Object.assign(system, { gameTitle: 'Nightward', partyMembers: [1], startMapId: 1, startX: 90, startY: 96, title1Name: '', title2Name: '', optDrawTitle: false, titleBgm: { name: 'Nightward', volume: 65, pitch: 100, pan: 0 }, battleBgm: { name: 'Nightward', volume: 65, pitch: 100, pan: 0 }, victoryMe: { name: 'Victory', volume: 70, pitch: 100, pan: 0 }, defeatMe: { name: 'Defeat', volume: 70, pitch: 100, pan: 0 }, gameoverMe: { name: 'Defeat', volume: 70, pitch: 100, pan: 0 } })
system.sounds = system.sounds.map((sound, i) => ({ name: i === 0 ? 'Cursor' : i === 1 ? 'Confirm' : i === 2 ? 'Cancel' : 'Hit', volume: 60, pitch: 100, pan: 0 }))
system.advanced.screenWidth = 1100; system.advanced.screenHeight = 760; system.advanced.uiAreaWidth = 1100; system.advanced.uiAreaHeight = 760
json('System', system)

console.log('Generated RMMZ content; existing map layout, event pages and comments were preserved.')
