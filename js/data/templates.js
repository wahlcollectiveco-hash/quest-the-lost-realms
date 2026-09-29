// Starter templates from the game bible. Players can edit, delete and add their own.
export const DEFAULT_TEMPLATES = [
  {
    name: 'Etsy Listing', type: 'action', minutes: 60, priority: 'normal',
    steps: ['Create design', 'Create mockups', 'Write title', 'Write description', 'Add tags', 'Pricing', 'Publish'],
  },
  {
    name: 'Deep Clean Kitchen', type: 'focus', minutes: 45, priority: 'normal',
    steps: ['Clear the counters', 'Load the dishwasher', 'Wipe counters', 'Clean the stovetop', 'Scrub the sink', 'Sweep and mop'],
  },
  {
    name: 'Painting Session', type: 'focus', minutes: 60, priority: 'normal',
    steps: ['Set up paints and water', 'Warm-up sketch', 'Paint', 'Clean brushes'],
  },
  {
    name: 'Gym', type: 'action', minutes: 60, priority: 'normal',
    steps: ['Pack gym bag', 'Fill water bottle', 'Warm up', 'Workout', 'Stretch'],
  },
  {
    name: 'Grocery Trip', type: 'action', minutes: 45, priority: 'normal',
    steps: ['Check fridge and pantry', 'Write the list', 'Grab reusable bags', 'Shop', 'Put groceries away'],
  },
  {
    name: 'Weekly Reset', type: 'focus', minutes: 60, priority: 'normal',
    steps: ['Clear the inbox', 'Look over the week’s calendar', 'Tidy the desk', 'Start a load of laundry', 'Pick 3 Quests for the week'],
  },
  {
    name: 'Laundry', type: 'action', minutes: 20, priority: 'low',
    steps: ['Gather clothes', 'Wash', 'Dry', 'Fold', 'Put away'],
  },
  {
    name: 'Work Session', type: 'focus', minutes: 45, priority: 'normal',
    steps: ['Pick one task', 'Close distractions', 'Work', 'Note the next step'],
  },
];
