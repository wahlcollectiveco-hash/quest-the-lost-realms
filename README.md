# Quest: The Lost Realms — V1

- Build 1: welcome, dragon selection, Dragon Haven (3D), Today's Quests, create/edit Quests with steps.
- Build 2: Focus Quest timer, pause/resume, pauses when you leave the app, dragon activities, Quest Complete moment.
- Build 3: reusable Quest templates, Choose My Next Quest, daily energy check-in.
- Build 4: egg warmth and hatching, baby dragons, discoveries (treasures, flowers, decorations, keys, map fragments, story fragments), Hatch & Treasures collection.
- Build 5: Verdant Vale (a second island to fly to and explore, with hidden spots and three rune stones), the Ancient Door's eight symbols, and the Door opening to glimpse the next realm.
- Build 6: Hazel (woodland fox, gives hints), Quill (Dragon Historian in the Vale ruins), Lune (the moth-like wanderer), and Story Moments: the Strange Flower, the Mysterious Egg, the Door Stirs, A Glimpse Beyond.
- Build 7: time of day (dawn, day, dusk, night), gentle generated sound (nature ambience + chimes), Settings (sound, time of day, reduce motion, larger text), a first-time welcome tour, home-screen icon + web manifest.

## Run it

```bash
python3 serve.py
```

Then open http://localhost:5178. Data is saved in the browser on this device.

To preview one dragon activity during a Focus Quest, add it to the address, e.g. `?activity=napping`
(flowers, eating, flying, nest, exploring, reading, treasure, napping).

## Layout

- `js/main.js` — app flow (Welcome → Choose dragon → Dragon Haven)
- `js/state.js` — Quest + dragon data, saved to localStorage
- `js/data/dragons.js` — Pebble, Ember, Moon: colors, personality lines
- `js/world/scene.js` — renderer, camera, tap handling
- `js/world/haven.js` — the island, cottage, Ancient Door, egg nest, water, life
- `js/world/dragon.js` — placeholder dragons (swap for real 3D models later)
- `js/focus.js` — Focus Quest session: timer, pause-on-leave, chime, completion
- `js/world/activities.js` — what the dragon does while you focus
- `js/ui/quests.js` — Today's Quests panel, energy check-in, Choose My Next Quest, Quest detail, Quest/template forms, template manager
- `js/next.js` — how Choose My Next Quest picks (priority, carried over, time you have, energy)
- `js/data/templates.js` — starter templates
- `js/rewards.js` — egg warmth, discovery chances, hatching, the chest
- `js/data/discoveries.js` — everything that can be found, and the story text
- `js/data/creatures.js` — hatchling colors and names
- `js/world/garden.js` — found flowers/decorations appearing in the Haven
- `js/world/hatchlings.js` — baby dragons wandering near the nest
- `js/ui/collection.js` — Hatch & Treasures screen, discovery and hatchling cards
- `js/world/vale.js` — Verdant Vale: forest, ruins, waterfall, bridge, rune stones, hidden spots
- `js/realm.js` — the Door's eight symbols and when each lights; rune stone thresholds
- `js/ui/door.js` — the Ancient Door panel
- `js/story.js` — Story Moments (when they unlock, their scripts) and everything the characters say
- `js/world/npcs.js` — Quill, Hazel and Lune models
- `js/ui/dialogue.js` — conversation box and the Story Moment letterbox
- `js/audio.js` — all sound, generated in code (no audio files)
- `js/ui/settings.js` — Settings panel
- `js/ui/tour.js` — welcome tour
- `icons/`, `manifest.webmanifest` — app icon for installing to a home screen
