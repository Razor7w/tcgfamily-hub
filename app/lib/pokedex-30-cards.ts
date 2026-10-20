export type Pokedex30Section = 'main' | 'pikachu' | 'secret' | 'classic'

export type Pokedex30Card = {
  id: string
  number: number
  printed: string
  name: string
  type: string
  rarity: string
  section: Pokedex30Section
  image: string | null
  imageLarge: string | null
}

export const POKEDEX_30_CARDS: Pokedex30Card[] = [
  {
    id: '30th-001',
    number: 1,
    printed: '1/128',
    name: 'Exeggcute',
    type: 'Planta',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/001/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/001/high.webp'
  },
  {
    id: '30th-002',
    number: 2,
    printed: '2/128',
    name: 'Alolan Exeggutor',
    type: 'Planta',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/002/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/002/high.webp'
  },
  {
    id: '30th-003',
    number: 3,
    printed: '3/128',
    name: 'Volbeat',
    type: 'Planta',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/003/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/003/high.webp'
  },
  {
    id: '30th-004',
    number: 4,
    printed: '4/128',
    name: 'Illumise',
    type: 'Planta',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/004/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/004/high.webp'
  },
  {
    id: '30th-005',
    number: 5,
    printed: '5/128',
    name: 'Tropius',
    type: 'Planta',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/005/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/005/high.webp'
  },
  {
    id: '30th-006',
    number: 6,
    printed: '6/128',
    name: 'Cherubi',
    type: 'Planta',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/006/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/006/high.webp'
  },
  {
    id: '30th-007',
    number: 7,
    printed: '7/128',
    name: 'Cherrim',
    type: 'Planta',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/007/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/007/high.webp'
  },
  {
    id: '30th-008',
    number: 8,
    printed: '8/128',
    name: 'Vivillon',
    type: 'Planta',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/008/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/008/high.webp'
  },
  {
    id: '30th-009',
    number: 9,
    printed: '9/128',
    name: 'Vulpix',
    type: 'Fuego',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/009/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/009/high.webp'
  },
  {
    id: '30th-010',
    number: 10,
    printed: '10/128',
    name: 'Ninetales',
    type: 'Fuego',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/010/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/010/high.webp'
  },
  {
    id: '30th-011',
    number: 11,
    printed: '11/128',
    name: 'Moltres',
    type: 'Fuego',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/011/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/011/high.webp'
  },
  {
    id: '30th-012',
    number: 12,
    printed: '12/128',
    name: 'Ho-Oh',
    type: 'Fuego',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/012/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/012/high.webp'
  },
  {
    id: '30th-013',
    number: 13,
    printed: '13/128',
    name: 'Victini',
    type: 'Fuego',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/013/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/013/high.webp'
  },
  {
    id: '30th-014',
    number: 14,
    printed: '14/128',
    name: 'Reshiram',
    type: 'Fuego',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/014/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/014/high.webp'
  },
  {
    id: '30th-015',
    number: 15,
    printed: '15/128',
    name: 'Fuecoco ex',
    type: 'Fuego',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/015/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/015/high.webp'
  },
  {
    id: '30th-016',
    number: 16,
    printed: '16/128',
    name: 'Slowpoke',
    type: 'Agua',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/016/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/016/high.webp'
  },
  {
    id: '30th-017',
    number: 17,
    printed: '17/128',
    name: 'Lapras',
    type: 'Agua',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/017/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/017/high.webp'
  },
  {
    id: '30th-018',
    number: 18,
    printed: '18/128',
    name: 'Articuno',
    type: 'Agua',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/018/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/018/high.webp'
  },
  {
    id: '30th-019',
    number: 19,
    printed: '19/128',
    name: 'Kyogre',
    type: 'Agua',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/019/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/019/high.webp'
  },
  {
    id: '30th-020',
    number: 20,
    printed: '20/128',
    name: 'Palkia',
    type: 'Agua',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/020/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/020/high.webp'
  },
  {
    id: '30th-021',
    number: 21,
    printed: '21/128',
    name: 'Greninja ex',
    type: 'Agua',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/021/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/021/high.webp'
  },
  {
    id: '30th-022',
    number: 22,
    printed: '22/128',
    name: 'Wishiwashi',
    type: 'Agua',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/022/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/022/high.webp'
  },
  {
    id: '30th-023',
    number: 23,
    printed: '23/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/023/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/023/high.webp'
  },
  {
    id: '30th-024',
    number: 24,
    printed: '24/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/024/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/024/high.webp'
  },
  {
    id: '30th-025',
    number: 25,
    printed: '25/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/025/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/025/high.webp'
  },
  {
    id: '30th-026',
    number: 26,
    printed: '26/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/026/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/026/high.webp'
  },
  {
    id: '30th-027',
    number: 27,
    printed: '27/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/027/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/027/high.webp'
  },
  {
    id: '30th-028',
    number: 28,
    printed: '28/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/028/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/028/high.webp'
  },
  {
    id: '30th-029',
    number: 29,
    printed: '29/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/029/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/029/high.webp'
  },
  {
    id: '30th-030',
    number: 30,
    printed: '30/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/030/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/030/high.webp'
  },
  {
    id: '30th-031',
    number: 31,
    printed: '31/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/031/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/031/high.webp'
  },
  {
    id: '30th-032',
    number: 32,
    printed: '32/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/032/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/032/high.webp'
  },
  {
    id: '30th-033',
    number: 33,
    printed: '33/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/033/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/033/high.webp'
  },
  {
    id: '30th-034',
    number: 34,
    printed: '34/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/034/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/034/high.webp'
  },
  {
    id: '30th-035',
    number: 35,
    printed: '35/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/035/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/035/high.webp'
  },
  {
    id: '30th-036',
    number: 36,
    printed: '36/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/036/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/036/high.webp'
  },
  {
    id: '30th-037',
    number: 37,
    printed: '37/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/037/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/037/high.webp'
  },
  {
    id: '30th-038',
    number: 38,
    printed: '38/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/038/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/038/high.webp'
  },
  {
    id: '30th-039',
    number: 39,
    printed: '39/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/039/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/039/high.webp'
  },
  {
    id: '30th-040',
    number: 40,
    printed: '40/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/040/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/040/high.webp'
  },
  {
    id: '30th-041',
    number: 41,
    printed: '41/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/041/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/041/high.webp'
  },
  {
    id: '30th-042',
    number: 42,
    printed: '42/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/042/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/042/high.webp'
  },
  {
    id: '30th-043',
    number: 43,
    printed: '43/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/043/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/043/high.webp'
  },
  {
    id: '30th-044',
    number: 44,
    printed: '44/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/044/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/044/high.webp'
  },
  {
    id: '30th-045',
    number: 45,
    printed: '45/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/045/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/045/high.webp'
  },
  {
    id: '30th-046',
    number: 46,
    printed: '46/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/046/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/046/high.webp'
  },
  {
    id: '30th-047',
    number: 47,
    printed: '47/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/047/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/047/high.webp'
  },
  {
    id: '30th-048',
    number: 48,
    printed: '48/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/048/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/048/high.webp'
  },
  {
    id: '30th-049',
    number: 49,
    printed: '49/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/049/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/049/high.webp'
  },
  {
    id: '30th-050',
    number: 50,
    printed: '50/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/050/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/050/high.webp'
  },
  {
    id: '30th-051',
    number: 51,
    printed: '51/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/051/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/051/high.webp'
  },
  {
    id: '30th-052',
    number: 52,
    printed: '52/128',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Pikachu Rare',
    section: 'pikachu',
    image: 'https://assets.tcgdex.net/en/me/30th/052/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/052/high.webp'
  },
  {
    id: '30th-053',
    number: 53,
    printed: '53/128',
    name: 'Pikachu ex',
    type: 'Rayo',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/053/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/053/high.webp'
  },
  {
    id: '30th-054',
    number: 54,
    printed: '54/128',
    name: 'Pikachu ex',
    type: 'Rayo',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/054/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/054/high.webp'
  },
  {
    id: '30th-055',
    number: 55,
    printed: '55/128',
    name: 'Zapdos',
    type: 'Rayo',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/055/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/055/high.webp'
  },
  {
    id: '30th-056',
    number: 56,
    printed: '56/128',
    name: 'Zekrom',
    type: 'Rayo',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/056/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/056/high.webp'
  },
  {
    id: '30th-057',
    number: 57,
    printed: '57/128',
    name: 'Zeraora',
    type: 'Rayo',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/057/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/057/high.webp'
  },
  {
    id: '30th-058',
    number: 58,
    printed: '58/128',
    name: 'Toxel',
    type: 'Rayo',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/058/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/058/high.webp'
  },
  {
    id: '30th-059',
    number: 59,
    printed: '59/128',
    name: 'Toxtricity',
    type: 'Rayo',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/059/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/059/high.webp'
  },
  {
    id: '30th-060',
    number: 60,
    printed: '60/128',
    name: 'Toxtricity',
    type: 'Rayo',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/060/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/060/high.webp'
  },
  {
    id: '30th-061',
    number: 61,
    printed: '61/128',
    name: 'Morpeko',
    type: 'Rayo',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/061/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/061/high.webp'
  },
  {
    id: '30th-062',
    number: 62,
    printed: '62/128',
    name: 'Miraidon',
    type: 'Rayo',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/062/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/062/high.webp'
  },
  {
    id: '30th-063',
    number: 63,
    printed: '63/128',
    name: 'Mewtwo',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/063/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/063/high.webp'
  },
  {
    id: '30th-064',
    number: 64,
    printed: '64/128',
    name: 'Mewtwo ex',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/064/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/064/high.webp'
  },
  {
    id: '30th-065',
    number: 65,
    printed: '65/128',
    name: 'Mew',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/065/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/065/high.webp'
  },
  {
    id: '30th-066',
    number: 66,
    printed: '66/128',
    name: 'Mew ex',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/066/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/066/high.webp'
  },
  {
    id: '30th-067',
    number: 67,
    printed: '67/128',
    name: 'Marill',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/067/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/067/high.webp'
  },
  {
    id: '30th-068',
    number: 68,
    printed: '68/128',
    name: 'Azumarill',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/068/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/068/high.webp'
  },
  {
    id: '30th-069',
    number: 69,
    printed: '69/128',
    name: 'Espeon',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/069/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/069/high.webp'
  },
  {
    id: '30th-070',
    number: 70,
    printed: '70/128',
    name: 'Espeon ex',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/070/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/070/high.webp'
  },
  {
    id: '30th-071',
    number: 71,
    printed: '71/128',
    name: 'Sylveon ex',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/071/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/071/high.webp'
  },
  {
    id: '30th-072',
    number: 72,
    printed: '72/128',
    name: 'Unown',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/072/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/072/high.webp'
  },
  {
    id: '30th-073',
    number: 73,
    printed: '73/128',
    name: 'Drifloon',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/073/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/073/high.webp'
  },
  {
    id: '30th-074',
    number: 74,
    printed: '74/128',
    name: 'Cresselia',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/074/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/074/high.webp'
  },
  {
    id: '30th-075',
    number: 75,
    printed: '75/128',
    name: 'Chandelure',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/075/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/075/high.webp'
  },
  {
    id: '30th-076',
    number: 76,
    printed: '76/128',
    name: 'Xerneas',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/076/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/076/high.webp'
  },
  {
    id: '30th-077',
    number: 77,
    printed: '77/128',
    name: 'Comfey',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/077/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/077/high.webp'
  },
  {
    id: '30th-078',
    number: 78,
    printed: '78/128',
    name: 'Cosmog',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/078/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/078/high.webp'
  },
  {
    id: '30th-079',
    number: 79,
    printed: '79/128',
    name: 'Cosmoem',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/079/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/079/high.webp'
  },
  {
    id: '30th-080',
    number: 80,
    printed: '80/128',
    name: 'Lunala',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/080/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/080/high.webp'
  },
  {
    id: '30th-081',
    number: 81,
    printed: '81/128',
    name: 'Gimmighoul',
    type: 'Psiquico',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/081/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/081/high.webp'
  },
  {
    id: '30th-082',
    number: 82,
    printed: '82/128',
    name: 'Groudon',
    type: 'Lucha',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/082/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/082/high.webp'
  },
  {
    id: '30th-083',
    number: 83,
    printed: '83/128',
    name: 'Lucario',
    type: 'Lucha',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/083/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/083/high.webp'
  },
  {
    id: '30th-084',
    number: 84,
    printed: '84/128',
    name: 'Seismitoad',
    type: 'Lucha',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/084/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/084/high.webp'
  },
  {
    id: '30th-085',
    number: 85,
    printed: '85/128',
    name: 'Lycanroc',
    type: 'Lucha',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/085/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/085/high.webp'
  },
  {
    id: '30th-086',
    number: 86,
    printed: '86/128',
    name: 'Koraidon',
    type: 'Lucha',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/086/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/086/high.webp'
  },
  {
    id: '30th-087',
    number: 87,
    printed: '87/128',
    name: 'Nidoran♀',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/087/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/087/high.webp'
  },
  {
    id: '30th-088',
    number: 88,
    printed: '88/128',
    name: 'Nidorina',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/088/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/088/high.webp'
  },
  {
    id: '30th-089',
    number: 89,
    printed: '89/128',
    name: 'Alolan Meowth',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/089/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/089/high.webp'
  },
  {
    id: '30th-090',
    number: 90,
    printed: '90/128',
    name: 'Gengar ex',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/090/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/090/high.webp'
  },
  {
    id: '30th-091',
    number: 91,
    printed: '91/128',
    name: 'Umbreon',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/091/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/091/high.webp'
  },
  {
    id: '30th-092',
    number: 92,
    printed: '92/128',
    name: 'Umbreon ex',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/092/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/092/high.webp'
  },
  {
    id: '30th-093',
    number: 93,
    printed: '93/128',
    name: 'Murkrow',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/093/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/093/high.webp'
  },
  {
    id: '30th-094',
    number: 94,
    printed: '94/128',
    name: 'Scraggy',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/094/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/094/high.webp'
  },
  {
    id: '30th-095',
    number: 95,
    printed: '95/128',
    name: 'Zorua',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/095/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/095/high.webp'
  },
  {
    id: '30th-096',
    number: 96,
    printed: '96/128',
    name: 'Zoroark',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/096/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/096/high.webp'
  },
  {
    id: '30th-097',
    number: 97,
    printed: '97/128',
    name: 'Deino',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/097/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/097/high.webp'
  },
  {
    id: '30th-098',
    number: 98,
    printed: '98/128',
    name: 'Zweilous',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/098/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/098/high.webp'
  },
  {
    id: '30th-099',
    number: 99,
    printed: '99/128',
    name: 'Hydreigon',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/099/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/099/high.webp'
  },
  {
    id: '30th-100',
    number: 100,
    printed: '100/128',
    name: 'Yveltal',
    type: 'Siniestro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/100/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/100/high.webp'
  },
  {
    id: '30th-101',
    number: 101,
    printed: '101/128',
    name: 'Galarian Meowth',
    type: 'Metal',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/101/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/101/high.webp'
  },
  {
    id: '30th-102',
    number: 102,
    printed: '102/128',
    name: 'Jirachi ex',
    type: 'Metal',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/102/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/102/high.webp'
  },
  {
    id: '30th-103',
    number: 103,
    printed: '103/128',
    name: 'Dialga',
    type: 'Metal',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/103/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/103/high.webp'
  },
  {
    id: '30th-104',
    number: 104,
    printed: '104/128',
    name: 'Ferrothorn',
    type: 'Metal',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/104/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/104/high.webp'
  },
  {
    id: '30th-105',
    number: 105,
    printed: '105/128',
    name: 'Solgaleo',
    type: 'Metal',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/105/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/105/high.webp'
  },
  {
    id: '30th-106',
    number: 106,
    printed: '106/128',
    name: 'Zacian',
    type: 'Metal',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/106/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/106/high.webp'
  },
  {
    id: '30th-107',
    number: 107,
    printed: '107/128',
    name: 'Zamazenta',
    type: 'Metal',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/107/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/107/high.webp'
  },
  {
    id: '30th-108',
    number: 108,
    printed: '108/128',
    name: 'Gholdengo',
    type: 'Metal',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/108/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/108/high.webp'
  },
  {
    id: '30th-109',
    number: 109,
    printed: '109/128',
    name: 'Salamence ex',
    type: 'Dragon',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/109/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/109/high.webp'
  },
  {
    id: '30th-110',
    number: 110,
    printed: '110/128',
    name: 'Jangmo-o',
    type: 'Dragon',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/110/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/110/high.webp'
  },
  {
    id: '30th-111',
    number: 111,
    printed: '111/128',
    name: 'Hakamo-o',
    type: 'Dragon',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/111/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/111/high.webp'
  },
  {
    id: '30th-112',
    number: 112,
    printed: '112/128',
    name: 'Kommo-o',
    type: 'Dragon',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/112/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/112/high.webp'
  },
  {
    id: '30th-113',
    number: 113,
    printed: '113/128',
    name: 'Meowth',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/113/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/113/high.webp'
  },
  {
    id: '30th-114',
    number: 114,
    printed: '114/128',
    name: 'Kangaskhan',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/114/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/114/high.webp'
  },
  {
    id: '30th-115',
    number: 115,
    printed: '115/128',
    name: 'Ditto',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/115/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/115/high.webp'
  },
  {
    id: '30th-116',
    number: 116,
    printed: '116/128',
    name: 'Eevee',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/116/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/116/high.webp'
  },
  {
    id: '30th-117',
    number: 117,
    printed: '117/128',
    name: 'Eevee',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/117/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/117/high.webp'
  },
  {
    id: '30th-118',
    number: 118,
    printed: '118/128',
    name: 'Eevee',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/118/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/118/high.webp'
  },
  {
    id: '30th-119',
    number: 119,
    printed: '119/128',
    name: 'Snorlax',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/119/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/119/high.webp'
  },
  {
    id: '30th-120',
    number: 120,
    printed: '120/128',
    name: 'Igglybuff',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/120/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/120/high.webp'
  },
  {
    id: '30th-121',
    number: 121,
    printed: '121/128',
    name: 'Lugia',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/121/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/121/high.webp'
  },
  {
    id: '30th-122',
    number: 122,
    printed: '122/128',
    name: 'Hisuian Zorua',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/122/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/122/high.webp'
  },
  {
    id: '30th-123',
    number: 123,
    printed: '123/128',
    name: 'Hisuian Zoroark',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/123/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/123/high.webp'
  },
  {
    id: '30th-124',
    number: 124,
    printed: '124/128',
    name: 'Minior',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/124/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/124/high.webp'
  },
  {
    id: '30th-125',
    number: 125,
    printed: '125/128',
    name: 'Maushold',
    type: 'Incoloro',
    rarity: 'Set principal',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/125/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/125/high.webp'
  },
  {
    id: '30th-126',
    number: 126,
    printed: '126/128',
    name: 'Poké Pad',
    type: 'Entrenador',
    rarity: 'Entrenador',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/126/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/126/high.webp'
  },
  {
    id: '30th-127',
    number: 127,
    printed: '127/128',
    name: 'Switch',
    type: 'Entrenador',
    rarity: 'Entrenador',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/127/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/127/high.webp'
  },
  {
    id: '30th-128',
    number: 128,
    printed: '128/128',
    name: 'Ultra Ball',
    type: 'Entrenador',
    rarity: 'Entrenador',
    section: 'main',
    image: 'https://assets.tcgdex.net/en/me/30th/128/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/128/high.webp'
  },
  {
    id: '30th-129',
    number: 129,
    printed: '129/128',
    name: 'Alolan Exeggutor',
    type: 'Planta',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/129/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/129/high.webp'
  },
  {
    id: '30th-130',
    number: 130,
    printed: '130/128',
    name: 'Moltres',
    type: 'Fuego',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/130/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/130/high.webp'
  },
  {
    id: '30th-131',
    number: 131,
    printed: '131/128',
    name: 'Lapras',
    type: 'Agua',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/131/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/131/high.webp'
  },
  {
    id: '30th-132',
    number: 132,
    printed: '132/128',
    name: 'Articuno',
    type: 'Agua',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/132/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/132/high.webp'
  },
  {
    id: '30th-133',
    number: 133,
    printed: '133/128',
    name: 'Zapdos',
    type: 'Rayo',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/133/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/133/high.webp'
  },
  {
    id: '30th-134',
    number: 134,
    printed: '134/128',
    name: 'Toxtricity',
    type: 'Rayo',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/134/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/134/high.webp'
  },
  {
    id: '30th-135',
    number: 135,
    printed: '135/128',
    name: 'Morpeko',
    type: 'Rayo',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/135/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/135/high.webp'
  },
  {
    id: '30th-136',
    number: 136,
    printed: '136/128',
    name: 'Drifloon',
    type: 'Psiquico',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/136/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/136/high.webp'
  },
  {
    id: '30th-137',
    number: 137,
    printed: '137/128',
    name: 'Chandelure',
    type: 'Psiquico',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/137/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/137/high.webp'
  },
  {
    id: '30th-138',
    number: 138,
    printed: '138/128',
    name: 'Lycanroc',
    type: 'Lucha',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/138/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/138/high.webp'
  },
  {
    id: '30th-139',
    number: 139,
    printed: '139/128',
    name: 'Alolan Meowth',
    type: 'Siniestro',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/139/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/139/high.webp'
  },
  {
    id: '30th-140',
    number: 140,
    printed: '140/128',
    name: 'Scraggy',
    type: 'Siniestro',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/140/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/140/high.webp'
  },
  {
    id: '30th-141',
    number: 141,
    printed: '141/128',
    name: 'Galarian Meowth',
    type: 'Siniestro',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/141/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/141/high.webp'
  },
  {
    id: '30th-142',
    number: 142,
    printed: '142/128',
    name: 'Gholdengo',
    type: 'Metal',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/142/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/142/high.webp'
  },
  {
    id: '30th-143',
    number: 143,
    printed: '143/128',
    name: 'Kommo-o',
    type: 'Dragon',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/143/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/143/high.webp'
  },
  {
    id: '30th-144',
    number: 144,
    printed: '144/128',
    name: 'Meowth',
    type: 'Incoloro',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/144/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/144/high.webp'
  },
  {
    id: '30th-145',
    number: 145,
    printed: '145/128',
    name: 'Hisuian Zorua',
    type: 'Incoloro',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/145/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/145/high.webp'
  },
  {
    id: '30th-146',
    number: 146,
    printed: '146/128',
    name: 'Maushold',
    type: 'Incoloro',
    rarity: 'Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/146/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/146/high.webp'
  },
  {
    id: '30th-147',
    number: 147,
    printed: '147/128',
    name: 'Fuecoco ex',
    type: 'Fuego',
    rarity: 'Special Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/147/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/147/high.webp'
  },
  {
    id: '30th-148',
    number: 148,
    printed: '148/128',
    name: 'Greninja ex',
    type: 'Agua',
    rarity: 'Special Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/148/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/148/high.webp'
  },
  {
    id: '30th-149',
    number: 149,
    printed: '149/128',
    name: 'Pikachu ex',
    type: 'Rayo',
    rarity: 'Special Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/149/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/149/high.webp'
  },
  {
    id: '30th-150',
    number: 150,
    printed: '150/128',
    name: 'Pikachu ex',
    type: 'Rayo',
    rarity: 'Special Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/150/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/150/high.webp'
  },
  {
    id: '30th-151',
    number: 151,
    printed: '151/128',
    name: 'Mewtwo ex',
    type: 'Psiquico',
    rarity: 'Special Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/151/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/151/high.webp'
  },
  {
    id: '30th-152',
    number: 152,
    printed: '152/128',
    name: 'Mew ex',
    type: 'Psiquico',
    rarity: 'Special Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/152/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/152/high.webp'
  },
  {
    id: '30th-153',
    number: 153,
    printed: '153/128',
    name: 'Sylveon ex',
    type: 'Psiquico',
    rarity: 'Special Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/153/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/153/high.webp'
  },
  {
    id: '30th-154',
    number: 154,
    printed: '154/128',
    name: 'Gengar ex',
    type: 'Siniestro',
    rarity: 'Special Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/154/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/154/high.webp'
  },
  {
    id: '30th-155',
    number: 155,
    printed: '155/128',
    name: 'Jirachi ex',
    type: 'Metal',
    rarity: 'Special Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/155/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/155/high.webp'
  },
  {
    id: '30th-156',
    number: 156,
    printed: '156/128',
    name: 'Salamence ex',
    type: 'Dragon',
    rarity: 'Special Illustration Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/156/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/156/high.webp'
  },
  {
    id: '30th-157',
    number: 157,
    printed: '157/128',
    name: 'Mewtwo ex',
    type: 'Psiquico',
    rarity: 'Futuristic Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/157/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/157/high.webp'
  },
  {
    id: '30th-158',
    number: 158,
    printed: '158/128',
    name: 'Mew ex',
    type: 'Psiquico',
    rarity: 'Futuristic Rare',
    section: 'secret',
    image: 'https://assets.tcgdex.net/en/me/30th/158/low.webp',
    imageLarge: 'https://assets.tcgdex.net/en/me/30th/158/high.webp'
  },
  {
    id: '30th-mew-rgb-g',
    number: 159,
    printed: 'RGB verde',
    name: 'Mew RGB verde',
    type: 'Psiquico',
    rarity: 'Mew RGB',
    section: 'secret',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_G_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_G_R_EN_LG.png'
  },
  {
    id: '30th-mew-rgb-r',
    number: 160,
    printed: 'RGB roja',
    name: 'Mew RGB roja',
    type: 'Psiquico',
    rarity: 'Mew RGB',
    section: 'secret',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_R_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_R_R_EN_LG.png'
  },
  {
    id: '30th-mew-rgb-b',
    number: 161,
    printed: 'RGB azul',
    name: 'Mew RGB azul',
    type: 'Psiquico',
    rarity: 'Mew RGB',
    section: 'secret',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_B_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_B_R_EN_LG.png'
  },
  {
    id: '30th-c-001',
    number: 1,
    printed: 'C01/30',
    name: 'Charizard',
    type: 'Fuego',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC2_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC2_R_EN_LG.png'
  },
  {
    id: '30th-c-002',
    number: 2,
    printed: 'C02/30',
    name: 'Delcatty',
    type: 'Incoloro',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC8_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC8_R_EN_LG.png'
  },
  {
    id: '30th-c-003',
    number: 3,
    printed: 'C03/30',
    name: 'Metagross',
    type: 'Metal',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC11_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC11_R_EN_LG.png'
  },
  {
    id: '30th-c-004',
    number: 4,
    printed: 'C04/30',
    name: 'Genesect EX',
    type: 'Metal',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC20_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC20_R_EN_LG.png'
  },
  {
    id: '30th-c-005',
    number: 5,
    printed: 'C05/30',
    name: 'Misty',
    type: 'Entrenador',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC3_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC3_R_EN_LG.png'
  },
  {
    id: '30th-c-006',
    number: 6,
    printed: 'C06/30',
    name: 'Dark Tyranitar',
    type: 'Siniestro',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC9_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC9_R_EN_LG.png'
  },
  {
    id: '30th-c-007',
    number: 7,
    printed: 'C07/30',
    name: 'Sneasel',
    type: 'Siniestro',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC5_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC5_R_EN_LG.png'
  },
  {
    id: '30th-c-008',
    number: 8,
    printed: 'C08/30',
    name: 'Pikachu & Zekrom GX',
    type: 'Rayo',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC25_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC25_R_EN_LG.png'
  },
  {
    id: '30th-c-009',
    number: 9,
    printed: 'C09/30',
    name: 'Greninja BREAK',
    type: 'Agua',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC22_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC22_R_EN_LG.png'
  },
  {
    id: '30th-c-010',
    number: 10,
    printed: 'C10/30',
    name: 'Uxie',
    type: 'Psiquico',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC13_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC13_R_EN_LG.png'
  },
  {
    id: '30th-c-011',
    number: 11,
    printed: 'C11/30',
    name: 'Crobat G',
    type: 'Psiquico',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC14_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC14_R_EN_LG.png'
  },
  {
    id: '30th-c-012',
    number: 12,
    printed: 'C12/30',
    name: 'Raikou',
    type: 'Rayo',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC27_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC27_R_EN_LG.png'
  },
  {
    id: '30th-c-013',
    number: 13,
    printed: 'C13/30',
    name: 'Buzzwole GX',
    type: 'Lucha',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC24_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC24_R_EN_LG.png'
  },
  {
    id: '30th-c-014',
    number: 14,
    printed: 'C14/30',
    name: 'Pikachu',
    type: 'Rayo',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC1_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC1_R_EN_LG.png'
  },
  {
    id: '30th-c-015',
    number: 15,
    printed: 'C15/30',
    name: "Erika's Jigglypuff",
    type: 'Incoloro',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC4_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC4_R_EN_LG.png'
  },
  {
    id: '30th-c-016',
    number: 16,
    printed: 'C16/30',
    name: 'Rayquaza EX',
    type: 'Dragon',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC19_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC19_R_EN_LG.png'
  },
  {
    id: '30th-c-017',
    number: 17,
    printed: 'C17/30',
    name: 'Solgaleo GX',
    type: 'Metal',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC23_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC23_R_EN_LG.png'
  },
  {
    id: '30th-c-018',
    number: 18,
    printed: 'C18/30',
    name: 'Gengar',
    type: 'Psiquico',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC15_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC15_R_EN_LG.png'
  },
  {
    id: '30th-c-019',
    number: 19,
    printed: 'C19/30',
    name: 'Darkrai & Cresselia LEGEND',
    type: 'Psiquico',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC16_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC16_R_EN_LG.png'
  },
  {
    id: '30th-c-020',
    number: 20,
    printed: 'C20/30',
    name: 'Darkrai & Cresselia LEGEND',
    type: 'Psiquico',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC17_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC17_R_EN_LG.png'
  },
  {
    id: '30th-c-021',
    number: 21,
    printed: 'C21/30',
    name: 'N',
    type: 'Entrenador',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC18_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC18_R_EN_LG.png'
  },
  {
    id: '30th-c-022',
    number: 22,
    printed: 'C22/30',
    name: 'Palkia',
    type: 'Agua',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC12_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC12_R_EN_LG.png'
  },
  {
    id: '30th-c-023',
    number: 23,
    printed: 'C23/30',
    name: 'M Gardevoir EX',
    type: 'Psiquico',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC21_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC21_R_EN_LG.png'
  },
  {
    id: '30th-c-024',
    number: 24,
    printed: 'C24/30',
    name: 'Shining Celebi',
    type: 'Planta',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC6_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC6_R_EN_LG.png'
  },
  {
    id: '30th-c-025',
    number: 25,
    printed: 'C25/30',
    name: 'Scizor ex',
    type: 'Metal',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC10_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC10_R_EN_LG.png'
  },
  {
    id: '30th-c-026',
    number: 26,
    printed: 'C26/30',
    name: 'Mew VMAX',
    type: 'Psiquico',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC28_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC28_R_EN_LG.png'
  },
  {
    id: '30th-c-027',
    number: 27,
    printed: 'C27/30',
    name: 'Arceus VSTAR',
    type: 'Incoloro',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC29_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC29_R_EN_LG.png'
  },
  {
    id: '30th-c-028',
    number: 28,
    printed: 'C28/30',
    name: 'Zacian V',
    type: 'Metal',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC26_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC26_R_EN_LG.png'
  },
  {
    id: '30th-c-029',
    number: 29,
    printed: 'C29/30',
    name: 'Lugia',
    type: 'Incoloro',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC7_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC7_R_EN_LG.png'
  },
  {
    id: '30th-c-030',
    number: 30,
    printed: 'C30/30',
    name: 'Magikarp',
    type: 'Agua',
    rarity: 'Classic Collection',
    section: 'classic',
    image:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC30_R_EN_SM.png',
    imageLarge:
      'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC30_R_EN_LG.png'
  }
]
