const axios = require("axios");
const cheerio = require("cheerio");

module.exports.config = {
  name: "values",
  version: "1.0.1",
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

    // Step 2: Extract buildId (debug log)
    let buildId = null;
    const scripts = $("script#__NEXT_DATA__").html();
    if (scripts) {
      const parsed = JSON.parse(scripts);
      buildId = parsed.buildId;
    }

    if (!buildId) {
      console.log("⚠️ BuildId not found in __NEXT_DATA__, trying fallback…");

      // fallback: get from inline JS
      const html = homepage.data;
      const match = html.match(/"buildId":"([^"]+)"/);
      if (match) buildId = match[1];
    }

    if (!buildId) {
      return api.sendMessage("❌ Could not find buildId.", event.threadID, event.messageID);
    }

    console.log("✅ Found buildId:", buildId);

    // Step 3: Fetch value-list.json
    const jsonUrl = `https://growagarden.gg/_next/data/${buildId}/value-list.json`;
    console.log("🔗 Fetching:", jsonUrl);

    const valueData = await axios.get(jsonUrl);
    const items = valueData.data.pageProps.items;

    if (!items) {
      return api.sendMessage("❌ Could not load item list.", event.threadID, event.messageID);
    }

    // Step 4: Search item (case-insensitive)
    const item = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());

    if (!item) {
      return api.sendMessage(`❌ Item "${itemName}" not found.`, event.threadID, event.messageID);
    }

    // Step 5: Output
    const msg = `🌱 Item: ${item.name}\n💰 Value: ${item.value}`;
    api.sendMessage(msg, event.threadID, event.messageID);

  } catch (err) {
    console.error("[VALUES ERROR]", err.message);
    api.sendMessage("❌ Error fetching values. Check console for details.", event.threadID, event.messageID);
  }
};
