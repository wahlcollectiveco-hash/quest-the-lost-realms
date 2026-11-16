// New dragons you can meet in the realms. One turns up now and then as a
// reward for finishing a Quest. Each has a little story and a trick.
export const NEWCOMERS = [
  {
    id: 'nova', realm: 'stars', name: 'Nova', voice: 'nova', spot: [7.2, 4.6], scale: 0.8, trick: 'loop',
    colors: { body: 0xf2b84a, belly: 0xfff0c8, accent: 0xff7a5a, wing: 0xffd98a, eye: 0x3a2410 },
    build: { round: 0.95, wing: 1.25, tail: 1.1, horn: 'swept' },
    arrive: 'A fast little dragon has been seen racing shooting stars in the Realm of Stars.',
    meet: [
      'Whoa! Did you see that? I nearly caught it!',
      'I’m Nova. I race shooting stars. I haven’t won yet, but I’m getting faster.',
      'Want to see my best move? Watch this!',
    ],
    after: 'I’ve been practising that for a hundred nights. Come back and I’ll show you again!',
    again: ['Watch this!', 'One day I’ll catch a shooting star. You’ll see.'],
  },
  {
    id: 'orin', realm: 'stars', name: 'Orin', voice: 'orin', spot: [-8.2, 5.2], scale: 1.2, trick: 'starburst', vignette: 'lanterns',
    colors: { body: 0x6a6f9c, belly: 0xdcdcf0, accent: 0xe8e0ff, wing: 0x8a8fc0, eye: 0x1a1a30 },
    build: { round: 1.2, wing: 0.9, tail: 1.2, horn: 'thin', crystal: true },
    arrive: 'An old dragon who knows every star by name has come to the Realm of Stars.',
    meet: [
      'Ah, good evening. I am Orin. I have counted every star in this sky. Twice.',
      'Do you know why the stars are here? Let me show you.',
    ],
    after: 'So every star you light helps someone find their way. Remember that.',
    again: ['Each star has a name. That one is called “Almost There.”', 'I counted them again. Still lovely.'],
  },
  {
    id: 'bubbles', realm: 'sea', name: 'Bubbles', voice: 'bubbles', spot: [-5.6, 6.2], scale: 0.7, trick: 'rings',
    colors: { body: 0xff9aa8, belly: 0xfff0e8, accent: 0xffd86b, wing: 0xffc0c8, eye: 0x3a1a24 },
    build: { round: 1.15, wing: 0.8, tail: 0.9, horn: 'nub', frill: true },
    arrive: 'A giggly young sea dragon has been seen blowing bubbles in the Realm of Tides.',
    meet: [
      'Hi hi hi! I’m Bubbles! Guess what I’m good at.',
      'Bubbles! I can blow rings. Big ones. Watch!',
    ],
    after: 'The trick is to laugh while you do it. That’s the whole trick.',
    again: ['Ring time!', 'I made one so big a fish swam through it.'],
  },
  {
    id: 'tide', realm: 'sea', name: 'Old Tide', voice: 'tide', spot: [-6.4, -3.0], scale: 1.45, trick: 'pulse', vignette: 'sunken-door',
    colors: { body: 0x2f6a7a, belly: 0xc8e0d8, accent: 0x9fe0d0, wing: 0x4a8a94, eye: 0x0a2028 },
    build: { round: 1.3, wing: 0.8, tail: 1.3, horn: 'swept' },
    arrive: 'A very old sea dragon has woken up near the stone arch in the Realm of Tides.',
    meet: [
      'Hmm? Oh. A visitor. It has been a long time.',
      'They call me Old Tide. I have been asleep beside this arch since before the doors closed.',
      'Do you know what this arch is? Come closer. I will tell you.',
    ],
    after: 'The sea does not forget. One day this door will open again. Maybe you will be the one to open it.',
    again: ['The sea is patient. So am I.', 'I was dreaming about the old days. Good dreams.'],
  },
];
export const newcomerById = (id) => NEWCOMERS.find((n) => n.id === id);
