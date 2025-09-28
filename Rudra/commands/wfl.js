const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "wfl",
  version: "4.0.0",
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
  "t-rex": ["t-rex"],
  brontosaurus: ["brontosaurus", "bronto"],
};

// Mutation points
const MUTATION_POINTS = {
  shiny: 1, inverted: 1, frozen: 1, windy: 1,
  golden: 2, tiny: 1, "iron skin": 2, radiant: 2,
  rainbow: 3, shocked: 3, giantbean: 3,
  ascended: 4, mega: 5,
};

// ---------------- Helper Functions ---------------- //
// Hanapin ang pet gamit nickname o partial match
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

    // KG
    let kg = 0;
    const kgMatch = line.match(/(\d+)\s*kg/i);
    if (kgMatch) kg = parseInt(kgMatch[1]);

    // Mutation
    let mutation = null;
    for (let mut in MUTATION_POINTS) {
      if (new RegExp(`\\b${mut}\\b`, "i").test(line)) {
        mutation = mut;
        break;
      }
    }

    // Detect pet (token by token)
    const tokens = line.split(/\s+/);
    let petName = null;
    for (let len = tokens.length; len > 0; len--) {
      for (let i = 0; i <= tokens.length - len; i++) {
        const slice = tokens.slice(i, i + len).join(" ");
        const found = findPetName(slice, petPrices);
        if (found) {
          petName = found;
          break;
        }
      }
      if (petName) break;
    }

    if (petName) {
      pets.push({
        name: petName,
        quantity,
        basePrice: petPrices[petName] || 0,
        kg,
        mutation,
      });
    }
  }
  return pets;
}

// Calculate points and total value
function calculatePoints(pets) {
  let totalPoints = 0; // mutation + kg
  let totalValue = 0;  // basePrice + mutation + kg
  const breakdown = [];

  for (let p of pets) {
    const mutPoints = p.mutation ? MUTATION_POINTS[p.mutation] : 0;
    const kgPoints = p.kg || 0;
    const pointsOnly = mutPoints + kgPoints;
    totalPoints += pointsOnly;

    const baseValue = p.basePrice * p.quantity;
    totalValue += baseValue + pointsOnly;

    breakdown.push(
      `• ${p.quantity} ${p.mutation ? p.mutation + " " : ""}${p.name} (₱${p.basePrice} each)\n` +
      (p.mutation ? `   Mutation: ${p.mutation} = ${mutPoints} pts\n` : "") +
      (p.kg ? `   KG: ${p.kg} = ${kgPoints} pts\n` : "")
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
    if (!isOn) return;
    if (!/wfl/i.test(body)) return;

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
