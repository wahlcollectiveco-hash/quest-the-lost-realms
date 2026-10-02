// What your dragon thinks, asks and gets up to when you tap them.
// Everything is written per dragon, so each one sounds like themself.
// `{a}` in a reply is replaced with whatever you typed.

// Little scenes the dragon acts out (see world/activities.js for the acting).
// `haven: true` scenes only happen in the Haven.
export const SCENES = {
  pebble: [
    { id: 'butterfly', w: 3 },
    { id: 'crown', w: 3 },
    { id: 'sneeze', w: 2 },
    { id: 'beetle', w: 2 },
    { id: 'showoff', w: 1 },
  ],
  ember: [
    { id: 'campfire', w: 3 },
    { id: 'chest', w: 2, haven: true },
    { id: 'patrol', w: 2 },
    { id: 'stretch', w: 2 },
    { id: 'showoff', w: 1 },
  ],
  moon: [
    { id: 'bed', w: 3 },
    { id: 'clouds', w: 2 },
    { id: 'starbook', w: 2 },
    { id: 'hum', w: 2 },
    { id: 'door', w: 1, haven: true },
    { id: 'showoff', w: 1 },
  ],
};

export const SHOWOFF = {
  pebble: 'Watch! I can make flowers grow.',
  ember: 'Stand back. Fire breath!',
  moon: 'Shh… watch the starlight.',
};

// Short thoughts: a bit of encouragement, a bit of nonsense.
export const QUIPS = {
  pebble: [
    'You don’t have to do it all. Just the next little bit.',
    'I found a rock shaped like a smaller rock. Best day ever.',
    'Slow is still moving. Ask any snail. I did.',
    'I believe in you. Also in worms. But mostly you.',
    'If today is messy, we can call it a garden.',
    'Did you drink some water? I’m having some dew.',
  ],
  ember: [
    'You’re braver than you think. I can tell. I’m an expert.',
    'Every big adventure starts with one small, slightly annoying step.',
    'I tried to roar at my to-do list. It did not help. Doing one thing did.',
    'Two minutes. You can do anything for two minutes. Go!',
    'I bet you could finish one tiny thing before I finish this nap. I’m not napping. That was a trick.',
    'Done is better than perfect. I once ate a half-toasted marshmallow. Still great.',
  ],
  moon: [
    'The moon doesn’t rush, and she still gets across the whole sky.',
    'Rest counts. I checked with the stars.',
    'You’ve done hard things before. This one is just the newest.',
    'I was thinking about nothing. It was lovely. You should try it later.',
    'One small thing, done gently, is still done.',
    'It’s all right to start badly. Most constellations did.',
  ],
};

// A nudge toward a real Quest. `{q}` is the Quest (or its next step).
export const NUDGES = {
  pebble: ['I’m feeling curious. Want to go do “{q}”? I’ll watch the egg.', 'Ooh, what about “{q}”? Then come tell me how it went!'],
  ember: ['I’m feeling adventurous! Let’s go do “{q}”!', 'Quest time? I vote “{q}”. I’ll guard the Haven.'],
  moon: ['The stars say it’s a good moment for “{q}”. Shall we?', 'I had a dream you finished “{q}”. It was a nice dream.'],
};
export const NUDGE_STEP = 'Just the first bit: “{q}”. That’s all.';
export const NO_QUESTS = {
  pebble: 'There’s nothing on your list. Want to add one tiny thing?',
  ember: 'No Quests?! Let’s find an adventure. Even a small one.',
  moon: 'Your list is empty. Is there one small thing on your mind?',
};
export const GO_LINES = {
  pebble: 'Yay! Go, go. I’ll be right here when you get back.',
  ember: 'Yes! Go get it. I’ll be right here.',
  moon: 'Go gently. I’ll keep your place.',
};
export const LATER_LINES = {
  pebble: 'That’s okay. Later is a real time too.',
  ember: 'No problem. Adventures keep.',
  moon: 'No hurry. It will wait.',
};

// Questions you can type an answer to. Replies are picked by what you typed:
// `num` if it has a number in it, `short` for a word or two, otherwise `any`.
const SHARED_QUESTIONS = [
  {
    q: 'Do you know how fast dragons can fly?',
    num: '{a}?! Close. I once raced a cloud and won. Barely.',
    any: 'Ha! The real answer is: faster when there are snacks.',
  },
  {
    q: 'What’s one tiny thing that went well today?',
    any: '“{a}.” I’m keeping that one in my treasure pile.',
  },
  {
    q: 'If the Ancient Door opened to anywhere, where should it go?',
    any: '{a}… I’d follow you there.',
  },
  {
    q: 'What are you putting off right now? You can whisper.',
    any: 'Mm. What if we did just the first two minutes of it? I’ll count.',
  },
];
export const QUESTIONS = {
  pebble: [
    ...SHARED_QUESTIONS,
    { q: 'I found a snail. What should I name her?', any: '{a} the snail! She says thank you. Slowly.' },
    { q: 'What’s your favorite flower? I’ll try to grow one.', any: '{a}! I’ll look for seeds. No promises, but I’ll look.' },
    { q: 'What’s the best snack in your world?', any: '{a}? Does it grow on trees? I hope it grows on trees.' },
  ],
  ember: [
    ...SHARED_QUESTIONS,
    { q: 'What’s the bravest thing you did this week?', any: 'That counts. That absolutely counts.' },
    { q: 'If we found a treasure chest, what would you want inside?', any: '{a}! Good. I was going to say gold, but yours is better.' },
    { q: 'Quick: what should my battle cry be?', any: '“{a}!” …I love it. I’m using it.' },
  ],
  moon: [
    ...SHARED_QUESTIONS,
    { q: 'That cloud needs a name. What should I call it?', any: '{a} the cloud. She likes it. She told me.' },
    { q: 'What did you dream about last? I collect dreams.', any: 'Oh, that’s a good one. I’ll keep it somewhere safe.' },
    { q: 'What’s something quiet that makes you happy?', any: '{a}. Mmm. Me too, now.' },
  ],
};

// Little favors. Tap the button to help; the dragon acts it out and says thanks.
export const FAVORS = {
  pebble: [
    { ask: 'Ow. I have a thorn stuck in my foot. Can you help me get it out?', btn: 'Pull it out', thanks: 'All better! Thank you. You’re very gentle.' },
    { ask: 'There’s a leaf stuck on my horn and I can’t reach it.', btn: 'Pick it off', thanks: 'Thank you! I’m keeping the leaf, though.' },
  ],
  ember: [
    { ask: 'I’ve got an itch right between my wings. I can’t reach!', btn: 'Scratch it', thanks: 'Ahhh. Right there. You’re the best.' },
    { ask: 'Ow. Thorn in my foot. I’m being very brave about it. Help?', btn: 'Pull it out', thanks: 'Didn’t even hurt. Okay, it hurt a little. Thanks.' },
  ],
  moon: [
    { ask: 'A little star got tangled in my tail. Could you untangle it?', btn: 'Untangle it', thanks: 'There it goes. Thank you. It says thank you too.' },
    { ask: 'I have a thorn in my foot. It’s rather distracting.', btn: 'Pull it out', thanks: 'Much better. That was kind of you.' },
  ],
};

// Things worth pointing out, when they apply.
export const HINTS = {
  eggReady: 'The egg is wiggling! I think it’s ready. Tap it!',
  chestKey: 'We found the Mossy Key! Let’s open the old chest by the Door. Tap it!',
};

// Said when tapped during a Focus Quest (no scene; the dragon is busy too).
export const FOCUS_LINES = {
  pebble: ['I’m right here. Keep going!', 'You’re doing it! I’m doing my thing too.'],
  ember: ['Eyes on your Quest! I’ve got the Haven.', 'You’re crushing it. Back to work!'],
  moon: ['Shh. We’re both concentrating.', 'I’m here. Keep going, softly.'],
};

// Tapped while already in the middle of a scene.
export const BUSY_LINES = {
  pebble: ['One sec!', 'Almost done!'],
  ember: ['Hang on, hang on.', 'Watch, watch!'],
  moon: ['One moment…', 'Nearly there.'],
};

// ---- Conversations between your dragon and the side characters ----
// Each is a short back-and-forth: ['them' | 'you' (your dragon), text].
export const HAZEL_BANTER = {
  pebble: [
    [['them', 'Pebble! I found the softest patch of moss by the stream.'], ['you', 'Softer than the last softest patch?'], ['them', 'So much softer.'], ['you', 'Show me after one more Quest!']],
    [['you', 'Hazel, do you know any beetles named Gerald?'], ['them', 'I know three.'], ['you', '…I need to sit down.']],
  ],
  ember: [
    [['them', 'Race you to the pond?'], ['you', 'I’ll win. I have wings.'], ['them', 'I have a head start.'], ['you', 'Hey!']],
    [['you', 'Hazel, I lit a campfire all by myself.'], ['them', 'On the first try?'], ['you', '…on a try.']],
  ],
  moon: [
    [['them', 'Moon, what are you looking at?'], ['you', 'A star that only comes out in the daytime.'], ['them', 'I don’t see it.'], ['you', 'It’s shy.']],
    [['them', 'Do foxes have constellations?'], ['you', 'Two. One is asleep.'], ['them', 'That sounds right.']],
  ],
};
export const HAZEL_TRICK = {
  pebble: 'Again! Again!',
  ember: 'Pfft. I can do that. Probably.',
  moon: 'Lovely. Very round.',
};
export const QUILL_BANTER = {
  pebble: [[['them', 'Careful near those scrolls, little one.'], ['you', 'I was only smelling them.'], ['them', 'And?'], ['you', 'They smell like rain and old cheese.']]],
  ember: [[['you', 'Quill, were you ever a fast flier?'], ['them', 'The fastest. Then I discovered books.'], ['you', 'Tragic.'], ['them', 'Quite the opposite.']]],
  moon: [[['them', 'You read the stars, young Moon?'], ['you', 'I listen. They’re bad at spelling.'], ['them', 'Ha! They always were.']]],
};
