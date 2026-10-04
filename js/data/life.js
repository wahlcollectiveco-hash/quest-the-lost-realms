// Life in the Haven: treats, visitors who move in, how your dragon is
// feeling today, and the stories Quill tells about symbols and treasures.

// ---- Treats (earned by finishing Quests, fed from the feelings button) ----
export const TREATS = [
  { id: 'berries', name: 'Wild Berries', icon: '🫐', color: '#5b6fc9', desc: 'A handful, still cool from the morning.' },
  { id: 'honey-cake', name: 'Honey Cake', icon: '🍯', color: '#e7b04a', desc: 'Sticky, golden and very soft.' },
  { id: 'starfruit', name: 'Starfruit', icon: '⭐', color: '#f2d45c', desc: 'It glows a little in the dark.' },
  { id: 'sweet-pepper', name: 'Fire Pepper', icon: '🌶️', color: '#e0523a', desc: 'Far too spicy for anyone but a dragon.' },
  { id: 'sun-cookie', name: 'Sun Cookie', icon: '🍪', color: '#d9a24e', desc: 'Baked on a warm rock at noon.' },
  { id: 'cloud-bun', name: 'Cloud Bun', icon: '☁️', color: '#eef0fb', desc: 'So light it nearly floats away.' },
];
export const APPLE = { id: 'apple', name: 'Apple from the tree', icon: '🍎', color: '#d2453a', desc: 'There are always more.' };
export const FAVORITE_TREAT = { pebble: 'berries', ember: 'sweet-pepper', moon: 'starfruit' };
export const treatById = (id) => (id === 'apple' ? APPLE : TREATS.find((t) => t.id === id));

// ---- Visitors who come to live in the Haven ----
// home: where they like to be. kind: how they move about.
export const VISITORS = [
  { id: 'hedgehog', icon: '🦔', name: 'Thistle', species: 'hedgehog', home: [3.0, 5.4], kind: 'walk',
    hello: 'Oh! Hello. Is this a good place for a hedgehog? It looks like a good place for a hedgehog.',
    lines: ['Thistle is snuffling for beetles.', 'Thistle curls into a ball, then peeks out.', 'Thistle found a very nice leaf.'] },
  { id: 'bunny', icon: '🐰', name: 'Biscuit', species: 'bunny', home: [-2.2, 7.4], kind: 'hop',
    hello: 'Hi hi hi! I heard there was clover here. Can I stay?',
    lines: ['Biscuit wiggles her nose at you.', 'Biscuit does a little sideways hop.', 'Biscuit is munching clover, very seriously.'] },
  { id: 'frog', icon: '🐸', name: 'Pondsworth', species: 'frog', home: [4.0, 3.6], kind: 'hop',
    hello: 'Ribbit. Splendid pond. I shall take it.',
    lines: ['Pondsworth says “ribbit,” with feeling.', 'Pondsworth is very still. Then: hop!', 'Pondsworth is admiring his reflection.'] },
  { id: 'duck', icon: '🐥', name: 'Dot', species: 'duckling', home: [5.2, 1.4], kind: 'swim',
    hello: 'Peep! Peep peep! (That means hello.)',
    lines: ['Dot paddles in a small, happy circle.', 'Dot dips her head under the water. Bubbles!', 'Dot peeps at you twice.'] },
  { id: 'snail', icon: '🐌', name: 'Sir Slowly', species: 'snail', home: [-1.6, -3.4], kind: 'slow',
    hello: 'Good day. I have been travelling here for… some time.',
    lines: ['Sir Slowly is on his way somewhere. Eventually.', 'Sir Slowly tips his shell to you.', 'Sir Slowly has made it nearly a whole step.'] },
  { id: 'squirrel', icon: '🐿️', name: 'Acorn', species: 'squirrel', home: [6.4, -3.0], kind: 'hop',
    hello: 'Is that a tree? Are those nuts? I live here now!',
    lines: ['Acorn is burying something. Don’t tell anyone.', 'Acorn flicks his tail at you.', 'Acorn chitters about the weather.'] },
];
export const visitorById = (id) => VISITORS.find((v) => v.id === id);

// ---- How your dragon is feeling today ----
// `want` is the care action that makes them happiest today.
export const FEELINGS = {
  hungry: { icon: '🍓', label: 'Hungry', want: 'feed',
    say: { pebble: 'My tummy’s rumbling. Is there a snack?', ember: 'I could eat a whole pepper bush. Two bushes.', moon: 'I’m a little peckish. Something sweet, maybe?' } },
  sleepy: { icon: '😴', label: 'Sleepy', want: 'nap',
    say: { pebble: 'I’m so sleepy… maybe a tiny nap?', ember: 'I’m not tired. *yawn* Okay, maybe a little.', moon: 'Today feels like a nap kind of day.' } },
  adventurous: { icon: '🧭', label: 'Adventurous', want: 'explore',
    say: { pebble: 'I want to explore! Let’s find something new.', ember: 'Adventure! I need an adventure!', moon: 'I feel like wandering somewhere new today.' } },
  splashy: { icon: '💧', label: 'Splashy', want: 'swim',
    say: { pebble: 'The pond looks so nice. Can I go for a swim?', ember: 'Cannonball! …Can I? Into the pond?', moon: 'I’d love a slow, floaty swim.' } },
  playful: { icon: '🦋', label: 'Playful', want: 'play',
    say: { pebble: 'Let’s play! Anything! Everything!', ember: 'I’ve got so much energy. Play with me!', moon: 'I feel a little bit silly today.' } },
  cuddly: { icon: '💛', label: 'Cuddly', want: 'pet',
    say: { pebble: 'Could I have a scratch behind the ears?', ember: 'I don’t need a hug. But if you were giving one…', moon: 'I’d like to sit close to you for a while.' } },
};
export const HAPPY = { icon: '😊', label: 'Happy' };

export const CARE_ACTIONS = [
  { id: 'feed', label: 'Feed', icon: '🍎' },
  { id: 'pet', label: 'Pet', icon: '💛' },
  { id: 'play', label: 'Play', icon: '🦋' },
  { id: 'nap', label: 'Nap', icon: '😴' },
  { id: 'swim', label: 'Swim', icon: '💧' },
  { id: 'explore', label: 'Explore', icon: '🧭' },
];

// ---- What a star hatchling remembers from inside the shell ----
export const STAR_MEMORIES = [
  'I remember… it was dark, but not scary. There were tiny lights all around me.',
  'Someone was humming. A long, slow song, over and over.',
  'Sometimes the lights drifted past, like slow snow.',
  'It was cold outside the shell, I think. But I was warm.',
  'I remember a big round door, far away, all lit up.',
];

// ---- Quill's stories ----
// One story for each symbol on the Ancient Door, told once it lights up,
// in the order the symbols wake.
export const RUNE_STORIES = [
  ['The first symbol is called The First Step. It is always the first to wake.', 'The Keepers believed every door opens the same way: someone decides to begin. Not finish. Just begin.', 'You began. That is why it glows.'],
  ['The Vale Remembers. This one wakes when a dragon returns to Verdant Vale.', 'Long ago, the Vale was the first stop for every traveller through the Door. Its flowers kept their light even after the doors closed.', 'When you visit, the Vale remembers what it was for.'],
  ['The Stone of Roots. Roots hold a tree up through every storm.', 'The Keepers carved it for small, steady things. Water, rest, a tidy corner. The things nobody sees.', 'It woke because you kept going. Roots grow quietly.'],
  ['A Friend’s Warmth. This symbol wakes when an egg hatches.', 'The old dragons said the Door would only open for someone who looks after others.', 'Your little one is proof. The Door saw.'],
  ['The Stone of Water. Water always finds a way around the rock.', 'This symbol is for the days that don’t go to plan, and for carrying on anyway, a different way.', 'You have had a few of those days, I think. And here you are.'],
  ['The Stone of Sky. The last of the three stones, and the hardest to wake.', 'The sky is what you see when you finally look up from the path.', 'Twenty Quests is a long way. Look how far you’ve come.'],
  ['The Keeper’s Promise. It wakes when the old chest by the Door is opened.', 'The last Keeper left that chest, and a promise: whoever opened it would be trusted with the Door.', 'You opened it. So the promise is yours now.'],
  ['The Old Map. The final symbol.', 'The map shows a path beyond the Door, to a realm of twilight. It was torn in four so no one could follow it alone.', 'You found every piece. The path is open. Go and look, when you are ready.'],
];

// What Quill knows about each treasure.
export const TREASURE_STORIES = {
  sunstone: ['A Sunstone! Sunstones form where dragons nap in the sun for a hundred years.', 'They keep the warmth forever. Hold it on a cold day.'],
  'silver-coin': ['A dragon on one side, a door on the other. The Keepers paid travellers with these.', 'Not for anything they bought. Just for coming back safely.'],
  'golden-acorn': ['Ah, a Golden Acorn. The squirrels of the old realms buried them for luck.', 'They always forgot where. That is how the golden oaks grew.'],
  'galaxy-marble': ['A Galaxy Marble. Look closely. Those are real stars, very small and very far away.', 'Young dragons used them to learn the night sky. Some say each one holds a realm we haven’t found yet.'],
  'bronze-bell': ['A dragon bell! Only dragons can hear it ring.', 'In the old days, a dragon far from home would ring it, and every dragon who heard would ring theirs back. So no one was ever really alone.'],
  'dawn-feather': ['A Dawn Feather, from the dawn birds of the eastern realm.', 'They only sing at sunrise, and only for people who got up anyway. Even when it was hard.'],
  'moon-shell': ['A Moonlit Shell. The sea you hear inside is a real one, in a realm behind one of the seven doors.', 'Someday, perhaps, you’ll hear it for yourself.'],
  'wooden-fox': ['A carved fox. Worn smooth by many hands.', 'Every Keeper’s apprentice carved one, for the foxes who guided travellers between the realms. Clever creatures, foxes. They always knew the way home.'],
  'keepers-compass': ['The Keeper’s Compass. It doesn’t point north. It points to whatever you need most.', 'For now, that seems to be the Door. Interesting.'],
  'vale-crystal': ['A grotto crystal. They hum when the Door is near waking.', 'The waterfall hid them for centuries. It seems it decided you could be trusted.'],
  'owl-feather': ['A silver owl feather. The owls of the hollow tree are Dragon Haven’s oldest residents.', 'They leave a feather for travellers they like. It is a very rare thing.'],
};
