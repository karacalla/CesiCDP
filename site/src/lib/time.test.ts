import { describe, expect, it } from 'vitest'
import { formatDuration, formatHm, parseHm } from './time'

describe('heures', () => {
  it('formate les minutes en HH:MM', () => {
    expect(formatHm(0)).toBe('00:00')
    expect(formatHm(495)).toBe('08:15')
    expect(formatHm(1440)).toBe('24:00')
  })
  it('lit plusieurs écritures et refuse l’illisible', () => {
    expect(parseHm('8:15')).toBe(495)
    expect(parseHm('08h15')).toBe(495)
    expect(parseHm('24:00')).toBe(1440)
    expect(parseHm('24:01')).toBeNull()
    expect(parseHm('7:75')).toBeNull()
    expect(parseHm('midi')).toBeNull()
  })
  it('formate les durées', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(65)).toBe('1 h 05')
  })
})
