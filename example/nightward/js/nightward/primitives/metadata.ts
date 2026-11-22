import type { MZ } from 'rmmz-next/database-types'

const tagPattern = /<([^<>:]+)(?::([^>]*))?>/g

export function readMetaString(entry: { meta?: MZ.Meta } | null | undefined, tag: string): string | undefined {
  const meta = entry?.meta
  if (!meta)
    return undefined
  let raw = meta[tag]
  if (raw === undefined) {
    const lower = tag.toLowerCase()
    const found = Object.keys(meta).find(key => key.toLowerCase() === lower)
    if (found)
      raw = meta[found]
  }
  return typeof raw === 'string' ? raw.trim() : undefined
}

export function readMetaJson<T>(entry: { meta?: MZ.Meta } | null | undefined, tag = 'nightward'): T | undefined {
  const raw = readMetaString(entry, tag)
  return raw !== undefined ? JSON.parse(raw) as T : undefined
}

export function requireMetaJson<T>(entry: { meta?: MZ.Meta } | null | undefined, tag = 'nightward'): T {
  const value = readMetaJson<T>(entry, tag)
  if (value === undefined)
    throw new Error(`Missing Nightward metadata tag <${tag}:...>`)
  return value
}

export function eventComments(list: readonly MZ.EventCommon.PageCommand[] | undefined): string[] {
  if (!list)
    return []
  return list
    .filter(command => command.code === 108 || command.code === 408)
    .map(command => String(command.parameters[0]))
}

export function commentMeta(list: readonly MZ.EventCommon.PageCommand[] | undefined): { meta: MZ.Meta } {
  const meta: MZ.Meta = {}
  const text = eventComments(list).join('\n')
  tagPattern.lastIndex = 0
  for (;;) {
    const match = tagPattern.exec(text)
    if (!match)
      break
    meta[match[1]!] = match[2] !== undefined ? match[2] : true
  }
  return { meta }
}
