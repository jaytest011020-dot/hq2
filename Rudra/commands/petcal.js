module.exports.config = {
  name: "petcal",
  version: "2.3.3",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Calculate pet weights (Age 1 → Age 100, linear growth up to 10× Age 1)",
  usePrefix: true,
  commandCategory: "gag tools",
  usages: "/petcalc <ageLevel> <weightKgAtThatAge>",
  cooldowns: 5
};

// 📌 Helper: Usage Example
function usageExample(api, threadID, messageID) {
  return api.sendMessage(
    "❌ Wrong usage!\n\n📌 Correct Usage:\n/petcalc <ageLevel> <weightKgAtThatAge>\n\n💡 Example:\n/petcalc 5 2.7",
    threadID,
    { messageID }
  );
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (args.length < 2) return usageExample(api, threadID, messageID);

  let givenAge = parseInt(args[0]);
  let givenWeight = parseFloat(args[1]);

  if (isNaN(givenAge) || givenAge < 1 || givenAge > 100) {
    return api.sendMessage(
      "⚠️ Age level must be between 1 and 100.",
      threadID,
      { messageID }
    );
  }

  if (isNaN(givenWeight) || givenWeight <= 0) {
    return api.sendMessage(
      "⚠️ Please provide a valid weight (kg).",
      threadID,
      { messageID }
    );
  }

  // Scale factor at the given age (1.0 at Age 1 → 10.0 at Age 100)
  let scaleAtAge = 1 + (givenAge - 1) * (9 / 99);

  // Recalculate the true base weight at Age 1
  let baseWeight = givenWeight / scaleAtAge;

  // Max weight at Age 100
  let maxWeight = baseWeight * 10;

  // Linear growth step per age
  const growthPerAge = (maxWeight - baseWeight) / 99;

  // ✅ Size categories
  let sizeCategory = "Unknown";
  if (baseWeight >= 0.1 && baseWeight <= 0.9) sizeCategory = "🟢 Small";
  else if (baseWeight >= 1.0 && baseWeight <= 2.9) sizeCategory = "🔵 Normal";
  else if (baseWeight >= 3.0 && baseWeight <= 4.9) sizeCategory = "🟡 Good Size";
  else if (baseWeight >= 5.0 && baseWeight <= 6.9) sizeCategory = "🟠 Huge";
  else if (baseWeight >= 7.0 && baseWeight <= 9.9) sizeCategory = "🔴 Titanic";
  else if (baseWeight >= 10.0 && baseWeight <= 100) sizeCategory = "🟣 Godly";

  // Build results
  let result =
    `🐾 Pet Calculator 🐾\n\n` +
    `Input: ${givenWeight} kg (Age ${givenAge})\n` +
    `Calculated Base Weight (Age 1): ${baseWeight.toFixed(2)} kg\n` +
    `Size Category (at Age 1): ${sizeCategory}\n\nEstimated weights:\n`;

  // Show only key ages (1, 10, 20, …, 100 + requested age)
  for (let i = 1; i <= 100; i++) {
    if (i === 1 || i % 10 === 0 || i === givenAge || i === 100) {
      let est = baseWeight + growthPerAge * (i - 1);
      result += `Age ${i}: ${est.toFixed(2)} kg\n`;
    }
  }

  // Highlight the requested age
  let requested = baseWeight + growthPerAge * (givenAge - 1);
  result += `\n➡️ At Age ${givenAge}, your pet weighs: ${requested.toFixed(2)} kg`;

  // Split into chunks if too long
  const chunks = result.match(/[\s\S]{1,1800}/g);
  for (const chunk of chunks) {
    await api.sendMessage(chunk, threadID, { messageID });
  }
};
