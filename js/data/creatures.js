// Baby dragons that hatch from eggs. Each egg's shell is tinted to hint at
// the palette inside. These are placeholders until real creature designs exist.

export const PALETTES = [
  { id: 'mint', label: 'Mint', egg: '#d6efd9', body: 0x9fd4b0, belly: 0xf2f0d8, accent: 0xf0c96a, wing: 0xc3e7cb, eye: 0x2a2a22 },
  { id: 'rose', label: 'Rose', egg: '#f6dbe2', body: 0xeaa6b8, belly: 0xfbeee8, accent: 0xf0c96a, wing: 0xf4c7d3, eye: 0x3a2230 },
  { id: 'sky', label: 'Sky', egg: '#d9e7f6', body: 0x9cc3ea, belly: 0xf1f4fb, accent: 0xf2d27a, wing: 0xc5dcf5, eye: 0x223050 },
  { id: 'honey', label: 'Honey', egg: '#f5e6bd', body: 0xf0c060, belly: 0xfbf1d6, accent: 0xd08a3a, wing: 0xf6d68e, eye: 0x3a2610 },
  { id: 'plum', label: 'Plum', egg: '#e6dcf2', body: 0xa98bc9, belly: 0xf1ebf8, accent: 0xf0cf7a, wing: 0xc9b6e2, eye: 0x2a2040 },
  { id: 'teal', label: 'Teal', egg: '#d3ebe6', body: 0x6fb7ad, belly: 0xeef6ef, accent: 0xe8c070, wing: 0xa6d6cf, eye: 0x1e3230 },
];

export const NAMES = ['Sprig', 'Pip', 'Clover', 'Bramble', 'Wisp', 'Tansy', 'Button', 'Fern', 'Juniper', 'Maple', 'Nutmeg', 'Poppy', 'Sorrel', 'Thimble'];

export const CHIRPS = ['chirps happily.', 'does a wobbly little hop.', 'sniffs your finger.', 'tries to flap its tiny wings.', 'yawns a very small yawn.', 'is chasing a butterfly.'];

export const paletteById = (id) => PALETTES.find((p) => p.id === id) || PALETTES[0];

export function hatchlingDef(creature) {
  const p = paletteById(creature.palette);
  return {
    id: `baby-${creature.id}`,
    name: creature.name,
    scale: 0.42,
    colors: { body: p.body, belly: p.belly, accent: p.accent, wing: p.wing, eye: p.eye },
    build: { round: 1.15, wing: 0.8, tail: 0.8, horn: 'nub', frill: p.id === 'mint' || p.id === 'teal' },
  };
}
