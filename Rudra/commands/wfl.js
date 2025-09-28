const { getData } = require("../../database.js");

module.exports.config = {
  name: "wfl",
  version: "2.0.0",
  hasPermission: 0,
  credits: "ChatGPT + Jaylord La Peña",
  description: "Auto detect WFL trades and calculate points",
  commandCategory: "Trading",
  usages: "/wfl on | /wfl off | /wfl status",
  cooldowns: 0,
};

// ✅ Default ON per thread
async function getWflStatus(threadID) {
  let data = (await getData(`wflStatus/${threadID}`)) || {};
  if (typeof data.enabled === "undefined") return true;
  return data.enabled;
}

// 🔎 Helper functions
function parsePets(text, petPrices) {
  const pets = [];
  const lines = text.split(/\n/i);

  for (let line of lines) {
    const quantityMatch = line.match(/(\d+)\s+/);
    const kgMatch = line.match(/(\d+)\s*kg/i);
    const mutationMatch = line.match(/\b(mega|giga|shiny|dark)\b/i);

    for (let pet in petPrices) {
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

function calculatePoints(pets) {
  let total = 0;
  const breakdown = [];

  for (let p of pets) {
    const petValue = p.basePrice * p.quantity; // para sa percentage calculation
    const mutationPoints = p.mutation ? 50 : 0;
    const kgPoints = p.kg ? Math.floor(p.kg / 10) : 0;
    const pointsOnly = mutationPoints + kgPoints;

    total += pointsOnly + petValue; // include basePrice sa calculation pero hindi ipapakita sa breakdown

    breakdown.push(
      `${p.quantity} ${p.mutation ? p.mutation + " " : ""}${p.name} - ${p.basePrice}₱ base\n` +
      (p.mutation ? `   Mutation (${p.mutation}) = ${mutationPoints} pts\n` : "") +
      (p.kg ? `   Weight ${p.kg}kg = ${kgPoints} pts\n` : "")
    );
  }

  return { total, breakdown, pointsOnly: total }; // pointsOnly ginagamit lang sa percentage
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

    // ✅ Trigger kapag may "wfl" sa kahit saan
    if (!/wfl/i.test(body)) return;

    // 🗂 Load pet database
    const petPrices = (await getData("petPrices")) || {};

    // 🧹 Linisin input
    const cleaned = body.replace(/wfl/gi, "").trim();

    // ✂️ Split Me vs Him
    const meText = cleaned.split(/him/i)[0].replace(/me/i, "").trim();
    const himText = cleaned.split(/him/i)[1]?.trim() || "";

    // 🔎 Parse pets
    const mePets = parsePets(meText, petPrices);
    const himPets = parsePets(himText, petPrices);

    if (mePets.length === 0 && himPets.length === 0) {
      return api.sendMessage(
        "❌ Wala akong nadetect na pet name sa database. Baka wala pa sa listahan.",
        threadID,
        event.messageID
      );
    }

    // 📊 Compute points
    const meCalc = calculatePoints(mePets);
    const himCalc = calculatePoints(himPets);

    const totalPoints = meCalc.total + himCalc.total;
    const mePercent = totalPoints ? ((meCalc.total / totalPoints) * 100).toFixed(1) : 0;
    const himPercent = totalPoints ? ((himCalc.total / totalPoints) * 100).toFixed(1) : 0;

    // ✅ Determine winner
    let winner = "⚖️ Tabla lang, pantay value ng pets.";
    if (meCalc.total > himCalc.total) winner = "❌ LOSE — Mas mataas value ng pet mo.";
    else if (meCalc.total < himCalc.total) winner = "✅ WIN — Mas mataas value ng pet ng kalaban.";

    // ✨ Format response
    const response =
      `📊 WFL Calculation\n────────────────────────\n` +
      `👤 Me (Points Only: ${meCalc.total} pts):\n${meCalc.breakdown.join("")}\n` +
      `🤖 Him (Points Only: ${himCalc.total} pts):\n${himCalc.breakdown.join("")}\n` +
      `📌 Percentage:\n• Me: ${mePercent}%\n• Him: ${himPercent}%\n\n` +
      `🔎 Resulta: ${winner}`;

    return api.sendMessage(response, threadID, event.messageID);

  } catch (e) {
    console.error("wfl.js error:", e);
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
    const isOn = await getData(`wflStatus/${threadID}`);
    return api.sendMessage(
      `📊 WFL status: ${isOn?.enabled ? "✅ ON" : "⛔ OFF"}`,
      threadID,
      event.messageID
    );
  } else {
    return api.sendMessage("Gamitin: /wfl on | /wfl off | /wfl status", threadID, event.messageID);
  }
};
