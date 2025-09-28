const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "wfl",
  version: "3.0.0",
  hasPermission: 0,
  credits: "ChatGPT + Jaylord La Peña",
  description: "Auto detect WFL trades and calculate points with base price included in percentage",
  commandCategory: "Trading",
  usages: "/wfl on | /wfl off | /wfl status",
  cooldowns: 0,
};

// ✅ Default ON per thread
async function getWflStatus(threadID) {
  const data = (await getData(`wflStatus/${threadID}`)) || {};
  if (typeof data.enabled === "undefined") return true;
  return data.enabled;
}

// 🔎 Pet nicknames mapping
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

// ✅ Mutation points
const MUTATION_POINTS = {
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
  mega: 5,
};

// 🔎 Helper: find pet name from nickname
function findPetName(rawName) {
  const name = rawName.toLowerCase();
  for (const key in PET_NICKNAMES) {
    if (PET_NICKNAMES[key].some(n => name.startsWith(n))) {
      return key;
    }
  }
  return rawName.toLowerCase();
}

// 🔎 Parse pets from text
function parsePets(text, petPrices) {
  const pets = [];
  const lines = text.split(/\n/i);

  for (const line of lines) {
    const quantityMatch = line.match(/(\d+)\s+/);
    const kgMatch = line.match(/(\d+)\s*kg/i);
    const mutationMatch = line.match(
      new RegExp(`\\b(${Object.keys(MUTATION_POINTS).join("|")})\\b`, "i")
    );

    for (const pet in petPrices) {
      const regex = new RegExp(`\\b${pet}\\b`, "i");
      if (regex.test(line)) {
        pets.push({
          name: pet,
          quantity: quantityMatch ? parseInt(quantityMatch[1]) : 1,
          basePrice: petPrices[pet],
          kg: kgMatch ? parseInt(kgMatch[1]) : 0,
          mutation: mutationMatch ? mutationMatch[1].toLowerCase() : null,
        });
      }
    }
  }

  return pets;
}

// 🔎 Calculate total value & points
function calculatePets(pets) {
  let totalValue = 0; // base price + mutation + kg
  let pointsOnly = 0; // mutation + kg points only
  const breakdown = [];

  for (const p of pets) {
    const baseTotal = p.basePrice * p.quantity;
    const mutationPoints = p.mutation ? MUTATION_POINTS[p.mutation] : 0;
    const kgPoints = p.kg || 0;
    const totalPts = baseTotal + mutationPoints + kgPoints;

    totalValue += totalPts;
    pointsOnly += mutationPoints + kgPoints;

    breakdown.push(
      `${p.quantity} ${p.mutation ? p.mutation + " " : ""}${p.name} — ₱${p.basePrice} base` +
        (p.mutation ? `\n   Mutation: +${mutationPoints} pts` : "") +
        (p.kg ? `\n   KG: +${kgPoints} pts` : "")
    );
  }

  return { totalValue, pointsOnly, breakdown };
}

// --- HANDLE AUTO REPLY --- //
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

    if (mePets.length === 0 && himPets.length === 0) {
      return api.sendMessage(
        "❌ Wala akong nadetect na pet sa database.",
        threadID,
        event.messageID
      );
    }

    const meCalc = calculatePets(mePets);
    const himCalc = calculatePets(himPets);

    const totalCombined = meCalc.totalValue + himCalc.totalValue;
    const mePercent = totalCombined
      ? ((meCalc.totalValue / totalCombined) * 100).toFixed(1)
      : 0;
    const himPercent = totalCombined
      ? ((himCalc.totalValue / totalCombined) * 100).toFixed(1)
      : 0;

    let winner = "⚖️ Tabla lang, pantay value.";
    if (meCalc.totalValue > himCalc.totalValue)
      winner = "❌ LOSE — Mas mataas value ng pet mo.";
    else if (meCalc.totalValue < himCalc.totalValue)
      winner = "✅ WIN — Mas mataas value ng pet ng kalaban.";

    const response =
      `📊 WFL Calculation\n────────────────────────\n` +
      `👤 Me (Points Only: ${meCalc.pointsOnly} pts):\n${meCalc.breakdown.join(
        "\n"
      )}\n\n` +
      `🤖 Him (Points Only: ${himCalc.pointsOnly} pts):\n${himCalc.breakdown.join(
        "\n"
      )}\n\n` +
      `📌 Percentage (Base price + points):\n• Me: ${mePercent}%\n• Him: ${himPercent}%\n\n` +
      `🔎 Resulta: ${winner}`;

    return api.sendMessage(response, threadID, event.messageID);
  } catch (err) {
    console.error("wfl.js error:", err);
  }
};

// --- MANUAL COMMAND --- //
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
    const status = await getData(`wflStatus/${threadID}`);
    return api.sendMessage(
      `📊 WFL status: ${status?.enabled ? "✅ ON" : "⛔ OFF"}`,
      threadID,
      event.messageID
    );
  } else {
    return api.sendMessage("Gamitin: /wfl on | /wfl off | /wfl status", threadID, event.messageID);
  }
};
