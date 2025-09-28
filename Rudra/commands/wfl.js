const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "wfl",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Win or Lose calculator para sa Grow a Garden Roblox pets",
  usePrefix: false,
  commandCategory: "gag tools",
  usages: "Auto WFL detection sa chat",
  cooldowns: 5,
};

// Pet nicknames
const PET_NICKNAMES = {
  "raccoon": ["raccoon", "racc", "rc"],
  "butterfly": ["butterfly", "bf", "bfly"],
  "dragonfly": ["dragonfly", "df", "dragfly", "dfly"],
  "kitsune": ["kitsune", "kit", "kits"],
  "queen bee": ["queen bee", "qb", "queen", "qbee"],
};

// Mutation values (points only)
const MUTATION_VALUES = {
  shiny: 10,
  inverted: 10,
  frozen: 10,
  windy: 10,
  golden: 20,
  tiny: 10,
  "iron skin": 20,
  radiant: 20,
  rainbow: 30,
  shocked: 30,
  giantbean: 30,
  ascended: 40,
  mega: 50
};

// Pet prices from DB
let PET_PRICES = {};

// --- Helpers --- //
function detectMutation(word) {
  word = word.toLowerCase();
  for (let m in MUTATION_VALUES) {
    if (word.includes(m.split(" ")[0])) {
      return { name: m, value: MUTATION_VALUES[m] };
    }
  }
  return { name: null, value: 0 };
}

function findPetName(rawName) {
  const name = rawName.toLowerCase();
  for (let key in PET_NICKNAMES) {
    if (PET_NICKNAMES[key].some(n => n.toLowerCase() === name)) {
      return key;
    }
  }
  return rawName.toLowerCase();
}

function parsePetEntry(entry) {
  const words = entry.trim().split(/\s+/);
  let qty = 1, kg = 0;
  let mutationName = null, mutationValue = 0;
  const petNameWords = [];

  for (let i = 0; i < words.length; i++) {
    let w = words[i].toLowerCase();

    if (i === 0 && /^\d+$/.test(w)) {
      qty = parseInt(w);
      continue;
    }

    let kgMatch = null;
    if (/^(\d+)kg$/i.test(w)) kgMatch = w.match(/^(\d+)kg$/i);
    else if (/^\d+$/.test(w) && i + 1 < words.length && ["kg", "max"].includes(words[i + 1].toLowerCase()))
      kgMatch = [w, w];

    if (kgMatch) {
      kg = parseInt(kgMatch[1]);
      if (i + 1 < words.length && ["kg", "max"].includes(words[i + 1].toLowerCase())) i++;
      continue;
    }

    const mut = detectMutation(w);
    if (mut.name && !mutationName) {
      mutationName = mut.name;
      mutationValue = mut.value;
      continue;
    }

    if (w === "kg" || w === "max") continue;

    petNameWords.push(words[i]);
  }

  const petNameRaw = petNameWords.join(" ");
  const petName = findPetName(petNameRaw);

  return { qty, petName, mutation: mutationName, mutationValue, kg };
}

function parseMultiplePets(part) {
  const entries = part.split(/,|&|and/gi); // hatiin kung may multiple
  const pets = [];
  for (const e of entries) {
    if (e.trim()) pets.push(parsePetEntry(e.trim()));
  }
  return pets;
}

function parseTradeMessage(msg) {
  const lines = msg.split(/\n/);
  const mePets = [], himPets = [];
  for (let line of lines) {
    line = line.trim();
    if (/^\s*me\b/i.test(line)) {
      const petPart = line.replace(/^\s*me\b\s*:?\s*/i, "");
      mePets.push(...parseMultiplePets(petPart));
    } else if (/^\s*him\b/i.test(line)) {
      const petPart = line.replace(/^\s*him\b\s*:?\s*/i, "");
      himPets.push(...parseMultiplePets(petPart));
    }
  }
  return { mePets, himPets };
}

// --- Core Calculation --- //
function calculateValue(pets) {
  let totalPrice = 0;
  let totalPoints = 0;
  const breakdown = [];
  let hasValidPet = false;

  for (const p of pets) {
    if (!p.petName || !PET_PRICES[p.petName]) {
      breakdown.push(`❌ ${p.petName || "Unknown pet"} wala pa sa database`);
      continue;
    }
    hasValidPet = true;

    const price = PET_PRICES[p.petName];
    totalPrice += price * (p.qty || 1);

    // Points = mutation + kg lang (hindi kasama price)
    totalPoints += (p.mutationValue || 0) + (p.kg || 0);

    let line = `• ${p.qty}x ${p.petName} (₱${price} each → ₱${price * (p.qty || 1)})`;
    if (p.mutation) line += `\n   Mutation: ${p.mutation} (+${p.mutationValue} pts)`;
    if (p.kg) line += `\n   KG: ${p.kg}kg (+${p.kg} pts)`;
    breakdown.push(line);
  }

  const totalValue = totalPrice + totalPoints; // ginagamit sa % at win/lose

  return { totalPrice, totalPoints, totalValue, breakdown, hasValidPet };
}

// --- MAIN --- //
module.exports.run = async function({ api, event }) {
  const { threadID, body } = event;
  if (!body.toLowerCase().includes("wfl")) return;

  PET_PRICES = (await getData("petPrices")) || PET_PRICES;

  // Handle /wfl add
  const addMatch = body.match(/\/wfl add (.+?) (\d+)/i);
  if (addMatch) {
    const petName = addMatch[1].toLowerCase();
    const price = parseInt(addMatch[2]);
    if (PET_PRICES[petName]) {
      PET_PRICES[petName] = price;
      await setData("petPrices", PET_PRICES);
      return api.sendMessage(`🔄 Updated ${petName} price → ₱${price}`, threadID);
    } else {
      PET_PRICES[petName] = price;
      await setData("petPrices", PET_PRICES);
      return api.sendMessage(`✅ Added ${petName} with price ₱${price}`, threadID);
    }
  }

  const { mePets, himPets } = parseTradeMessage(body);

  if (mePets.length === 0 && himPets.length === 0)
    return api.sendMessage("⚠️ Walang na-detect na pet.", threadID);

  const meCalc = calculateValue(mePets);
  const himCalc = calculateValue(himPets);

  if (!meCalc.hasValidPet && !himCalc.hasValidPet)
    return api.sendMessage("⚠️ Wala pang pet sa database na tugma.", threadID);

  const totalAll = meCalc.totalValue + himCalc.totalValue;
  const mePercent = totalAll ? ((meCalc.totalValue / totalAll) * 100).toFixed(1) : 0;
  const himPercent = totalAll ? ((himCalc.totalValue / totalAll) * 100).toFixed(1) : 0;

  let resultMsg = `📊 WFL CALCULATION\n──────────────────────\n`;

  resultMsg += `💁‍♂️ Me:\n${meCalc.breakdown.join("\n")}\n➡️ Total Points: ${meCalc.totalPoints}\n\n`;
  resultMsg += `🤖 Him:\n${himCalc.breakdown.join("\n")}\n➡️ Total Points: ${himCalc.totalPoints}\n\n`;

  resultMsg += `📌 Percentage:\n• Me: ${mePercent}%\n• Him: ${himPercent}%\n\n`;

  if (meCalc.totalValue > himCalc.totalValue)
    resultMsg += "😢 Lose! Mas mataas ang value ng ibibigay mo.";
  else if (meCalc.totalValue < himCalc.totalValue)
    resultMsg += "🎉 Win! Mas mataas ang value ng ibibigay niya.";
  else
    resultMsg += "⚖️ Draw! Pantay ang value.";

  api.sendMessage(resultMsg, threadID);
};
