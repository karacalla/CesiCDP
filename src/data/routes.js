import { PAL } from './palette'

// Vallée de Chamonix, coordonnées [lng, lat, altitude m]
export const ROUTES = [
  { id: 'A', name: 'Camion 1 · Vallée nord', color: PAL.blue, date: '28 oct', start: '08:10', end: '09:42', km: 27.4, load: 92, from: 'Les Houches', to: 'Le Tour',
    coords: [[6.7979,45.8908,1010],[6.8453,45.8987,1060],[6.8694,45.9237,1035],[6.8886,45.9503,1060],[6.9253,45.9806,1252],[6.9667,46.0056,1462]] },
  { id: 'B', name: 'Camion 2 · Col des Montets', color: PAL.pink, date: '28 oct', start: '08:30', end: '09:25', km: 14.1, load: 78, from: 'Argentière', to: 'Vallorcine',
    coords: [[6.9253,45.9806,1252],[6.9,46.0,1380],[6.9231,46.0211,1461],[6.9439,46.0344,1260]] },
  { id: 'C', name: 'Camion 3 · Pays du Mont-Blanc', color: PAL.indigo, date: '27 oct', start: '14:05', end: '14:51', km: 12.6, load: 85, from: 'Saint-Gervais', to: 'Servoz',
    coords: [[6.7114,45.8933,820],[6.733,45.91,900],[6.7667,45.9242,816]] },
]
