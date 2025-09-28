const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "wfl",
  version: "6.0.0",
  hasPermission: 0,
  credits: "ChatGPT + Jaylord La Peña",
  description: "Auto detect WFL trades and calculate points",
  commandCategory: "Trading",
  usages: "/wfl on | /wfl off | /wfl status",
  cooldowns: 0,
};

// ✅ Default ON per thread
async function getWflStatus(threadID) {
  const data = (await getData(`wflStatus/${threadID}`)) || {};
  return data.enabled !== false;
}

// Pet nicknames
const PET_NICKNAMES = {
  raccoon: ["raccoon", "rc", "racc"],
  butterfly: ["butterfly", "bf"],
  dragonfly: ["dragonfly", "df"],
  "disco bee": ["disco bee", "db"],
  kitsune: ["kitsune", "kit", "kits", "redkit", "red kit"],
  "queen bee": ["queen bee", "qb"],
  spinosaurus: ["spinosaurus", "spino"],
  triceratops: ["triceratops", "trice"],
  "t-rex": ["t-rex", "trex"], 
  brontosaurus: ["brontosaurus", "bronto"],
  dilophosaurus: ["dilophosaurus", "dilo"], 
  pachycephalosaurus: ["pachycephalosaurus", "pachy"], 
  stegosaurus: ["stegosaurus", "stego"], 
  "corrupted kitsune": ["corrupted kitsune", "ckit", "c kit"],
  "red fox": ["red fox", "rf"], 
};

// Mutation points
const MUTATION_POINTS = {
  shiny: 5, inverted: 5, frozen: 5, windy: 5,
  golden: 50, tiny: 5, "iron skin": 5, radiant: 5,
  rainbow: 100, shocked: 50, giantbean: 10,
  ascended: 100, mega: 200,
};

// Size points
const SIZE_POINTS = {
  small: 0,
  cute: 0,
  gs: 50,
  "good size": 50,
  huge: 200,
  titanic: 300,
  godly: 400,
};

// ---------------- Helper Functions ---------------- //
function findPetName(input, petPrices) {
  const lowered = input.toLowerCase();
  if (petPrices[lowered]) return lowered;

  let match = null, longest = 0;
  for (let pet in PET_NICKNAMES) {
    for (let nick of PET_NICKNAMES[pet]) {
      if (lowered.startsWith(nick) && nick.length > longest) {
        match = pet;
        longest = nick.length;
      }
    }
  }
  return match;
}

// Parse pets mula sa text
function parsePets(text, petPrices) {
  const pets = [];
  const lines = text.split(/\n/);

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Quantity
    let quantity = 1;
    const qtyMatch = line.match(/^(\d+)/);
    if (qtyMatch) quantity = parseInt(qtyMatch[1]);

    // KG & Max
    let kg = 0;
    const kgMatch = line.match(/(\d+)\s*kg/i);
    const maxMatch = line.match(/(\d+)\s*max/i);
    if (kgMatch) kg = parseInt(kgMatch[1]);
    else if (maxMatch) kg = parseInt(maxMatch[1]); // only if kg not present

    // Mutation
    let mutation = null;
    for (let mut in MUTATION_POINTS) {
      if (new RegExp(`\\b${mut}\\b`, "i").test(line)) {
        mutation = mut;
        break;
      }
    }

    // Size
    let size = null;
    for (let s in SIZE_POINTS) {
      if (new RegExp(`\\b${s}\\b`, "i").test(line)) {
        size = s;
        break;
      }
    }

    // Detect multiple pets (token scanning)
    const tokens = line.split(/\s+/);
    let index = 0;
    while (index < tokens.length) {
      let foundPet = null;
      let len = Math.min(3, tokens.length - index); // max 3 words for name
      while (len > 0) {
        const slice = tokens.slice(index, index + len).join(" ");
        const petName = findPetName(slice, petPrices);
        if (petName) {
          foundPet = petName;
          index += len - 1; // move index past matched name
          break;
        }
        len--;
      }
      if (foundPet) {
        pets.push({
          name: foundPet,
          quantity,
          basePrice: petPrices[foundPet] || 0,
          kg,
          mutation,
          size,
        });
      }
      index++;
    }
  }
  return pets;
}

function calculatePoints(pets) {
  let totalPoints = 0; // mutation + kg + size
  let totalValue = 0;  // basePrice + mutation + kg + size
  const breakdown = [];

  for (let p of pets) {
    const mutPoints = p.mutation ? MUTATION_POINTS[p.mutation] : 0;
    const kgPoints = p.kg || 0;
    const sizePoints = p.size ? SIZE_POINTS[p.size] : 0;

    const pointsOnly = mutPoints + kgPoints + sizePoints;
    totalPoints += pointsOnly;

    const baseValue = p.basePrice * p.quantity;
    totalValue += baseValue + pointsOnly;

    breakdown.push(
      `• ${p.quantity} ${p.mutation ? p.mutation + " " : ""}${p.name} (₱${p.basePrice} each)\n` +
      (p.mutation ? `   Mutation: ${p.mutation} = ${mutPoints} pts\n` : "") +
      (p.kg ? `   KG: ${p.kg} = ${kgPoints} pts\n` : "") +
      (p.size ? `   Size: ${p.size} = ${sizePoints} pts\n` : "")
    );
  }

  return { totalPoints, totalValue, breakdown };
}

// ---------------- Auto Reply ---------------- //
module.exports.handleEvent = async function ({ api, event }) {
  try {
    const body = (event.body || "").trim();
    if (!body) return;
    const sender = String(event.senderID);
    const threadID = event.threadID;
    const botID = String(api.getCurrentUserID());
    if (sender === botID) return;

    const isOn = await getWflStatus(threadID);
    if (!isOn || !/wfl/i.test(body)) return;

    const petPrices = (await getData("petPrices")) || {};
    const cleaned = body.replace(/wfl/gi, "").trim();

    const meText = cleaned.split(/him/i)[0].replace(/me/i, "").trim();
    const himText = cleaned.split(/him/i)[1]?.trim() || "";

    const mePets = parsePets(meText, petPrices);
    const himPets = parsePets(himText, petPrices);

    if (mePets.length === 0 && himPets.length === 0)
      return api.sendMessage("❌ Wala akong nadetect na pet name sa database.", threadID, event.messageID);

    const meCalc = calculatePoints(mePets);
    const himCalc = calculatePoints(himPets);

    const totalAll = meCalc.totalValue + himCalc.totalValue;
    const mePercent = totalAll ? ((meCalc.totalValue / totalAll) * 100).toFixed(1) : 0;
    const himPercent = totalAll ? ((himCalc.totalValue / totalAll) * 100).toFixed(1) : 0;

    let result = "⚖️ Tabla lang, pantay value ng pets.";
    if (meCalc.totalValue > himCalc.totalValue)
      result = "❌ LOSE — Mas mataas value ng pet mo.";
    else if (meCalc.totalValue < himCalc.totalValue)
      result = "✅ WIN — Mas mataas value ng pet ng kalaban.";

    const msg =
      `📊 WFL Calculation\n─────────────────────\n` +
      `👤 Me (Points Only: ${meCalc.totalPoints} pts):\n${meCalc.breakdown.join("")}\n` +
      `🤖 Him (Points Only: ${himCalc.totalPoints} pts):\n${himCalc.breakdown.join("")}\n` +
      `📌 Percentage:\n• Me: ${mePercent}%\n• Him: ${himPercent}%\n\n` +
      `🔎 Resulta: ${result}`;

    return api.sendMessage(msg, threadID, event.messageID);
  } catch (e) {
    console.error("wfl.js error:", e);
  }
};

// ---------------- Manual Command ---------------- //
module.exports.run = async function ({ api, event, args }) {
  const threadID = event.threadID;
  if (!args[0]) {
    return api.sendMessage("Gamitin: /wfl on | /wfl off | /wfl status", threadID, event.messageID);
  }
  const choice = args[0].toLowerCase();
  if (choice === "on") {
    await setData(`wflStatus/${threadID}`, { enabled: true });
    return api.sendMessage("✅ WFL auto-replies are now ON.", threadID, event.messageID);
  } else if (choice === "off") {
    await setData(`wflStatus/${threadID}`, { enabled: false });
    return api.sendMessage("⛔ WFL auto-replies are now OFF.", threadID, event.messageID);
  } else if (choice === "status") {
    const data = await getData(`wflStatus/${threadID}`);
    return api.sendMessage(`📊 WFL status: ${data?.enabled ? "✅ ON" : "⛔ OFF"}`, threadID, event.messageID);
  } else {
    return api.sendMessage("Gamitin: /wfl on | /wfl off | /wfl status", threadID, event.messageID);
  }
};
