const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "wfl",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Auto Win or Lose calculator sa Grow a Garden pets",
  usePrefix: false,
  commandCategory: "gag tools",
  usages: "Mag-send lang ng message na may WFL",
  cooldowns: 5,
};

// Pet nicknames
const PET_NICKNAMES = {
  "raccoon": ["raccoon", "racc", "rc"],
  "dragonfly": ["dragonfly", "df", "dragfly", "dfly"],
  "disco bee": ["disco bee", "db", "disco"],
  "butterfly": ["butterfly", "bf", "bfly"],
  "queen bee": ["queen bee", "qb", "queen", "qbee"],
  "kitsune": ["kitsune", "kit", "redkit", "kits"],
};

// Mutation values (points)
const MUTATION_VALUES = {
  shiny: 50,
  inverted: 50,
  frozen: 50,
  windy: 50,
  golden: 100,
  tiny: 50,
  "iron skin": 100,
  radiant: 100,
  rainbow: 150,
  shocked: 150,
  giantbean: 150,
  ascended: 200,
  mega: 250
};

// Helper: hanapin pet base name mula sa nicknames
function findPetName(rawName) {
  const name = rawName.toLowerCase();
  for (let key in PET_NICKNAMES) {
    if (PET_NICKNAMES[key].some(n => n.toLowerCase() === name)) {
      return key;
    }
  }
  return null;
}

// Helper: detect mutation
function detectMutation(words) {
  for (let w of words) {
    for (let m in MUTATION_VALUES) {
      if (w.toLowerCase() === m) {
        return { name: m, points: MUTATION_VALUES[m] };
      }
    }
  }
  return { name: null, points: 0 };
}

// Parse pet entry (halimbawa: "1 Mega raccoon 40kg max")
function parsePetEntry(entry, petDB) {
  const words = entry.trim().split(/\s+/);
  let qty = 1;
  let kg = 0;
  let mutation = null;
  let mutationPoints = 0;

  // Quantity
  if (/^\d+$/.test(words[0])) {
    qty = parseInt(words[0]);
    words.shift();
  }

  // Mutation
  const mut = detectMutation(words);
  if (mut.name) {
    mutation = mut.name;
    mutationPoints = mut.points;
    words.splice(words.indexOf(mut.name), 1);
  }

  // Detect kg (e.g. "40kg" or "40 kg max")
  for (let i = 0; i < words.length; i++) {
    if (/^(\d+)kg$/i.test(words[i])) {
      kg = parseInt(words[i]);
      words.splice(i, 1);
      break;
    }
    if (/^\d+$/.test(words[i]) && words[i + 1] && words[i + 1].toLowerCase() === "kg") {
      kg = parseInt(words[i]);
      words.splice(i, 2);
      if (words[i] && words[i].toLowerCase() === "max") words.splice(i, 1);
      break;
    }
  }

  const petNameRaw = words.join(" ");
  const petName = findPetName(petNameRaw);
  const basePrice = petName && petDB[petName] ? petDB[petName] : null;

  return { qty, petName, basePrice, mutation, mutationPoints, kg };
}

// Parse pets block
function parsePets(part, petDB) {
  const lines = part.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
  const pets = [];
  for (const line of lines) {
    pets.push(parsePetEntry(line, petDB));
  }
  return pets;
}

// Summarize pets
function summarize(pets) {
  let total = 0;
  let details = [];

  for (const p of pets) {
    if (!p.petName || !p.basePrice) {
      details.push(`❌ Unknown pet (wala pa sa database)`);
      continue;
    }

    let baseValue = p.basePrice * p.qty;
    let petTotal = baseValue;

    let petLines = [`• ${p.qty} ${p.petName} - ${baseValue}`];

    if (p.mutation) {
      petTotal += p.mutationPoints;
      petLines.push(`   Mutation: ${p.mutation} (+${p.mutationPoints} pts)`);
    }

    if (p.kg > 0) {
      const kgPoints = Math.floor(p.kg / 10); // sample scale
      petTotal += kgPoints;
      petLines.push(`   Max kg: ${p.kg}kg (+${kgPoints} pts)`);
    }

    total += petTotal;
    details.push(petLines.join("\n"));
  }

  return { total, details };
}

// Handle auto-detect WFL messages
module.exports.handleEvent = async function({ api, event }) {
  const { body, threadID, messageID } = event;
  if (!body) return;

  if (!/wfl/i.test(body)) return; // auto detect kapag may "wfl"

  // Load pet DB
  const petDB = await getData("petPrices") || {};

  const meMatch = body.split(/him/i)[0].split(/me/i)[1];
  const himMatch = body.split(/him/i)[1];

  if (!meMatch || !himMatch) {
    return api.sendMessage("⚠️ Invalid WFL format.", threadID, messageID);
  }

  const mePets = parsePets(meMatch, petDB);
  const himPets = parsePets(himMatch, petDB);

  if (mePets.length === 0 && himPets.length === 0) {
    return api.sendMessage("⚠️ Wala akong na-detect na pet sa database.", threadID, messageID);
  }

  const meSummary = summarize(mePets);
  const himSummary = summarize(himPets);

  let result = `📊 WFL Result:\n\n`;

  result += `👤 Me Total: ${meSummary.total}\n${meSummary.details.join("\n")}\n\n`;
  result += `🤖 Him Total: ${himSummary.total}\n${himSummary.details.join("\n")}\n\n`;

  const combined = meSummary.total + himSummary.total;
  if (combined > 0) {
    const mePercent = ((meSummary.total / combined) * 100).toFixed(1);
    const himPercent = ((himSummary.total / combined) * 100).toFixed(1);
    result += `📈 Percentage:\n- Me: ${mePercent}%\n- Him: ${himPercent}%\n\n`;
  }

  if (meSummary.total > himSummary.total) result += "👉 Result: LOSE (mas mataas value ng ibibigay mo)";
  else if (meSummary.total < himSummary.total) result += "👉 Result: WIN (mas mataas value ng ibibigay niya)";
  else result += "👉 Result: FAIR TRADE";

  api.sendMessage(result, threadID, messageID);
};

// Command para mag-add ng pet price
module.exports.run = async function({ api, event, args }) {
  const { threadID } = event;

  if (args[0] === "add") {
    const petName = args.slice(1, -1).join(" ").toLowerCase();
    const price = parseInt(args[args.length - 1]);
    if (!petName || isNaN(price)) {
      return api.sendMessage("❌ Format: /wfl add <pet name> <price>", threadID);
    }
    let petDB = await getData("petPrices") || {};
    petDB[petName] = price;
    await setData("petPrices", petDB);
    return api.sendMessage(`✅ ${petName} price set to ${price}`, threadID);
  }
};
