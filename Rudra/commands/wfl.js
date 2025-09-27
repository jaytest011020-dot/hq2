const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "wfl",
  version: "3.1.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Win or Lose auto-calc + pet manager using Firebase DB",
  usePrefix: true,
  commandCategory: "gag tools",
  usages: "/wfl add <pet> <price> | auto-detect WFL in chat",
  cooldowns: 5
};

// Mutation values
const MUTATION_VALUES = {
  "shiny": 1,
  "inverted": 1,
  "frozen": 1,
  "windy": 1,
  "golden": 2,
  "tiny": 1,
  "iron skin": 2,
  "radiant": 2,
  "rainbow": 3,
  "shocked": 3,
  "giantbean": 3,
  "ascended": 4,
  "mega": 5
};

// Detect mutation by first 4 letters
function detectMutation(word) {
  word = word.toLowerCase();
  for (let mut in MUTATION_VALUES) {
    if (word.includes(mut.substring(0, 4))) {
      return { name: mut, value: MUTATION_VALUES[mut] };
    }
  }
  return { name: null, value: 0 };
}

// Parse single pet entry
function parsePetEntry(entry) {
  const regex = /(\d+)\s+([A-Za-z ]+?)(?:\s+(Inverted|Shiny|Golden|Tiny|Iron skin|Radiant|Rainbow|Shocked|Giantbean|Ascended|Mega))?(?:\s+(\d+)\s*kg\s*max?|\s+(\d+)\s*max)?$/i;
  const match = entry.match(regex);
  if (!match) return null;

  const qty = parseInt(match[1], 10);
  const petName = match[2].trim();
  const mutationWord = match[3] || "";
  const kg = parseInt(match[4] || match[5] || 0, 10);

  const { name: mutation, value: mutationValue } = detectMutation(mutationWord);

  return { qty, petName, mutation, mutationValue, kg };
}

// Parse Me/Him sections
function parseTradeMessage(message) {
  const result = { me: [], him: [] };
  const lowerMsg = message.toLowerCase();
  if (!lowerMsg.includes("wfl")) return null;

  const regex = /(me|him)\s+([^\n]+)/gi;
  let match;
  while ((match = regex.exec(message)) !== null) {
    const owner = match[1].toLowerCase();
    const petsText = match[2].trim();

    const petsArray = petsText.split(/\s*(?=\d+\s)/); // split before quantity
    petsArray.forEach(petStr => {
      const pet = parsePetEntry(petStr.trim());
      if (pet) result[owner].push(pet);
    });
  }
  return result;
}

// Calculate total value of pets
async function calculateValue(pets) {
  const petDB = (await getData("pets")) || {};
  let total = 0;
  let breakdown = [];

  for (let p of pets) {
    const basePrice = petDB[p.petName.toLowerCase()]?.price;
    if (basePrice === undefined) {
      // Pet not found sa DB
      return { error: `❌ Sorry, wala pa sa data ko ang pet na '${p.petName}'` };
    }
    const subtotal = (basePrice + p.mutationValue + p.kg) * p.qty;
    total += subtotal;
    breakdown.push(`${p.qty}× ${p.mutation ? p.mutation + " " : ""}${p.petName} (₱${basePrice} + M${p.mutationValue} + KG${p.kg}) = ${subtotal}`);
  }

  return { total, breakdown };
}

// Command: /wfl add or auto-detect
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, body } = event;

  const petsDB = (await getData("pets")) || {};

  // Handle add command
  if (args[0]?.toLowerCase() === "add" && args[1] && args[2]) {
    const petName = args[1].toLowerCase();
    const price = parseInt(args[2], 10);
    petsDB[petName] = { price };
    await setData("pets", petsDB);
    return api.sendMessage(`✅ Pet ${args[1]} added/updated with price ₱${price}`, threadID, messageID);
  }

  // Auto-detect WFL in message
  if (/wfl/i.test(body)) {
    const trade = parseTradeMessage(body);
    if (!trade) return;

    const meCalc = await calculateValue(trade.me);
    if (meCalc.error) return api.sendMessage(meCalc.error, threadID, messageID);

    const himCalc = await calculateValue(trade.him);
    if (himCalc.error) return api.sendMessage(himCalc.error, threadID, messageID);

    let verdict = "Draw ⚖️";
    if (himCalc.total > meCalc.total) verdict = "WIN ✅";
    else if (himCalc.total < meCalc.total) verdict = "LOSE ❌";

    let msg = `⚖️ Trade Result:\n\n👤 Me (Total: ₱${meCalc.total})\n${meCalc.breakdown.join("\n")}\n\n👤 Him (Total: ₱${himCalc.total})\n${himCalc.breakdown.join("\n")}\n\n📊 Verdict: ${verdict}`;
    return api.sendMessage(msg, threadID, messageID);
  }
};
