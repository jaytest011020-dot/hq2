module.exports.config = {
  name: "autobible",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Automatically sends Bible verses at specific Philippine times",
  commandCategory: "system",
  usages: "/autobible",
  cooldowns: 0
};

const axios = require("axios");
let autoBibleInterval = null;
let lastSentKey = null;

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// ⏰ Get PH Time (UTC+8)
function getPhilTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const offset = 8 * 60 * 60000; // UTC+8 Philippines
  return new Date(utc + offset);
}

// 📌 Schedule (oras + dagdag na mensahe)
const verseSchedule = {
  "4:0": "🌅 Good morning! Start your day with God’s word.",
  "8:0": "☀️ Start your day with faith and strength!",
  "12:0": "🍽 Lunch time blessings! May God fill you with peace.",
  "15:0": "⛅ Keep going, God is with you.",
  "19:0": "🌇 Good evening! Stay blessed in His grace.",
  "22:0": "🌙 Good night, rest in His peace."
};

// 🔹 Manual Command (/autobible)
module.exports.run = async function ({ api, event }) {
  const msg = 
`📖 AutoBible is automatic. Verses will be posted at:

⏰ 4:00 AM
⏰ 8:00 AM
⏰ 12:00 PM
⏰ 3:00 PM
⏰ 7:00 PM
⏰ 10:00 PM

(Timezone: Philippines UTC+8)`;

  return api.sendMessage(msg, event.threadID, event.messageID);
};

// 🔹 Autostart loop
module.exports.onLoad = function ({ api }) {
  console.log("✅ AutoBible loaded.");

  if (autoBibleInterval) return; // avoid double start

  autoBibleInterval = setInterval(async () => {
    try {
      const now = getPhilTime();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const key = `${hour}:${minute}`;

      if (!verseSchedule[key]) return; // only on schedule
      if (lastSentKey === key) return; // avoid duplicate within same minute
      lastSentKey = key;

      // 📖 Fetch random verse
      let verseText = "";
      try {
        const res = await axios.get("https://labs.bible.org/api/?passage=random&type=json");
        if (res.data && res.data[0]) {
          verseText = `${res.data[0].bookname} ${res.data[0].chapter}:${res.data[0].verse} - ${res.data[0].text}`;
        } else {
          verseText = "📖 Bible verse could not be fetched.";
        }
      } catch (e) {
        verseText = "⚠️ Failed to fetch verse.";
      }

      const finalMsg = `📖 ${verseText}\n\n${verseSchedule[key]}`;

      // 📤 Send to all groups
      let threads = [];
      try {
        threads = await api.getThreadList(50, null, ["INBOX"]);
      } catch (err) {
        return console.error("⚠️ Could not fetch thread list:", err.message);
      }

      const groups = threads.filter(t => t.isGroup);
      for (const g of groups) {
        api.sendMessage(finalMsg, g.threadID, (err) => {
          if (err) console.error(`❌ Failed to send verse to ${g.threadID}:`, err.message);
        });
        await sleep(500);
      }

      console.log(`✅ Sent AutoBible verse at ${key}`);
    } catch (err) {
      console.error("❌ AutoBible error:", err.message);
    }
  }, 30 * 1000); // check every 30s
};

module.exports.onUnload = function () {
  if (autoBibleInterval) {
    clearInterval(autoBibleInterval);
    autoBibleInterval = null;
  }
  console.log("🛑 AutoBible stopped.");
};
