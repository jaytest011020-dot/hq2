const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "wfl",
  version: "6.7.0",
  hasPermission: 0,
  credits: "ChatGPT + Jaylord La Peña",
  description: "Advanced WFL parser: multiple pets, mutation, size, KG, quantity per line",
  commandCategory: "Trading",
  usages: "/wfl on | /wfl off | /wfl status",
  cooldowns: 0,
};

// Default ON per thread
async function getWflStatus(threadID) {
  const data = (await getData(`wflStatus/${threadID}`)) || {};
  return data.enabled !== false;
}

// Pet nicknames
const PET_NICKNAMES = {
  raccoon: ["raccoon", "rc", "racc"],
  butterfly: ["butterfly", "bf", "btf"],
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
  "sea turtle": ["sea turtle", "sea turt", "sea tur"], 
  "shiba inu": ["shiba inu", "shiba"]
};

// Mutation points
const MUTATION_POINTS = {
  shiny: 5, inverted: 5, frozen: 5, windy: 5,
  golden: 50, tiny: 5, "iron skin": 5, radiant: 5,
  rainbow: 100, shocked: 50, giantbean: 10,
  ascended: 100, mega: 200,
  titanic: 300
};

// Size points
const SIZE_POINTS = {
  small: 0, cute: 0, gs: 50, "good size": 50,
  huge: 200, titanic: 300, godly: 400
};

// Convert KG → size
function maxKgToSize(kg) {
  if (kg >= 30 && kg <= 49.9) return "gs";
  if (kg >= 50 && kg <= 69.9) return "huge";
  if (kg >= 70 && kg <= 99.9) return "titanic";
  if (kg >= 100) return "godly";
  return null;
}

// Find pet by nickname
function findPetName(input) {
  input = input.toLowerCase();
  for (let pet in PET_NICKNAMES) {
    for (let nick of PET_NICKNAMES[pet]) {
      if (input.includes(nick)) return pet;
    }
  }
  return null;
}

// Detect mutation
function detectMutation(token) {
  token = token.toLowerCase();
  const shortcuts = { rb: "rainbow", rainbow: "rainbow", titan: "titanic" };
  if (shortcuts[token]) return shortcuts[token];
  return MUTATION_POINTS[token] ? token : null;
}

// Detect size
function detectSize(token) {
  token = token.toLowerCase();
  const shortcuts = { titan: "titanic" };
  if (shortcuts[token]) return shortcuts[token];
  return SIZE_POINTS[token] ? token : null;
}

// Parse line into multiple pets with individual attributes
function parseLineAdvanced(line, petPrices) {
  const pets = [];
  const tokens = line.toLowerCase().split(/\s+/);

  let currentPet = null;

  const pushPet = () => {
    if (currentPet) {
      pets.push(currentPet);
      currentPet = null;
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    // Numeric mutation shorthand like 6df
    const match = t.match(/^(\d+)([a-z]+)$/i);
    if (match) {
      pushPet();
      const [_, qty, nick] = match;
      const petName = findPetName(nick);
      if (petName) {
        currentPet = {
          name: petName,
          quantity: parseInt(qty),
          basePrice: petPrices[petName] || 0,
          mutation: "mega",
          size: null,
          kg: 0
        };
        continue;
      }
    }

    // Pure number = quantity for next pet
    const qtyNum = parseInt(t);
    if (!isNaN(qtyNum)) {
      if (!currentPet) currentPet = {};
      currentPet.quantity = qtyNum;
      continue;
    }

    // Mutation detection
    const mut = detectMutation(t);
    if (mut) {
      if (!currentPet) currentPet = {};
      currentPet.mutation = mut;
      continue;
    }

    // Size detection
    const sz = detectSize(t);
    if (sz) {
      if (!currentPet) currentPet = {};
      currentPet.size = sz;
      continue;
    }

    // KG detection
    const kgMatch = t.match(/^(\d+)kg$/);
    if (kgMatch) {
      if (!currentPet) currentPet = {};
      currentPet.kg = parseInt(kgMatch[1]);
      continue;
    }

    // Pet detection
    const petName = findPetName(t);
    if (petName) {
      if (!currentPet) currentPet = {};
      currentPet.name = petName;
      if (!currentPet.quantity) currentPet.quantity = 1;
      if (!currentPet.basePrice) currentPet.basePrice = petPrices[petName] || 0;
      pets.push(currentPet);
      currentPet = null;
    }
  }

  // Push remaining pet
  if (currentPet) pets.push(currentPet);

  // Convert KG to size if size not set
  for (const p of pets) {
    if (!p.size && p.kg) {
      const sz = maxKgToSize(p.kg);
      if (sz) {
        p.size = sz;
        p.kg = 0; // ignore KG points if size is detected
      }
    }
    if (!p.quantity) p.quantity = 1;
    if (!p.mutation) p.mutation = null;
    if (!p.size) p.size = null;
    if (!p.kg) p.kg = 0;
  }

  return pets;
}

// Parse multiple lines
function parsePets(text, petPrices) {
  const allPets = [];
  const lines = text.split(/\n/);
  for (const line of lines) {
    allPets.push(...parseLineAdvanced(line, petPrices));
  }
  return allPets;
}

// Calculate points
function calculatePoints(pets) {
  let totalPoints = 0;
  let totalValue = 0;
  const breakdown = [];

  for (const p of pets) {
    const mutPoints = p.mutation ? MUTATION_POINTS[p.mutation] : 0;
    const sizePoints = p.size ? SIZE_POINTS[p.size] : 0;
    const kgPoints = (!p.size && p.kg) ? p.kg : 0;
    const pointsOnly = mutPoints + sizePoints + kgPoints;
    totalPoints += pointsOnly;

    const baseValue = p.basePrice * p.quantity;
    totalValue += baseValue + pointsOnly;

    breakdown.push(
      `• ${p.quantity} ${p.mutation ? p.mutation + " " : ""}${p.name} (₱${p.basePrice} each)\n` +
      (p.mutation ? `   Mutation: ${p.mutation} = ${mutPoints} pts\n` : "") +
      (kgPoints ? `   KG: ${p.kg} = ${kgPoints} pts\n` : "") +
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
  if (!args[0]) return api.sendMessage("Gamitin: /wfl on | /wfl off | /wfl status", threadID, event.messageID);
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
