module.exports.config = {
  name: "autogreet",
  version: "1.1.0",
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

module.exports.onLoad = function({ api }) {
  console.log("✅ Auto-greet module loaded.");

  // Run every 1 minute
  setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    if (minute === 0) {
      const greet = greetings.find(g => g.hour === hour);
      if (greet) {
        try {
          const threads = await api.getThreadList(100, null, ["INBOX"]);
          const groupThreads = threads.filter(t => t.isGroup); // only group chats

          for (const thread of groupThreads) {
            api.sendMessage(greet.msg, thread.threadID);
          }

          console.log(`✅ Sent greeting: "${greet.msg}" to ${groupThreads.length} groups.`);
        } catch (err) {
          console.error("❌ Auto-greet error:", err);
        }
      }
    }
  }, 60 * 1000);
};
