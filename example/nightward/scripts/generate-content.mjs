import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { groundTileId, refreshDirtEdges } from './ground-tileset.mjs'

// Gameplay data stays in MZ; the reference importer owns visual/audio assets.
const root = fileURLToPath(new URL('../', import.meta.url))
const save = (path, value) => writeFileSync(`${root}${path}`, value)
const json = (name, value) => save(`data/${name}.json`, `${JSON.stringify(value, null, 2)}\n`)
const note = value => `<nightward:${JSON.stringify(value)}>`
const readData = name => JSON.parse(readFileSync(`${root}data/${name}.json`, 'utf8'))
// Keep equipment presentation authored in the native database fields.
const equipmentDisplay = ({ name, description, iconIndex }) => ({ name, description, iconIndex })
const weaponData = readData('Weapons')
const armorData = readData('Armors')
const families = [
  { key: 'lash', name: 'Lash', icon: 96, cooldown: [1.25, 1.2, 1.12, 1.05, .95], reach: [2.6, 2.8, 3, 3.3, 3.7], halfHeight: [.85, .9, 1, 1.1, 1.25], knockback: 4, initialDelay: .3, backDelay: .16 },
  { key: 'wand', name: 'Wand', icon: 97, cooldown: [1, .9, .82, .72, .6], count: [1, 2, 2, 3, 4], pierce: [1, 1, 1, 2, 2], speed: 15, turnRate: 9, life: 1.6, range: 15, height: .9, radiusHit: .25, stagger: .08, knockback: 2.5, initialDelay: .4 },
  { key: 'tomes', name: 'Tomes', icon: 98, count: [2, 2, 3, 3, 4], radius: [2.2, 2.4, 2.7, 2.9, 3.2], duration: [3, 3.5, 4, 4.5, 5], rest: [3.5, 3.3, 3.1, 2.9, 2.6], spin: 3.4, rehit: .45, radiusHit: .5, fadeIn: .25, fadeOut: .3, knockback: 3, initialDelay: .3 },
  { key: 'storm', name: 'Storm', icon: 99, cooldown: [4.2, 4, 3.7, 3.4, 3], count: [2, 3, 3, 4, 5], radius: [1.3, 1.45, 1.6, 1.8, 2.1], range: [9, 10, 10, 11, 12], stagger: .07, knockback: 2, initialDelay: .8 },
  { key: 'ward', name: 'Ward', icon: 100, cooldown: [.62, .56, .5, .45, .4], radius: [1.6, 1.85, 2.1, 2.4, 2.7], pulseFade: .35, knockback: 3.2, initialDelay: .2 },
  { key: 'flask', name: 'Flask', icon: 101, cooldown: [3.6, 3.3, 3, 2.8, 2.5], count: [1, 2, 2, 3, 4], radius: [1.25, 1.35, 1.5, 1.65, 1.85], duration: [2.6, 3, 3.2, 3.6, 4], tick: .35, flight: .55, gravity: 20, throwHeight: 1.3, range: 8, stagger: .09, knockback: 0, initialDelay: .6 },
]
const skillBase = { animationId: 0, damage: { critical: false, elementId: 1, formula: '0', type: 1, variance: 0 }, effects: [], hitType: 0, message1: '', message2: '', mpCost: 0, occasion: 1, repeats: 1, requiredWtypeId1: 0, requiredWtypeId2: 0, scope: 1, speed: 0, stypeId: 1, successRate: 100, tpCost: 0, tpGain: 0, messageType: 1 }
const skills = [null]
const weapons = [null], armors = [null]
const equipBase = { price: 0, params: Array(8).fill(0), traits: [] }
for (const family of families) {
  const { name, icon, ...parameters } = family
  const skillId = skills.length
  skills.push({ ...skillBase, id: skillId, name: `${name} Attack`, iconIndex: icon, description: '', note: note({ key: family.key, category: 'weaponAttack' }) })
  for (let rank = 1; rank <= 5; rank++) {
    const values = Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, Array.isArray(value) ? value[rank - 1] : value]))
    const weapon = weaponData[weapons.length]
    weapons.push({ ...equipBase, ...equipmentDisplay(weapon), params: weapon.params, id: weapons.length, etypeId: 1, wtypeId: 1, animationId: 0, traits: [{ code: 43, dataId: skillId, value: 1 }], note: note({ ...values, rank }) })
  }
}
const contactSkillId = skills.length
skills.push({ ...skillBase, id: contactSkillId, name: 'contact', iconIndex: 0, description: '', damage: { ...skillBase.damage, formula: '1' }, note: note({ key: 'contact', category: 'enemyAttack' }) })
// Keep the Reaper's wave skill authored in the database.
skills.push(readData('Skills')[skills.length])
json('Skills', skills)
const states = [null, { id: 1, autoRemovalTiming: 0, chanceByDamage: 100, iconIndex: 1, maxTurns: 1, minTurns: 1, motion: 3, name: 'Death', note: '', overlay: 0, priority: 100, releaseByDamage: false, removeAtBattleEnd: false, removeByDamage: false, removeByRestriction: false, removeByWalking: false, restriction: 4, stepsToRemove: 100, traits: [], message1: '', message2: '', message3: '', message4: '', messageType: 1 }]
json('States', states)
for (const [i, [key, value]] of [
  ['might', .1],
  ['haste', .1],
  ['lodestone', .35],
  ['cinder', .08],
].entries()) for (let rank = 1; rank <= 5; rank++) {
  armors.push({ ...equipBase, ...equipmentDisplay(armorData[armors.length]), id: armors.length, etypeId: i + 2, atypeId: 1, note: note({ key, rank, value: value * rank }) })
}
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
  { key: 'reaper', first: 180, rise: 1.8, firstSwing: 1.5, swingEvery: 4.6, windup: .45, recover: .55, range: 16, waveSpeed: 10, waveLife: 2.6, waveRadius: 1.3 },
]
// Troop event comments remain editable in the standard RPG Maker database.
json('Troops', [null, ...formations.map((data, i) => ({ id: i + 1, name: ['Bat Swarms', 'Encirclement', 'Elites', 'The Reaper'][i], members: [{ enemyId: i === 3 ? 6 : i === 2 ? 2 : 1, x: 400, y: 300, hidden: false }], pages: [{ conditions: { turnEnding: false, turnValid: false, enemyValid: false, actorValid: false, switchValid: false, turnA: 0, turnB: 0, enemyIndex: 0, enemyHp: 50, actorId: 1, actorHp: 50, switchId: 1 }, span: 0, list: [{ code: 108, indent: 0, parameters: [note(data)] }, { code: 0, indent: 0, parameters: [] }] }] }))])
const itemValues = [
  ['gemSmall', 'Sapphire', 'Gain 1 experience.', 1], ['gemMedium', 'Emerald', 'Gain 5 experience.', 5], ['gemBig', 'Ruby', 'Gain 25 experience.', 25], ['coin', 'Gold', 'Gain 10 gold.', 0], ['chicken', 'Roast Chicken', 'Restore 30 health.', 0], ['vacuum', 'Vacuum', 'Collect every experience gem.', 0], ['relic', 'Relic', 'Purge everything in a wide radius.', 0], ['chest', 'Treasure', 'Upgrade your current equipment.', 0],
]
json('Items', [null, ...itemValues.map(([key, name, description, xp], i) => ({ id: i + 1, name, description, iconIndex: 106 + i, consumable: true, itypeId: 1, occasion: 0, price: 0, scope: key === 'chicken' ? 7 : 0, speed: 0, successRate: 100, repeats: 1, tpGain: 0, hitType: 0, animationId: 0, damage: { critical: false, elementId: 0, formula: '0', type: 0, variance: 0 }, effects: key === 'chicken' ? [{ code: 11, dataId: 0, value1: 0, value2: 30 }] : [], note: note({ key, xp }) }))])
if (!existsSync(`${root}data/CommonEvents.json`)) {
  const command = (code, ...parameters) => ({ code, indent: 0, parameters })
  const event = (id, name, list) => ({ id, name, trigger: 0, switchId: 1, list: [...list, command(0)] })
  const phase = at => command(108, `<nightwardPhase:${at}>`)
  const bgm = name => command(241, { name, volume: 65, pitch: 100, pan: 0 })
  const se = (name, volume) => command(250, { name, volume, pitch: 100, pan: 0 })
  const plugin = (name, label, args) => [
    command(357, 'Nightward', name, label, args),
    ...Object.entries(args).map(([key, value]) => command(657, `${key} = ${value}`)),
  ]
  const banner = (title, subtitle, style, hold, slam = 'false') => plugin('PhaseBanner', 'Show Stage Banner', { title, subtitle, style, hold, slam })
  const notice = message => plugin('PhaseNotice', 'Show Stage Notice', { message })
  const warning = enabled => plugin('TimerWarning', 'Set Timer Warning', { enabled })
  const countdown = Array.from({ length: 10 }, (_, second) => [
    command(117, 10),
    ...(second < 3 ? [se('Warn', 50)] : []),
    command(230, 60),
  ]).flat()
  json('CommonEvents', [
    null,
    event(1, 'Night Begins', [bgm('Nightward')]),
    event(2, 'Reaper Arrives', [phase('boss'), bgm('Reaper'), se('Reaper', 75), ...banner('GRAVE REAPER', 'Slay him to win the night', '2', '2.2', 'true'), se('Swoosh', 40)]),
    event(3, 'Dawn', [bgm('Dawn')]),
    event(4, 'Fallen', [bgm('Nightward')]),
    // The original delayed banner first appeared on simulation frame 31.
    event(5, 'Opening Banner', [phase('start'), command(230, 31), ...banner('SURVIVE THE NIGHT', 'The Grave Reaper rises at 3:00', '1', '2'), se('Swoosh', 40)]),
    event(6, 'First Minute', [phase(60), ...notice('The horde grows'), se('Swoosh', 35)]),
    event(7, 'Second Minute', [phase(120), ...notice('One minute till the Reaper'), se('Swoosh', 35)]),
    event(8, 'Open the Crypt', [
      phase('170,demo'),
      ...plugin('PropVisible', 'Show / Hide Props', { target: '#crypt', visible: 'true' }),
      ...plugin('PropDoor', 'Open / Close Prop Doors', { target: '#crypt', amount: '1', duration: '10' }),
    ]),
    event(9, 'Crypt Warning', [phase(170), ...banner('THE CRYPT STIRS', 'Ready yourself', '2', '2.6'), se('Swoosh', 40), ...countdown, ...warning('false')]),
    event(10, 'Countdown Tick', [...warning('true'), se('Tick', 20)]),
    event(11, 'Reaper Defeated', [phase('bossDeath'), se('Relic', 75)]),
  ])
}
json('Animations', [null])
const tiles = new Array(181 * 181 * 6).fill(0)
for (let y = 0; y < 181; y++) for (let x = 0; x < 181; x++) {
  tiles[y * 181 + x] = groundTileId('grass', x - 90, y - 90)
  if (Math.abs(x - 90) <= 1 && y > 97 && y < 135) tiles[181 * 181 + y * 181 + x] = groundTileId('dirt', x - 90, y - 90)
}
refreshDirtEdges({ width: 181, height: 181, data: tiles }, 90)
if (!existsSync(`${root}data/Map001.json`)) json('Map001', { autoplayBgm: true, autoplayBgs: false, battleback1Name: '', battleback2Name: '', bgm: { name: 'Nightward', volume: 65, pitch: 100, pan: 0 }, bgs: { name: '', volume: 90, pitch: 100, pan: 0 }, disableDashing: true, displayName: 'The Graveyard', encounterList: [], encounterStep: 30, height: 181, width: 181, note: note({ center: 90, bounds: 90, path: { start: 9, end: 44, width: 3.2 } }) + '\n<propScene:models/maps/graveyard.glb>', parallaxLoopX: false, parallaxLoopY: false, parallaxName: '', parallaxShow: false, parallaxSx: 0, parallaxSy: 0, scrollType: 0, specifyBattleback: false, tilesetId: 1, data: tiles, events: [null] })
if (!existsSync(`${root}data/MapInfos.json`)) json('MapInfos', [null, { id: 1, expanded: true, name: 'Graveyard', order: 1, parentId: 0, scrollX: 816, scrollY: 624 }])
json('Tilesets', [null, { id: 1, name: 'Nightward', mode: 1, note: '<normalTilesets:{"4":"NightwardGround-normal","5":"NightwardDirtEdgesB-normal","6":"NightwardDirtEdgesC-normal","7":"NightwardDirtEdgesD-normal"}>', tilesetNames: ['', '', '', '', 'NightwardGround', 'NightwardDirtEdgesB', 'NightwardDirtEdgesC', 'NightwardDirtEdgesD', ''], flags: Array(8192).fill(0) }])
const system = readData('System')
system.equipTypes = ['', 'Weapon', 'Might', 'Haste', 'Lodestone', 'Cinder']
system.weaponTypes = ['', 'Nightward']
system.armorTypes = ['', 'Nightward']
Object.assign(system, { gameTitle: 'Nightward', partyMembers: [1], title1Name: '', title2Name: '', optDrawTitle: false })
system.advanced.screenWidth = 1100; system.advanced.screenHeight = 760; system.advanced.uiAreaWidth = 1100; system.advanced.uiAreaHeight = 760
json('System', system)

console.log('Generated RMMZ content and preserved editor-authored map, audio, common events, equipment fields, and Reaper wave skill.')
