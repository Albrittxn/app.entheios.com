// Deterministic 30k-lead generator. The output is computed from a fixed seed
// so refreshing the Leads page shows the same dataset every time, but each
// lead has realistic-looking variety (name / state / brokerage / phone /
// email / added timestamp).
//
// All math is pure — no I/O — so this is fast enough to run on every page
// mount (~80-150ms in-browser for 30k leads).

import type { Lead } from "./types";

const FIRST_NAMES = [
  "Aisha", "Aiden", "Alex", "Alyssa", "Amelia", "Andre", "Angela", "Anthony",
  "April", "Aria", "Asher", "Austin", "Ava", "Avery", "Bailey", "Beau",
  "Bella", "Ben", "Bianca", "Blake", "Brandon", "Brooke", "Bryce", "Cade",
  "Caleb", "Cameron", "Carlos", "Caroline", "Carter", "Casey", "Chad",
  "Charles", "Charlotte", "Chase", "Chloe", "Christian", "Claire", "Cole",
  "Connor", "Cora", "Damian", "Daniel", "Dante", "David", "Deja", "Derek",
  "Devon", "Diana", "Diego", "Dylan", "Eden", "Eli", "Elias", "Elijah",
  "Elise", "Emery", "Emily", "Emma", "Ethan", "Eva", "Evan", "Faith",
  "Felicia", "Felix", "Fiona", "Gabriel", "Garrett", "Gianna", "Grace",
  "Hadley", "Hannah", "Harper", "Hayden", "Holly", "Hudson", "Hunter", "Ian",
  "Imani", "Isaac", "Isabel", "Isaiah", "Jack", "Jackson", "Jacob", "Jade",
  "Jamal", "James", "Jane", "Janet", "Jasmine", "Jason", "Jayden", "Jenna",
  "Jeremy", "Jessica", "Jesus", "Jocelyn", "Jordan", "Jose", "Joseph",
  "Josh", "Julia", "Justin", "Kaden", "Kai", "Karen", "Kate", "Katie",
  "Kayla", "Keegan", "Keith", "Kelly", "Kelsey", "Kendall", "Kennedy",
  "Kevin", "Khalil", "Kim", "Kyle", "Lana", "Lara", "Laura", "Layla",
  "Leah", "Leo", "Leon", "Levi", "Liam", "Lila", "Lily", "Lincoln",
  "Logan", "Lola", "Lucas", "Lucia", "Luna", "Maddox", "Madeline", "Malik",
  "Marco", "Maria", "Mariah", "Mark", "Mason", "Matt", "Maya", "Megan",
  "Mia", "Michael", "Mila", "Miles", "Miranda", "Molly", "Morgan", "Naomi",
  "Natalie", "Nathan", "Nia", "Nicholas", "Nicole", "Noah", "Nora",
  "Olive", "Oliver", "Olivia", "Omar", "Owen", "Paige", "Parker", "Patrick",
  "Paul", "Paula", "Peter", "Phoebe", "Piper", "Priya", "Quentin", "Quinn",
  "Rachel", "Rafael", "Ray", "Reese", "Riley", "Robert", "Rohan", "Roman",
  "Rose", "Ruby", "Ryan", "Ryker", "Sadie", "Samuel", "Sara", "Savannah",
  "Sean", "Sebastian", "Selena", "Serena", "Shane", "Sienna", "Simon",
  "Skyler", "Sofia", "Sophia", "Stella", "Steven", "Sydney", "Tahlia",
  "Talia", "Tariq", "Taylor", "Tessa", "Theo", "Tiana", "Tobias", "Travis",
  "Tristan", "Tyler", "Vance", "Vera", "Veronica", "Victor", "Vincent",
  "Violet", "Wesley", "Whitney", "Will", "Wyatt", "Xander", "Xiomara",
  "Yara", "Yusuf", "Zach", "Zara", "Zoe", "Zuri",
];

const LAST_NAMES = [
  "Adams", "Aguilar", "Allen", "Alvarez", "Anderson", "Bailey", "Baker",
  "Barnes", "Bell", "Bennett", "Brooks", "Brown", "Bryant", "Burns",
  "Butler", "Campbell", "Carter", "Castillo", "Castro", "Chen", "Clark",
  "Cohen", "Coleman", "Collins", "Cook", "Cooper", "Cox", "Cruz", "Davis",
  "Delgado", "Diaz", "Dixon", "Edwards", "Ellis", "Evans", "Fernandez",
  "Fisher", "Flores", "Ford", "Foster", "Fox", "Garcia", "Gibson", "Gomez",
  "Gonzalez", "Graham", "Gray", "Green", "Griffin", "Gutierrez", "Hall",
  "Hamilton", "Hansen", "Harris", "Hayes", "Henderson", "Hernandez", "Hill",
  "Hoffman", "Holmes", "Hughes", "Hunt", "Hunter", "Ibrahim", "Jackson",
  "James", "Jenkins", "Johnson", "Jones", "Kelly", "Khan", "Kim", "King",
  "Lam", "Lee", "Lewis", "Long", "Lopez", "Martin", "Martinez", "Mason",
  "McDonald", "Mehta", "Mendez", "Miller", "Mitchell", "Moore", "Morales",
  "Morgan", "Morris", "Murphy", "Murray", "Myers", "Nelson", "Nguyen",
  "Nichols", "Ortiz", "Owens", "Park", "Parker", "Patel", "Patterson",
  "Pena", "Perez", "Perry", "Peters", "Peterson", "Phillips", "Pierce",
  "Powell", "Price", "Ramirez", "Ramos", "Reed", "Reyes", "Reynolds",
  "Rice", "Richardson", "Rivera", "Roberts", "Robinson", "Rodriguez",
  "Rogers", "Romero", "Rose", "Ross", "Russell", "Ryan", "Sanchez",
  "Sanders", "Schmidt", "Scott", "Sharma", "Shaw", "Shepherd", "Shimizu",
  "Silva", "Simmons", "Singh", "Smith", "Soto", "Stewart", "Stone",
  "Sullivan", "Sutton", "Tanaka", "Tate", "Taylor", "Thomas", "Thompson",
  "Torres", "Tran", "Turner", "Vargas", "Vasquez", "Walker", "Wallace",
  "Wang", "Ward", "Warren", "Washington", "Watson", "Webb", "Wells",
  "West", "White", "Williams", "Wilson", "Wong", "Wood", "Wright", "Yang",
  "Young", "Zhao",
];

// All 50 states with a representative area code. Roughly uniform: the
// generator picks states uniformly, then picks any of the listed area
// codes for that state. Not weighted by population by design — the user
// asked for fully random distribution.
const STATES: { code: string; areaCodes: number[] }[] = [
  { code: "AL", areaCodes: [205, 251, 256, 334] },
  { code: "AK", areaCodes: [907] },
  { code: "AZ", areaCodes: [480, 520, 602, 623, 928] },
  { code: "AR", areaCodes: [479, 501, 870] },
  { code: "CA", areaCodes: [213, 310, 408, 415, 510, 619, 650, 707, 714, 818, 909, 916, 925, 949] },
  { code: "CO", areaCodes: [303, 719, 720, 970] },
  { code: "CT", areaCodes: [203, 860] },
  { code: "DE", areaCodes: [302] },
  { code: "FL", areaCodes: [305, 321, 352, 386, 407, 561, 727, 754, 786, 813, 850, 904, 941, 954] },
  { code: "GA", areaCodes: [404, 470, 478, 678, 706, 770, 912] },
  { code: "HI", areaCodes: [808] },
  { code: "ID", areaCodes: [208] },
  { code: "IL", areaCodes: [217, 224, 309, 312, 331, 618, 630, 708, 773, 815, 847] },
  { code: "IN", areaCodes: [219, 260, 317, 574, 765, 812] },
  { code: "IA", areaCodes: [319, 515, 563, 641, 712] },
  { code: "KS", areaCodes: [316, 620, 785, 913] },
  { code: "KY", areaCodes: [270, 502, 606, 859] },
  { code: "LA", areaCodes: [225, 318, 337, 504, 985] },
  { code: "ME", areaCodes: [207] },
  { code: "MD", areaCodes: [240, 301, 410, 443] },
  { code: "MA", areaCodes: [339, 351, 413, 508, 617, 774, 781, 857, 978] },
  { code: "MI", areaCodes: [231, 248, 269, 313, 517, 586, 616, 734, 810, 906, 989] },
  { code: "MN", areaCodes: [218, 320, 507, 612, 651, 763, 952] },
  { code: "MS", areaCodes: [228, 601, 662, 769] },
  { code: "MO", areaCodes: [314, 417, 573, 636, 660, 816] },
  { code: "MT", areaCodes: [406] },
  { code: "NE", areaCodes: [308, 402, 531] },
  { code: "NV", areaCodes: [702, 725, 775] },
  { code: "NH", areaCodes: [603] },
  { code: "NJ", areaCodes: [201, 551, 609, 732, 848, 856, 862, 908, 973] },
  { code: "NM", areaCodes: [505, 575] },
  { code: "NY", areaCodes: [212, 315, 332, 347, 516, 518, 585, 607, 631, 646, 716, 718, 845, 914, 917, 929] },
  { code: "NC", areaCodes: [252, 336, 704, 743, 828, 910, 919, 980, 984] },
  { code: "ND", areaCodes: [701] },
  { code: "OH", areaCodes: [216, 234, 330, 419, 440, 513, 567, 614, 740, 937] },
  { code: "OK", areaCodes: [405, 539, 580, 918] },
  { code: "OR", areaCodes: [458, 503, 541, 971] },
  { code: "PA", areaCodes: [215, 267, 412, 484, 570, 610, 717, 724, 814, 878] },
  { code: "RI", areaCodes: [401] },
  { code: "SC", areaCodes: [803, 843, 854, 864] },
  { code: "SD", areaCodes: [605] },
  { code: "TN", areaCodes: [423, 615, 629, 731, 865, 901, 931] },
  { code: "TX", areaCodes: [210, 214, 254, 281, 325, 346, 361, 409, 430, 432, 469, 512, 682, 713, 737, 806, 817, 830, 832, 903, 915, 936, 940, 956, 972, 979] },
  { code: "UT", areaCodes: [385, 435, 801] },
  { code: "VT", areaCodes: [802] },
  { code: "VA", areaCodes: [276, 434, 540, 571, 703, 757, 804] },
  { code: "WA", areaCodes: [206, 253, 360, 425, 509, 564] },
  { code: "WV", areaCodes: [304, 681] },
  { code: "WI", areaCodes: [262, 414, 608, 715, 920] },
  { code: "WY", areaCodes: [307] },
  { code: "DC", areaCodes: [202] },
];

const BROKERAGES: { name: string; domain: string }[] = [
  { name: "Compass", domain: "compass.com" },
  { name: "Keller Williams", domain: "kw.com" },
  { name: "RE/MAX", domain: "remax.net" },
  { name: "Coldwell Banker", domain: "coldwellbanker.com" },
  { name: "Berkshire Hathaway HomeServices", domain: "bhhsrealty.com" },
  { name: "Century 21", domain: "century21.com" },
  { name: "Sotheby's International Realty", domain: "sothebysrealty.com" },
  { name: "eXp Realty", domain: "exprealty.com" },
  { name: "Douglas Elliman", domain: "elliman.com" },
  { name: "Independent", domain: "gmail.com" },
];

// Deterministic seeded RNG. xorshift32 — fast, good enough spread for 30k
// records (no statistical concerns here, just visual variety).
function rng(seed: number) {
  let s = (seed | 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function pick<T>(arr: readonly T[], r: number): T {
  return arr[Math.floor(r * arr.length)];
}

function phone(areaCode: number, r1: number, r2: number): string {
  // Always use the 555 exchange so generated numbers don't collide with real
  // ones — that's the conventional dummy phone block.
  const last4 = (Math.floor(r1 * 9000) + 1000).toString();
  // Slight per-lead jitter on the last 4 so they're not all identical.
  const last4Jit = ((Math.floor(r1 * 9000) + 1000 + Math.floor(r2 * 9000)) % 10000)
    .toString()
    .padStart(4, "0");
  return `+1 (${areaCode}) 555-${last4Jit || last4}`;
}

function email(first: string, last: string, domain: string, r: number): string {
  const f = first.toLowerCase().replace(/[^a-z]/g, "");
  const l = last.toLowerCase().replace(/[^a-z]/g, "");
  // Mix a few common email patterns so they don't all look the same.
  const style = Math.floor(r * 4);
  if (style === 0) return `${f}.${l}@${domain}`;
  if (style === 1) return `${f}${l}@${domain}`;
  if (style === 2) return `${f[0]}${l}@${domain}`;
  return `${l}.${f}@${domain}`;
}

// Spread added-at timestamps over the last 90 days so the list looks like
// it's been growing over time, not all dropped in at once.
function addedAt(r: number, now: number): string {
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const offset = Math.floor(r * ninetyDaysMs);
  return new Date(now - offset).toISOString();
}

export function generateSampleLeads(count = 30_000, seed = 0x4a7f3c91): Lead[] {
  const r = rng(seed);
  const now = Date.now();
  const leads: Lead[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const first = pick(FIRST_NAMES, r());
    const last = pick(LAST_NAMES, r());
    const state = pick(STATES, r());
    const areaCode = pick(state.areaCodes, r());
    const brokerage = pick(BROKERAGES, r());
    leads[i] = {
      id: `lead_${i.toString(36).padStart(5, "0")}`,
      firstName: first,
      lastName: last,
      email: email(first, last, brokerage.domain, r()),
      phone: phone(areaCode, r(), r()),
      brokerage: brokerage.name,
      state: state.code,
      addedAt: addedAt(r(), now),
      groupIds: [],
    };
  }
  return leads;
}
