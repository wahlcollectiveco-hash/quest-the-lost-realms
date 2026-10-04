// Everything that can be discovered by completing Quests.
// Story fragments, map pieces and keys are found in the order listed here.

export const KINDS = {
  treasure: { label: 'Treasures', one: 'treasure' },
  flower: { label: 'Flowers', one: 'flower' },
  decoration: { label: 'Decorations', one: 'decoration' },
  key: { label: 'Keys', one: 'key' },
  map: { label: 'Map Fragments', one: 'map fragment' },
  story: { label: 'Story Fragments', one: 'story fragment' },
};

export const CATALOG = [
  // Treasures
  { id: 'sunstone', kind: 'treasure', name: 'Sunstone Pebble', desc: 'Warm to the touch, even at night.', color: '#f2b441' },
  { id: 'silver-coin', kind: 'treasure', name: 'Old Silver Coin', desc: 'Stamped with a dragon on one side and a door on the other.', color: '#c9ccd4' },
  { id: 'golden-acorn', kind: 'treasure', name: 'Golden Acorn', desc: 'Someone buried it here for safekeeping.', color: '#d9a940' },
  { id: 'galaxy-marble', kind: 'treasure', name: 'Galaxy Marble', desc: 'Tiny stars drift inside the glass.', color: '#6f78c9' },
  { id: 'bronze-bell', kind: 'treasure', name: 'Tiny Bronze Bell', desc: 'It rings, but only dragons can hear it.', color: '#b87a3d' },
  { id: 'dawn-feather', kind: 'treasure', name: 'Dawn Feather', desc: 'Pink and gold, like early morning.', color: '#f0a58a' },
  { id: 'moon-shell', kind: 'treasure', name: 'Moonlit Shell', desc: 'Hold it close and you can hear a quiet sea.', color: '#b9c5ea' },
  { id: 'wooden-fox', kind: 'treasure', name: 'Carved Wooden Fox', desc: 'Small, and worn smooth by many hands.', color: '#b0703f' },
  { id: 'keepers-compass', kind: 'treasure', special: true, name: 'Keeper’s Compass', desc: 'Its needle always points toward the Ancient Door.', color: '#d9b24e' },

  // Flowers (appear in the Haven)
  { id: 'moonpetal', kind: 'flower', name: 'Moonpetal', desc: 'Glows faintly, like it saved some moonlight.', color: '#c9d2ff' },
  { id: 'sunbell', kind: 'flower', name: 'Sunbell', desc: 'Rings softly when the wind passes.', color: '#f6cf4a' },
  { id: 'whisperfern', kind: 'flower', name: 'Whisperfern', desc: 'Its leaves curl as if it’s listening.', color: '#7fb36a' },
  { id: 'starblossom', kind: 'flower', name: 'Starblossom', desc: 'Five petals, like a little star.', color: '#f3b6d8' },
  { id: 'dewdrop-lily', kind: 'flower', name: 'Dewdrop Lily', desc: 'Floats on the pond, holding a drop of morning.', color: '#bfe8f2' },
  { id: 'emberbloom', kind: 'flower', name: 'Emberbloom', desc: 'Warm orange petals that never wilt.', color: '#f08a4b' },

  // Decorations (appear in the Haven)
  { id: 'paper-lanterns', kind: 'decoration', name: 'Paper Lanterns', desc: 'A warm glow strung over the path.', color: '#f4b860' },
  { id: 'mushroom-ring', kind: 'decoration', name: 'Mushroom Ring', desc: 'Some say fairies dance here at night.', color: '#d8674e' },
  { id: 'stone-bench', kind: 'decoration', name: 'Stone Bench', desc: 'A mossy seat for resting.', color: '#a9a391' },
  { id: 'bird-bath', kind: 'decoration', name: 'Bird Bath', desc: 'The birds are delighted.', color: '#9fc8d8' },
  { id: 'wind-chime', kind: 'decoration', name: 'Wind Chime', desc: 'Tinkles softly in the breeze.', color: '#8fb8c8' },
  { id: 'stone-guardian', kind: 'decoration', name: 'Little Stone Guardian', desc: 'An owl statue that keeps watch.', color: '#9a9483' },
  { id: 'flower-arch', kind: 'decoration', name: 'Flower Arch', desc: 'Roses climb over the garden path.', color: '#e79ab4' },
  { id: 'picnic-blanket', kind: 'decoration', name: 'Picnic Blanket', desc: 'For slow, lazy afternoons.', color: '#d9776a' },

  // Hidden in Verdant Vale (found by exploring, never by chance)
  { id: 'vale-crystal', kind: 'treasure', special: true, name: 'Grotto Crystal', desc: 'Found behind the great waterfall. It hums whenever the Door does.', color: '#9fc4ff' },
  { id: 'owl-feather', kind: 'treasure', special: true, name: 'Silver Owl Feather', desc: 'Tucked inside the hollow tree, as if someone left it for you.', color: '#cfd3dc' },
  { id: 'glowcaps', kind: 'flower', special: true, name: 'Glowcap Mushrooms', desc: 'From Dragon Haven’s hidden glade. A few now glow at home too.', color: '#8fe8d8' },

  // Keys
  { id: 'mossy-key', kind: 'key', name: 'Mossy Key', desc: 'Old, green, and heavier than it looks. It might fit the chest by the Door.', color: '#7fa35a' },

  // Map fragments
  { id: 'map-1', kind: 'map', name: 'Map Fragment I', desc: 'A corner of an old map. It shows Dragon Haven.', color: '#c9a86a' },
  { id: 'map-2', kind: 'map', name: 'Map Fragment II', desc: 'Mountains, and a river winding north.', color: '#c9a86a' },
  { id: 'map-3', kind: 'map', name: 'Map Fragment III', desc: 'A forest drawn in faded green ink.', color: '#c9a86a' },
  { id: 'map-4', kind: 'map', name: 'Map Fragment IV', desc: 'An arch marked with a star, and a path beyond it.', color: '#c9a86a' },

  // Story fragments
  { id: 'story-1', kind: 'story', name: 'Scrap of Old Paper', color: '#e6d3a8', text: '“…when the doors were open, dragons crossed between the realms like birds between trees.”' },
  { id: 'story-2', kind: 'story', name: 'Carved Stone', color: '#e6d3a8', text: '“The Keepers sealed the doors. Not to keep something out, but to keep something safe.”' },
  { id: 'story-3', kind: 'story', name: 'Faded Note', color: '#e6d3a8', text: '“The Haven remembers. Its flowers still hold the Door’s light.”' },
  { id: 'story-4', kind: 'story', name: 'Child’s Drawing', color: '#e6d3a8', text: 'A drawing of a small dragon standing before a glowing arch. Someone wrote “home” underneath.' },
  { id: 'story-5', kind: 'story', name: 'Torn Page', color: '#e6d3a8', text: '“Seven doors. Seven realms. One song to wake them.”' },
  { id: 'story-6', kind: 'story', name: 'Letter Without a Name', color: '#e6d3a8', text: '“The eggs hold more than dragons. They remember where they came from.”' },
  { id: 'story-mural', kind: 'story', special: true, name: 'The Mural in the Ruins', color: '#e6d3a8', text: '“Dragons flew through doors of light, carrying the songs of every realm.” Beneath it, seven symbols in a ring, just like the Ancient Door.' },
  { id: 'story-chest', kind: 'story', special: true, name: 'Keeper’s Note', color: '#e6d3a8', text: '“If you found this, the Door has chosen you. Keep going. Every small step wakes it a little more.”' },
];

export const byId = (id) => CATALOG.find((c) => c.id === id);
export const inHaven = (item) => item.kind === 'flower' || item.kind === 'decoration';
