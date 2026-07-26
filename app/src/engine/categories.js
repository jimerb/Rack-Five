// The 13 categories, their short row hints and the plain-language help shown
// when a category is selected. Help copy follows the quick-start guide.

export const CATEGORIES = [
  {
    key: 'ones',
    name: 'Ones',
    section: 'upper',
    hint: '3-letter words',
    help: 'Scores 1 point for every rank-1 (3-letter) word in the hand.'
  },
  {
    key: 'twos',
    name: 'Twos',
    section: 'upper',
    hint: '4-letter words',
    help: 'Scores 2 points for every rank-2 (4-letter) word in the hand.'
  },
  {
    key: 'threes',
    name: 'Threes',
    section: 'upper',
    hint: '5-letter words',
    help: 'Scores 3 points for every rank-3 (5-letter) word in the hand.'
  },
  {
    key: 'fours',
    name: 'Fours',
    section: 'upper',
    hint: '6-letter words',
    help: 'Scores 4 points for every rank-4 (6-letter) word in the hand.'
  },
  {
    key: 'fives',
    name: 'Fives',
    section: 'upper',
    hint: '7-letter words',
    help: 'Scores 5 points for every rank-5 (7-letter) word in the hand.'
  },
  {
    key: 'sixes',
    name: 'Sixes',
    section: 'upper',
    hint: '8+ letter words',
    help: 'Scores 6 points for every rank-6 (8-or-more-letter) word in the hand.'
  },
  {
    key: 'threeKind',
    name: 'Three of a Kind',
    section: 'lower',
    hint: '3+ words of one rank',
    help: 'At least three words of the same rank. Scores the sum of all five ranks. Four of a Kind and Rack Five both qualify.'
  },
  {
    key: 'fourKind',
    name: 'Four of a Kind',
    section: 'lower',
    hint: '4+ words of one rank',
    help: 'At least four words of the same rank. Scores the sum of all five ranks. Rack Five qualifies.'
  },
  {
    key: 'fullHouse',
    name: 'Full House',
    section: 'lower',
    hint: 'Two ranks, split 3 and 2',
    help: 'Exactly two distinct ranks in a 3-and-2 split. Scores 25. A Rack Five does not qualify — it has only one distinct rank.'
  },
  {
    key: 'smallStraight',
    name: 'Small Straight',
    section: 'lower',
    hint: '4 consecutive ranks',
    help: 'Four distinct consecutive ranks. Scores 30. The fifth word can be anything, including a duplicate.'
  },
  {
    key: 'largeStraight',
    name: 'Large Straight',
    section: 'lower',
    hint: '5 consecutive ranks',
    help: 'All five ranks distinct and consecutive. Scores 40.'
  },
  {
    key: 'chance',
    name: 'Chance',
    section: 'lower',
    hint: 'Anything',
    help: 'Any hand. Scores the sum of all five ranks. The safety net for a ruined turn.'
  },
  {
    key: 'rackFive',
    name: 'Rack Five',
    section: 'lower',
    hint: 'All 5 words the same rank',
    help: 'All five words share one rank. Scores 10 × that rank, so a rank-6 Rack Five pays 60.'
  }
];

export const UPPER_KEYS = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export function category(key) {
  return CATEGORIES.find((c) => c.key === key) || null;
}

export function categoryName(key) {
  const c = category(key);
  return c ? c.name : '';
}

export function emptyCard() {
  const card = {};
  for (const c of CATEGORIES) card[c.key] = null;
  return card;
}

export function openCategories(card) {
  return CATEGORIES.filter((c) => card[c.key] === null);
}

export function cardComplete(card) {
  return CATEGORIES.every((c) => card[c.key] !== null);
}
