const fetch = require("node-fetch");
const cron = require("node-cron");

module.exports.config = {
    name: "autoPost",
    eventType: [], // walang event na iha-handle, pero required field
    version: "1.0.0",
    credits: "ChatGPT",
    description: "Automatically posts Bible verses every hour"
};

module.exports.run = async function ({ api }) {
    const ownerID = "100030880666720"; // palitan ng UID mo

    // Fetch Bible verse
    const fetchBibleVerse = async () => {
        try {
            const res = await fetch("https://kaiz-apis.gleeze.com/api/bible?apikey=71ee3719-dd7d-4a98-8484-eb0bb3081e0f");
            const data = await res.json();
            const verse = data.verse[0];
            return `📖 ${verse.book_name} ${verse.chapter}:${verse.verse}\n${verse.text}\n\n🔖 Reference: ${data.reference}`;
        } catch (err) {
            console.error("❌ Error fetching Bible verse:", err);
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
            api.sendMessage(`❌ Error auto-posting: ${error.message}`, ownerID);
        }
    };

    // Schedule every hour
    cron.schedule("0 * * * *", () => {
        console.log("🕒 Auto-post triggered");
        createPost();
    }, { timezone: "Asia/Manila" });

    console.log("✅ AutoPost module loaded.");
};
