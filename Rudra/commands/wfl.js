const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "wfl",
  version: "1.0.7",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Win or Lose calculator para sa Grow a Garden Roblox pets",
  usePrefix: false,
  commandCategory: "gag tools",
  usages: "Auto WFL detection sa chat",
  cooldowns: 5,
};

// Pet nicknames database
const PET_NICKNAMES = {
  raccoon: ["raccoon", "racc", "rc"],
  "disco bee": ["disco bee", "db"],
  butterfly: ["butterfly", "bf"],
  dragonfly: ["dragonfly", "df"],
  "queen bee": ["queen bee", "qb"],
  kitsune: ["kitsune", "kit", "redkit"]
};

// Mutation values
const MUTATION_VALUES = {
  shiny: 1,
  inverted: 1,
  frozen: 1,
  windy: 1,
  golden: 2,
  tiny: 1,
  "iron skin": 2,
  radiant: 2,
  rainbow: 3,
  shocked: 3,
  giantbean: 3,
  ascended: 4,
  mega: 5
};

// Pet prices (load from DB)
let PET_PRICES = {};

// Detect mutation (kahit partial)
function detectMutation(word) {
  word = word.toLowerCase();
  for (let m in MUTATION_VALUES) {
    if (word.includes(m.slice(0, 4))) return { name: m, value: MUTATION_VALUES[m] };
  }
  return { name: null, value: 0 };
}

// Parse single pet entry
function parsePetEntry(entry) {
  const words = entry.trim().split(/\s+/);
  let qty = 1, kg = 0, mutationName = null, mutationValue = 0;
  const petNameWords = [];

  for (let i = 0; i < words.length; i++) {
    let w = words[i].toLowerCase();

    // Detect quantity (unahan)
    if (i === 0 && /^\d+$/.test(w)) { qty = parseInt(w); continue; }

    // Detect kg: 40kg, 40 kg, 50 kg max
    let kgMatch = null;
    if (w.match(/^(\d+)kg$/i)) kgMatch = w.match(/^(\d+)kg$/i);
    else if (/^\d+$/.test(w) && i + 1 < words.length && ["kg", "max"].includes(words[i + 1].toLowerCase())) kgMatch = [w, w];
    if (kgMatch) { kg = parseInt(kgMatch[1]); if (i + 1 < words.length && ["kg", "max"].includes(words[i + 1].toLowerCase())) i++; continue; }

    // Detect mutation kahit saan
    const mut = detectMutation(w);
    if (mut.name && !mutationName) { mutationName = mut.name; mutationValue = mut.value; continue; }

    if (w === "kg" || w === "max") continue;

    petNameWords.push(words[i]);
  }

  const petNameRaw = petNameWords.join(" ");
  let petName = null;
  for (let key in PET_NICKNAMES) {
    if (PET_NICKNAMES[key].some(n => n.toLowerCase() === petNameRaw.toLowerCase())) { petName = key; break; }
  }

  return { qty, petName, mutation: mutationName, mutationValue, kg };
}

// Parse multiple pets
function parseMultiplePets(part) {
  const pets = [];
  const regex = /(\d+\s+(?:\w+\s+)*\w+)/g;
  const matches = part.match(regex);
  if (matches) for (const e of matches) pets.push(parsePetEntry(e.trim()));
  else pets.push(parsePetEntry(part));
  return pets;
}

// Parse trade message (single-line o multi-line)
function parseTradeMessage(msg) {
  const mePets = [], himPets = [];

  msg = msg.toLowerCase();

  // Detect Me section
  const meMatch = msg.match(/me\s*:?(.+?)(?=\s*him\b|$)/i);
  if (meMatch) mePets.push(...parseMultiplePets(meMatch[1].trim()));

  // Detect Him section
  const himMatch = msg.match(/him\s*:?(.+)$/i);
  if (himMatch) himPets.push(...parseMultiplePets(himMatch[1].trim()));

  return { mePets, himPets };
}

// Calculate total value
function calculateValue(pets) {
  let total = 0, breakdown = [];
  for (const p of pets) {
    if (!p.petName || !PET_PRICES[p.petName]) {
      breakdown.push(`❌ ${p.petName || "Unknown pet"} wala pa sa database`);
      continue;
    }
    const price = PET_PRICES[p.petName];
    const value = price + (p.mutationValue || 0) * 50 + (p.kg || 0);
    total += value * (p.qty || 1);
    breakdown.push(`• ${p.qty}x ${p.petName} ${p.mutation ? "(" + p.mutation + ")" : ""} = ${value * (p.qty || 1)}`);
  }
  return { total, breakdown };
}

// Command module
module.exports.run = async function({ api, event }) {
  const { threadID, body } = event;
  const msg = body;

  // Auto detect WFL
  if (!msg.toLowerCase().includes("wfl")) return;

  // Load pet prices
  PET_PRICES = (await getData("petPrices")) || PET_PRICES;

  // Detect /wfl add
  const addMatch = body.match(/\/wfl add (\w+) (\d+)/i);
  if (addMatch) {
    const petName = addMatch[1].toLowerCase();
    const price = parseInt(addMatch[2]);
    PET_PRICES[petName] = price;
    await setData("petPrices", PET_PRICES);
    return api.sendMessage(`✅ ${petName} presyo ay na-set sa ${price}`, threadID);
  }

  // Parse trade
  const { mePets, himPets } = parseTradeMessage(msg);

  // Check if all pets missing in DB
  const meValid = mePets.filter(p => p.petName && PET_PRICES[p.petName]);
  const himValid = himPets.filter(p => p.petName && PET_PRICES[p.petName]);

  if (meValid.length === 0 && himValid.length === 0) {
    return api.sendMessage("⚠️ Wala kang na-detect na pet sa database.", threadID);
  }

  const meCalc = calculateValue(meValid);
  const himCalc = calculateValue(himValid);

  let resultMsg = `📊 WFL RESULT\n──────────────────────\n`;
  resultMsg += `💁‍♂️ Me Kabuuang Value: ${meCalc.total}\n${meCalc.breakdown.join("\n")}\n\n`;
  resultMsg += `🤖 Him Kabuuang Value: ${himCalc.total}\n${himCalc.breakdown.join("\n")}\n\n`;

  if (meCalc.total > himCalc.total)
    resultMsg += "😢 Lose! Mas mataas ang value ng ibibigay mo sa kanya.";
  else if (meCalc.total < himCalc.total)
    resultMsg += "🎉 Win! Mas mataas ang value ng ibibigay niya sa iyo!";
  else
    resultMsg += "⚖️ Draw! Pantay ang value ng ibinigay.";

  api.sendMessage(resultMsg, threadID);
};
