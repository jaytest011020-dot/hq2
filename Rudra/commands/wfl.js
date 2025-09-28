const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "wfl",
  version: "1.0.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Auto detect WFL trades and calculate",
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
async function setWflStatus(threadID, status) {
  let data = (await getData(`wflStatus/${threadID}`)) || {};
  data.enabled = status;
  await setData(`wflStatus/${threadID}`, data);
}

// 🔎 Helper functions
function parsePets(text, petPrices) {
  let pets = [];
  let section = text.split(/\n/i);

  for (let line of section) {
    let quantityMatch = line.match(/(\d+)\s+/);
    let kgMatch = line.match(/(\d+)\s*kg/i);
    let mutationMatch = line.match(/\b(mega|giga|shiny|dark)\b/i);

    for (let pet in petPrices) {
      let regex = new RegExp(`\\b${pet}\\b`, "i");
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
  let breakdown = [];

  for (let p of pets) {
    let petValue = p.basePrice * p.quantity;
    total += petValue;

    let mutationPoints = p.mutation ? 50 : 0;
    let kgPoints = p.kg ? Math.floor(p.kg / 10) : 0;
    total += mutationPoints + kgPoints;

    breakdown.push(
      `${p.quantity} ${p.mutation ? p.mutation + " " : ""}${p.name} - 💰 ${petValue} base\n` +
      (p.mutation ? `   ➕ Mutation (${p.mutation}) = ${mutationPoints} pts\n` : "") +
      (p.kg ? `   ➕ Weight ${p.kg}kg = ${kgPoints} pts\n` : "")
    );
  }

  return { total, breakdown };
}

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

    // 🗂 Get pet database
    let petPrices = (await getData("petPrices")) || {};

    // 🧹 Linisin input
    let cleaned = body.replace(/wfl/gi, "").trim();

    // ✂️ Hatiin Me vs Him
    let meText = cleaned.split(/him/i)[0].replace(/me/i, "").trim();
    let himText = cleaned.split(/him/i)[1]?.trim() || "";

    // 🔎 Parse pets
    let mePets = parsePets(meText, petPrices);
    let himPets = parsePets(himText, petPrices);

    if (mePets.length === 0 && himPets.length === 0) {
      return api.sendMessage(
        "❌ Wala akong nadetect na pet name sa database. Baka wala pa sa listahan.",
        threadID,
        event.messageID
      );
    }

    // 📊 Compute
    let meCalc = calculatePoints(mePets);
    let himCalc = calculatePoints(himPets);

    let winner = "⚖️ Tabla lang, pantay value.";
    if (meCalc.total > himCalc.total) {
      winner = "✅ WIN — mas mataas value ng Me.";
    } else if (meCalc.total < himCalc.total) {
      winner = "❌ LOSE — mas mataas value ng Him.";
    }

    let response =
      `📊 WFL Calculation\n\n` +
      `👤 Me (Total ${meCalc.total} pts):\n${meCalc.breakdown.join("")}\n\n` +
      `👤 Him (Total ${himCalc.total} pts):\n${himCalc.breakdown.join("")}\n\n` +
      `🔎 Resulta: ${winner}`;

    return api.sendMessage(response, threadID, event.messageID);

  } catch (e) {
    console.error("wfl.js error:", e);
  }
};

module.exports.run = async function ({ api, event, args }) {
  const threadID = event.threadID;

  if (!args[0]) {
    return api.sendMessage("Gamitin: /wfl on | /wfl off | /wfl status", threadID, event.messageID);
  }

  const choice = args[0].toLowerCase();
  if (choice === "on") {
    await setWflStatus(threadID, true);
    return api.sendMessage("✅ WFL auto-replies are now ON.", threadID, event.messageID);
  } else if (choice === "off") {
    await setWflStatus(threadID, false);
    return api.sendMessage("⛔ WFL auto-replies are now OFF.", threadID, event.messageID);
  } else if (choice === "status") {
    const isOn = await getWflStatus(threadID);
    return api.sendMessage(
      `📊 WFL status: ${isOn ? "✅ ON" : "⛔ OFF"}`,
      threadID,
      event.messageID
    );
  } else {
    return api.sendMessage("Gamitin: /wfl on | /wfl off | /wfl status", threadID, event.messageID);
  }
};
