import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseFile } from './index'

describe('import CSV', () => {
  it('lit les colonnes françaises, les heures HH:MM et le séparateur ;', () => {
    const r = parseFile('c.csv', 'id;nom;lat;lng;demande;debut;fin;service\n1;"Client A; quai 2";48.69;6.18;4;08:30;10h00;10\n2;Client B;48.70;6.20;2;;;5\n')
    expect(r.issues).toEqual([])
    expect(r.customers).toHaveLength(2)
    expect(r.customers[0]).toMatchObject({ name: 'Client A; quai 2', tw: { a: 510, b: 600 }, service: 10 })
    expect(r.customers[1]?.tw).toBeNull()
  })

  it('liste les erreurs ligne par ligne et écarte les lignes fautives', () => {
    const r = parseFile('c.csv', 'id,nom,lat,lng,demande,debut,fin\n1,A,48.6,6.1,3,10:00,09:00\n2,B,abc,6.1,3,,\n3,C,48.6,6.1,-1,,\n3,D,48.6,6.1,1,,\n4,E,48.6,6.1,1,,\n')
    expect(r.customers.map((c) => c.id)).toEqual([3, 4])
    const lines = r.issues.map((i) => i.line)
    expect(lines).toEqual(expect.arrayContaining([2, 3, 4]))
    expect(r.issues.find((i) => i.line === 2)?.message).toMatch(/a > b/)
    expect(r.issues.find((i) => i.line === 4)?.message).toMatch(/négative/)
  })

  it('signale une colonne obligatoire absente', () => {
    const r = parseFile('c.csv', 'nom,lat\nA,48\n')
    expect(r.issues[0]?.message).toMatch(/colonne/)
  })
})

describe('import VRPLIB', () => {
  it('lit X-n101-k25 comme le solveur (dépôt = nœud 0, 100 clients, Q = 206)', () => {
    const text = readFileSync(join(__dirname, '../../../../algorithme/instances/X-n101-k25.vrp'), 'utf8')
    const r = parseFile('X-n101-k25.vrp', text)
    expect(r.issues).toEqual([])
    expect(r.instance?.customers).toHaveLength(100)
    expect(r.instance?.fleet).toMatchObject({ Q: 206, k: 25 })
    expect(r.instance?.depot).toMatchObject({ lng: 365, lat: 689 })
    expect(r.instance?.meta.coordinates).toBe('planar')
  })
})

describe('import Solomon', () => {
  const sample = `C101

VEHICLE
NUMBER     CAPACITY
  25         200

CUSTOMER
CUST NO.  XCOORD.   YCOORD.    DEMAND   READY TIME  DUE DATE   SERVICE   TIME

    0      40         50          0          0       1236          0
    1      45         68         10        912        967         90
    2      45         70         30        825        870         90
    3      42         66         x         65        146         90
`
  it('lit le dépôt, les fenêtres et signale la ligne illisible', () => {
    const r = parseFile('C101.txt', sample)
    expect(r.instance?.depot.tw).toEqual({ a: 0, b: 1236 })
    expect(r.customers).toHaveLength(2)
    expect(r.customers[0]).toMatchObject({ id: 1, tw: { a: 912, b: 967 }, service: 90, demand: 10 })
    expect(r.issues).toHaveLength(1)
    expect(r.issues[0]?.line).toBe(13)
  })
})
