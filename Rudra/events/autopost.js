const fetch = require("node-fetch");
const cron = require("node-cron");

module.exports.config = {
  name: "autoPost",
  version: "1.0.1",
  credits: "ChatGPT",
  description: "Auto-post Bible verses every hour",
  eventType: [], // blank kasi di siya reply-based
};

module.exports.onLoad = async function ({ api }) {
  const ownerID = "61559999326713"; // lagay mo yung owner ID

  // Fetch Bible verse
  const fetchBibleVerse = async () => {
    try {
      const res = await fetch("https://kaiz-apis.gleeze.com/api/bible?apikey=71ee3719-dd7d-4a98-8484-eb0bb3081e0f");
      const data = await res.json();
      const { reference } = data;
      const verse = data.verse[0];
      return `📖 ${verse.book_name} ${verse.chapter}:${verse.verse}\n${verse.text}\n\n🔖 Reference: ${reference}`;
    } catch (e) {
      console.error("Error fetching verse:", e);
      return null;
    }
  };

  // Create post
  const createPost = async () => {
    const bibleVerse = await fetchBibleVerse();
    if (!bibleVerse) {
      return api.sendMessage("❌ Failed to fetch Bible verse.", ownerID);
    }

    try {
      const url = await api.createPost({ body: bibleVerse });
      if (url) {
        api.sendMessage(`✅ Auto-post success!\n🔗 ${url}`, ownerID);
      } else {
        api.sendMessage("✅ Auto-post created, no URL returned.", ownerID);
      }
    } catch (error) {
      console.error("Error creating post:", error);
      api.sendMessage(`❌ Error auto-posting: ${error.message}`, ownerID);
    }
  };

  // Schedule every hour
  cron.schedule("0 * * * *", () => {
    console.log("🕒 Auto-post triggered.");
    createPost();
  }, { timezone: "Asia/Manila" });

  console.log("✅ AutoPost loaded: Bible verses every hour.");
};

// optional kung kailangan ng event listener
module.exports.handleEvent = function () {};
