module.exports.config = {
  name: "autogreet",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Auto greetings depending on the time",
  commandCategory: "system",
  usages: "This runs automatically",
  cooldowns: 0
};

const greetings = [
  { hour: 6, msg: "🌅 Good morning!" },
  { hour: 12, msg: "☀️ Good afternoon!" },
  { hour: 18, msg: "🌇 Good evening!" },
  { hour: 22, msg: "🌙 Good night!" }
];

module.exports.onLoad = async function({ api }) {
  console.log("✅ Auto-greet module loaded.");

  setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Only send greeting at exact hour (minute = 0)
    greetings.forEach(greet => {
      if (hour === greet.hour && minute === 0) {
        // Replace with your thread ID(s)
        const threadIDs = ["THREAD_ID_1", "THREAD_ID_2"]; // put your groups here
        threadIDs.forEach(threadID => {
          api.sendMessage(greet.msg, threadID);
        });
      }
    });
  }, 60 * 1000); // check every 1 minute
};
