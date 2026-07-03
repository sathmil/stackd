export const currentUser = {
  id: 'u0',
  username: 'sathmi',
  name: 'Sathmi',
  location: 'San Francisco',
  goal: 'Health-conscious',
  avatar: 'S',
  avatarColor: 'cyan',
  followers: 48,
  following: 61,
  avgScore: 8.1,
}

export const users = [
  { id: 'u1', username: 'jake_lifts', name: 'Jake', avatar: 'JK', avatarColor: 'cyan', location: 'NYC', goal: 'Gym-goer' },
  { id: 'u2', username: 'sarah.runs', name: 'Sarah', avatar: 'SR', avatarColor: 'lav', location: 'Boston', goal: 'Runner' },
  { id: 'u3', username: 'mattfit', name: 'Matt', avatar: 'MT', avatarColor: 'coral', location: 'LA', goal: 'Athlete' },
  { id: 'u4', username: 'priya_health', name: 'Priya', avatar: 'PH', avatarColor: 'warm', location: 'Chicago', goal: 'Wellness' },
]

export const products = [
  {
    id: 'p1',
    name: 'Ghost Energy',
    variant: 'Blue Raspberry',
    brand: 'Ghost',
    category: 'Energy Drink',
    tags: ['200mg caffeine', '0 sugar'],
    overallScore: 8.3,
    ratingsCount: 1204,
    scores: { taste: 8.8, effectiveness: 8.2, ingredients: 7.5, value: 7.9 },
    icon: '⚡',
  },
  {
    id: 'p2',
    name: 'Rxbar',
    variant: 'Chocolate Sea Salt',
    brand: 'Rxbar',
    category: 'Protein Bar',
    tags: ['12g protein', 'no added sugar'],
    overallScore: 7.9,
    ratingsCount: 892,
    scores: { taste: 8.1, effectiveness: 7.4, ingredients: 8.6, value: 7.5 },
    icon: '🥩',
  },
  {
    id: 'p3',
    name: 'Celsius',
    variant: 'Sparkling Orange',
    brand: 'Celsius',
    category: 'Energy Drink',
    tags: ['200mg caffeine', 'no sugar'],
    overallScore: 8.7,
    ratingsCount: 892,
    scores: { taste: 9.1, effectiveness: 8.4, ingredients: 8.0, value: 8.3 },
    icon: '🧃',
  },
  {
    id: 'p4',
    name: 'Gold Standard Whey',
    variant: 'Double Rich Chocolate',
    brand: 'Optimum Nutrition',
    category: 'Protein Powder',
    tags: ['24g protein', 'low carb'],
    overallScore: 8.1,
    ratingsCount: 2401,
    scores: { taste: 7.8, effectiveness: 8.5, ingredients: 7.9, value: 8.2 },
    icon: '🥛',
  },
  {
    id: 'p5',
    name: 'AG1 Athletic Greens',
    variant: 'Original',
    brand: 'AG1',
    category: 'Greens Powder',
    tags: ['75 vitamins', 'probiotics'],
    overallScore: 6.2,
    ratingsCount: 1102,
    scores: { taste: 5.4, effectiveness: 6.8, ingredients: 8.1, value: 4.5 },
    icon: '🌿',
  },
  {
    id: 'p6',
    name: 'Creatine Monohydrate',
    variant: 'Unflavored',
    brand: 'Thorne',
    category: 'Supplement',
    tags: ['5g creatine', 'NSF certified'],
    overallScore: 9.1,
    ratingsCount: 3201,
    scores: { taste: 8.5, effectiveness: 9.6, ingredients: 9.4, value: 8.9 },
    icon: '💊',
  },
]

export const reviews = [
  {
    id: 'r1',
    userId: 'u1',
    productId: 'p1',
    overallScore: 8.4,
    scores: { taste: 9.0, effectiveness: 8.0, ingredients: 7.5, value: 8.0 },
    text: "Best flavor I've tried. Clean energy, no crash at all.",
    tags: ['Great taste', 'No crash'],
    createdAt: '2m ago',
    likes: 12,
  },
  {
    id: 'r2',
    userId: 'u2',
    productId: 'p1',
    overallScore: 8.1,
    scores: { taste: 8.5, effectiveness: 8.0, ingredients: 7.5, value: 8.0 },
    text: 'Really solid pre-workout alternative. Love the flavor.',
    tags: ['Great taste'],
    createdAt: '1h ago',
    likes: 5,
  },
  {
    id: 'r3',
    userId: 'u3',
    productId: 'p1',
    overallScore: 8.0,
    scores: { taste: 8.0, effectiveness: 8.5, ingredients: 7.0, value: 7.5 },
    text: 'Decent energy boost but a little pricey for what you get.',
    tags: ['Overpriced'],
    createdAt: '3h ago',
    likes: 3,
  },
  {
    id: 'r4',
    userId: 'u2',
    productId: 'p2',
    overallScore: 7.9,
    scores: { taste: 8.1, effectiveness: 7.4, ingredients: 8.6, value: 7.5 },
    text: "Love the clean ingredients. Taste is great once you're used to it.",
    tags: ['Clean label'],
    createdAt: '14m ago',
    likes: 5,
  },
  {
    id: 'r5',
    userId: 'u3',
    productId: 'p5',
    overallScore: 6.2,
    scores: { taste: 5.4, effectiveness: 6.8, ingredients: 8.1, value: 4.5 },
    text: 'Way too expensive for what it is. Taste is hard to get used to.',
    tags: ['Overpriced'],
    createdAt: '1h ago',
    likes: 31,
  },
]

export const feedItems = [
  { id: 'f1', userId: 'u1', action: 'rated a product', productId: 'p1', reviewId: 'r1', createdAt: '2m ago' },
  { id: 'f2', userId: 'u2', action: 'added to her stack', productId: 'p2', reviewId: 'r4', createdAt: '14m ago' },
  { id: 'f3', userId: 'u3', action: 'rated a product', productId: 'p5', reviewId: 'r5', createdAt: '1h ago' },
  { id: 'f4', userId: 'u4', action: 'rated a product', productId: 'p3', reviewId: null, createdAt: '2h ago' },
  { id: 'f5', userId: 'u1', action: 'rated a product', productId: 'p6', reviewId: null, createdAt: '3h ago' },
]

export const influencerPicks = {
  p1: { name: 'Chris Bumstead', score: 8.6 },
  p6: { name: 'Jeff Nippard', score: 9.3 },
  p3: { name: 'Ashton Hall', score: 8.9 },
}

export const DIM_COLOR = {
  taste: '#ff6b6b',
  effectiveness: '#5ecfcf',
  ingredients: '#a78bfa',
  value: '#e8c97a',
}

export const AVATAR_STYLE = {
  coral: { background: '#2a1010', color: '#ff6b6b' },
  cyan: { background: '#0d2020', color: '#5ecfcf' },
  lav: { background: '#1a1525', color: '#a78bfa' },
  warm: { background: '#252010', color: '#e8c97a' },
}

export const CATEGORIES = ['All', 'Energy', 'Protein', 'Supps', 'Greens', 'Snacks']
export const QUICK_TAGS = ['Great taste', 'No crash', 'Clean label', 'Overpriced', 'Effective', 'Good value', 'Chalky', 'Too sweet']
export const TRIED_IDS = ['p1', 'p2', 'p3', 'p4']
export const USER_SCORES = { p1: 8.4, p2: 7.9, p3: 9.1, p4: 8.0 }
