// The three starter dragons. Colors and build proportions feed the procedural
// placeholder model in world/dragon.js; swap in real models later by id.

export const DRAGON_ORDER = ['pebble', 'ember', 'moon'];

export const DRAGONS = {
  pebble: {
    id: 'pebble',
    name: 'Pebble',
    trait: 'Curious · Gentle · Playful',
    blurb: 'Loves flowers, bugs, hidden paths and tiny treasures.',
    swatch: ['#7ea45a', '#eadcac', '#d8b25e'],
    scale: 1,
    colors: { body: 0x7ea45a, belly: 0xeadcac, accent: 0xd8b25e, wing: 0xa9c985, eye: 0x2c2216 },
    build: { round: 1.1, wing: 0.9, tail: 1, horn: 'nub', frill: true, flower: true },
    lines: {
      select: 'Pebble tilts her head and blinks at you.',
      greet: ['Pebble peeks out from the flowers, happy to see you.'],
      tap: [
        'Pebble sniffs a flower and sneezes.',
        'Pebble shows you a shiny little beetle.',
        'Pebble wiggles happily.',
        'Pebble is watching a butterfly very closely.',
      ],
      complete: [
        'Pebble does a happy little hop!',
        'Pebble tucks a clover behind her horn to celebrate.',
        'Pebble purrs like a warm kettle.',
      ],
    },
  },
  ember: {
    id: 'ember',
    name: 'Ember',
    trait: 'Bold · Energetic · Adventurous',
    blurb: 'Loves exploring, climbing and treasure chests.',
    swatch: ['#d9773a', '#f2dfb9', '#9a4a2a'],
    scale: 1,
    colors: { body: 0xd9773a, belly: 0xf2dfb9, accent: 0xe8b64f, wing: 0x9a4a2a, eye: 0x2a1a12 },
    build: { round: 1, wing: 1.15, tail: 1.05, horn: 'swept' },
    lines: {
      select: 'Ember puffs out his chest and grins.',
      greet: ['Ember bounds over, ready for adventure.'],
      tap: [
        'Ember puffs a tiny, warm spark.',
        'Ember wants to go exploring!',
        'Ember stretches his wings proudly.',
        'Ember is eyeing that old chest…',
      ],
      complete: [
        'Ember lets out a small, proud roar!',
        'Ember flaps his wings, delighted.',
        'Ember glows with pride.',
      ],
    },
  },
  moon: {
    id: 'moon',
    name: 'Moon',
    trait: 'Dreamy · Calm · Mysterious',
    blurb: 'Loves books, stars, crystals and quiet gardens.',
    swatch: ['#dfe5f1', '#b7a6e3', '#c6d1ee'],
    scale: 0.84,
    colors: { body: 0xdfe5f1, belly: 0xf6f3fb, accent: 0xb7a6e3, wing: 0xc6d1ee, eye: 0x33386a },
    build: { round: 0.92, wing: 1.05, tail: 1.25, horn: 'thin', crystal: true },
    lines: {
      select: 'Moon gives a slow, dreamy blink.',
      greet: ['Moon blinks awake and drifts a little closer.'],
      tap: [
        'Moon blinks sleepily at you.',
        'Moon is counting the clouds.',
        'Moon curls her tail and hums.',
        'Moon glances at the Ancient Door, thoughtful.',
      ],
      complete: [
        'Moon’s scales shimmer softly.',
        'Moon gives a sleepy, pleased little chirp.',
        'Moon traces a star in the air with her tail.',
      ],
    },
  },
};

export const pickLine = (list) => list[Math.floor(Math.random() * list.length)];
