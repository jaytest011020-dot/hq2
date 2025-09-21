const axios = require("axios");
const cheerio = require("cheerio");

module.exports.config = {
  name: "values",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Check Grow a Garden item value",
  commandCategory: "games",
  usages: "/values <itemName>",
  cooldowns: 5,
};

module.exports.run = async ({ api, event, args }) => {
  const itemName = args.join(" ");
  if (!itemName) {
    return api.sendMessage("❌ Please provide an item name. Example: /values carrot", event.threadID, event.messageID);
  }

  try {
    // Step 1: Fetch homepage
    const homepage = await axios.get("https://growagarden.gg/value-list");
    const $ = cheerio.load(homepage.data);
    const scripts = $("script#__NEXT_DATA__").html();
    const parsed = JSON.parse(scripts);
    const buildId = parsed.buildId;

    // Step 2: Fetch value-list.json
    const jsonUrl = `https://growagarden.gg/_next/data/${buildId}/value-list.json`;
    const valueData = await axios.get(jsonUrl);
    const items = valueData.data.pageProps.items;

    // Step 3: Search item
    const item = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());

    if (!item) {
      return api.sendMessage(`❌ Item "${itemName}" not found.`, event.threadID, event.messageID);
    }

    // Step 4: Return result
    const msg = `🌱 Item: ${item.name}\n💰 Value: ${item.value}`;
    api.sendMessage(msg, event.threadID, event.messageID);

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Error fetching values. Try again later.", event.threadID, event.messageID);
  }
};
