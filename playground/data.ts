export interface Place {
  name: string
  kind: string
  distance: string
  color: string
}

const kinds = ['Coffee', 'Bakery', 'Bookstore', 'Park', 'Museum', 'Ramen', 'Gallery', 'Market']
const colors = [
  '#ff9500',
  '#ff2d55',
  '#5856d6',
  '#34c759',
  '#af52de',
  '#ff3b30',
  '#5ac8fa',
  '#ffcc00',
]
const names = [
  'Blue Bottle',
  'Tartine',
  'City Lights',
  'Golden Gate',
  'SFMOMA',
  'Mensho',
  'Gagosian',
  'Ferry Building',
  'Ritual',
  'Arsicault',
  'Green Apple',
  'Dolores',
  'de Young',
  'Marufuku',
  'Fraenkel',
  'Bi-Rite',
  'Sightglass',
  'Jane',
  'Dog Eared',
  'Alamo Square',
]

export const places: Place[] = names.map((name, index) => ({
  name,
  kind: kinds[index % kinds.length]!,
  distance: `${((index + 1) * 0.3).toFixed(1)} km`,
  color: colors[index % colors.length]!,
}))
