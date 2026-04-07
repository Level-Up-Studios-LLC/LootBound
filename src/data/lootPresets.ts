export interface LootPreset {
  name: string;
  icon: string;
  cost: number;
}

export const LOOT_PRESETS: LootPreset[] = [
  { name: 'Buy a toy', icon: '\u{1F9F8}', cost: 200 },
  { name: 'Ice cream', icon: '\u{1F366}', cost: 50 },
  { name: 'Day-off chores', icon: '\u{1F3E0}', cost: 300 },
  { name: 'Money', icon: '\u{1F4B5}', cost: 250 },
  { name: 'Pizza', icon: '\u{1F355}', cost: 100 },
  { name: 'Play games', icon: '\u{1F3AE}', cost: 80 },
  { name: 'Watch a movie', icon: '\u{1F37F}', cost: 75 },
  { name: 'Buy a book', icon: '\u{1F4DA}', cost: 100 },
  { name: 'Buy clothes', icon: '\u{1F455}', cost: 200 },
  { name: 'Extra screen time', icon: '\u{1F4F1}', cost: 60 },
  { name: 'Go on a trip', icon: '\u{1F697}', cost: 500 },
  { name: 'Camp out', icon: '\u{26FA}', cost: 400 },
  { name: 'Stay up late', icon: '\u{1F319}', cost: 150 },
  { name: "Pick dinner menu", icon: '\u{1F37D}', cost: 100 },
];
