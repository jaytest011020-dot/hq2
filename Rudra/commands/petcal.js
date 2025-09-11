module.exports.config = {
  name: "petcalc",
  version: "2.3.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Calculate pet weights (Age 1 → Age 100, linear growth up to 10× Age 1)",
  usePrefix: true,
  commandCategory: "game",
  usages: "/petcalc <ageLevel> <weightKgAtThatAge>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (args.length < 2) {
