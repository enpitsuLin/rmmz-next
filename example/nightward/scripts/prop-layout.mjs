import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

function page() {
  return { conditions: { actorId: 1, actorValid: false, itemId: 1, itemValid: false, selfSwitchCh: 'A', selfSwitchValid: false, switch1Id: 1, switch1Valid: false, switch2Id: 1, switch2Valid: false, variableId: 1, variableValid: false, variableValue: 0 }, directionFix: true, image: { tileId: 0, characterName: '', characterIndex: 0, direction: 2, pattern: 1 }, list: [{ code: 0, indent: 0, parameters: [] }], moveFrequency: 3, moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false }, moveSpeed: 3, moveType: 0, priorityType: 1, stepAnime: false, through: false, trigger: 0, walkAnime: false }
}
function bind(event, model, offset, collider = 'model') {
  const comments = [`<propModel:${model}>`, `<propOffset:${offset.join(',')}>`, `<propCollider:${collider}>`]
  event.pages[0].list.unshift(...comments.map((text, index) => ({ code: index ? 408 : 108, indent: 0, parameters: [text] })))
}
function makeEvent(id, placement, center) {
  const x = Math.round(placement.x + center), y = Math.round(placement.z + center)
  const event = { id, name: `${placement.model} ${id}`, note: `<nightwardPropSeed:${placement.key}>`, x, y, pages: [page()] }
  bind(event, placement.model, [placement.x - (x - center), 0, placement.z - (y - center)])
  return event
}
export function createPropEvents(reference, center) {
  return [null, ...reference.propLayout.map((placement, index) => makeEvent(index + 1, placement, center))]
}
export function createEditorPropLayout(models, placements) {
  const cells = new Map(), groups = {}, layout = []
  for (const placement of placements) {
    if (models[placement.model].kind !== 'tomb' || Math.max(Math.abs(placement.x) / 42, Math.abs(placement.z) / 44) <= 1) {
      layout.push(placement)
      continue
    }
    const key = `${Math.floor(placement.x / 12)},${Math.floor(placement.z / 12)}`
    const cell = cells.get(key) ?? []
    cell.push(placement); cells.set(key, cell)
  }
  let index = 0
  for (const entries of cells.values()) {
    if (entries.length === 1) { layout.push(entries[0]); continue }
    const origin = entries[0], key = `tomb-cluster-${String(++index).padStart(4, '0')}`
    const model = { kind: 'tomb', meshes: [], colliders: [], lights: [] }
    for (const placement of entries) {
      const child = models[placement.model], x = placement.x - origin.x, z = placement.z - origin.z
      for (const mesh of child.meshes) model.meshes.push({ ...mesh, offset: { x, y: 0, z } })
      for (const box of child.colliders) model.colliders.push({ ...box, x: box.x + x, z: box.z + z })
      for (const light of child.lights) model.lights.push({ ...light, x: light.x + x, z: light.z + z })
    }
    models[key] = model
    const placement = { key: `tomb-cluster:${index}`, model: key, x: origin.x, z: origin.z }
    groups[placement.key] = entries
    layout.push(placement)
  }
  return { layout, groups }
}
export function groupGeneratedTombs(map, reference) {
  const center = JSON.parse(map.note.match(/<nightward:([^>]+)>/)[1]).center
  const seed = event => event?.note.match(/<nightwardPropSeed:([^>]+)>/)?.[1]
  let changed = false
  for (const placement of reference.propLayout) {
    const members = reference.propGroups[placement.key]
    if (!members || map.events.some(event => seed(event) === placement.key)) continue
    const events = members.map(member => map.events.find(event => seed(event) === member.key))
    if (events.some((event, index) => !event || JSON.stringify(event) !== JSON.stringify(makeEvent(event.id, members[index], center)))) continue
    const owner = events[0]
    map.events[owner.id] = makeEvent(owner.id, placement, center)
    for (const event of events.slice(1)) map.events[event.id] = null
    changed = true
  }
  if (changed) {
    const source = new Map([...reference.propLayout, ...Object.values(reference.propGroups).flat()].map(placement => [placement.key, placement]))
    const free = []
    for (let id = 1; id <= 999; id++) if (!map.events[id]) free.push(id)
    for (let id = 1000; id < map.events.length; id++) {
      const event = map.events[id], placement = source.get(seed(event))
      if (!event || !placement || JSON.stringify(event) !== JSON.stringify(makeEvent(id, placement, center))) continue
      const available = free.shift()
      if (available === undefined) throw new Error('Generated Prop layout exceeds the MZ editor event capacity')
      map.events[available] = makeEvent(available, placement, center)
      map.events[id] = null
    }
    while (!map.events[map.events.length - 1]) map.events.pop()
  }
  return changed
}
export function migratePropLayout(map, reference) {
  const tag = map.note.match(/<nightward:([^>]+)>/)
  const settings = JSON.parse(tag[1])
  if (settings.propLayout === 'events') return false
  const center = settings.center, used = new Set(), consumed = new Set()
  const legacy = map.events.flatMap(event => {
    if (!event) return []
    const match = event.note.match(/<nightward:([^>]+)>/)
    if (!match) return []
    const data = JSON.parse(match[1])
    return ['collision', 'brazier'].includes(data.kind) ? [{ event, data }] : []
  })
  const near = (a, b) => Math.abs(a - b) < 1e-5
  for (const placement of reference.propLayout) {
    const model = reference.propModels[placement.model]
    const colliders = legacy.filter(entry => entry.data.kind === 'collision' && model.colliders.some(box => near(entry.data.x, placement.x + box.x) && near(entry.data.z, placement.z + box.z) && near(entry.data.width, box.width) && near(entry.data.depth, box.depth)))
    for (const entry of colliders) consumed.add(entry.event.id)
    const owner = model.kind === 'brazier'
      ? legacy.find(entry => !used.has(entry.event.id) && entry.data.kind === 'brazier' && near(entry.data.x, placement.x) && near(entry.data.z, placement.z))
      : colliders.find(entry => !used.has(entry.event.id))
    if (owner) {
      const { event, data } = owner
      const offset = [placement.x - (Math.round(data.x + center) - center), 0, placement.z - (Math.round(data.z + center) - center)]
      bind(event, placement.model, offset)
      event.note += `\n<nightwardPropSeed:${placement.key}>`
      used.add(event.id)
    }
    else map.events.push(makeEvent(map.events.length, placement, center))
  }
  for (const { event, data } of legacy) {
    if (data.kind !== 'collision' || used.has(event.id)) continue
    const untouched = event.name === `collision ${event.id}` && event.x === Math.round(data.x + center) && event.y === Math.round(data.z + center) && event.pages.length === 1 && JSON.stringify(event.pages[0]) === JSON.stringify(page())
    if (consumed.has(event.id) && untouched) map.events[event.id] = null
    else bind(event, 'collider', [data.x - (Math.round(data.x + center) - center), 0, data.z - (Math.round(data.z + center) - center)], `0,0,${data.width},${data.depth}`)
  }
  settings.propLayout = 'events'
  map.note = map.note.replace(tag[0], `<nightward:${JSON.stringify(settings)}>`)
  return true
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const map = JSON.parse(readFileSync(`${root}data/Map001.json`, 'utf8'))
  const reference = JSON.parse(readFileSync(`${root}img/nightward/reference/manifest.json`, 'utf8'))
  const migrated = migratePropLayout(map, reference)
  const grouped = groupGeneratedTombs(map, reference)
  if (migrated || grouped) {
    writeFileSync(`${root}data/Map001.json`, `${JSON.stringify(map)}\n`)
    console.log(`Wrote the event-owned layout (${map.events.filter(Boolean).length} events, highest ID ${map.events.length - 1}); edited positions and pages were preserved.`)
  }
  else console.log('The map already uses event-owned Props; its layout was preserved.')
}
