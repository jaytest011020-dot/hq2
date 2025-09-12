module.exports.config = {
  name: "autogreet",
  version: "1.1.2",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Auto greetings depending on the time",
  commandCategory: "system",
  usages: "This runs automatically",
  cooldowns: 0
};

const greetings = [
  { hour: 6, msg: "🌅 Good morning everyone!" },
  { hour: 12, msg: "☀️ Good afternoon, stay productive!" },
  { hour: 18, msg: "🌇 Good evening, hope you had a great day!" },
  { hour: 22, msg: "🌙 Good night, rest well!" }
];

let autoGreetInterval = null;
let lastSentKey = null; // prevent duplicates

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// helper: get current hour/minute in Asia/Kolkata without moment
function getTimeInKolkata() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60000; // +5:30 hours
  const istDate = new Date(utc + istOffset);
  return {
    hour: istDate.getHours(),
    minute: istDate.getMinutes(),
    full: istDate.toISOString().replace("T", " ").slice(0, 16)
  };
}

module.exports.onLoad = function({ api, Threads }) {
  console.log("✅ Auto-greet module loaded.");

  if (autoGreetInterval) return; // avoid multiple timers

  autoGreetInterval = setInterval(async () => {
    try {
      const { hour, minute, full } = getTimeInKolkata();

      if (minute !== 0) return;

      const greet = greetings.find(g => g.hour === hour);
      if (!greet) return;

      const currentKey = `${hour}:${minute}`;
      if (lastSentKey === currentKey) return; // already sent this hour

      let threads = [];
      try {
        threads = await api.getThreadList(200, null, ["INBOX"]);
      } catch (err) {
        console.error("⚠️ Could not fetch thread list:", err.message);
      }

      const groupThreads = threads.filter(t => t.isGroup);
      let sent = 0;

      for (const t of groupThreads) {
        try {
          await api.sendMessage(greet.msg, t.threadID);
          sent++;
          await sleep(400); // avoid spam/rate limit
        } catch (err) {
          console.error(`❌ Failed to send greeting to ${t.threadID}:`, err.message);
        }
      }

      lastSentKey = currentKey;
      console.log(`✅ Sent "${greet.msg}" to ${sent} groups at ${full} IST`);
    } catch (err) {
      console.error("❌ Auto-greet error:", err.message);
    }
  }, 30 * 1000);
};

module.exports.onUnload = function() {
  if (autoGreetInterval) {
    clearInterval(autoGreetInterval);
    autoGreetInterval = null;
  }
  console.log("✅ Auto-greet module unloaded.");
};
