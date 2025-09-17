const fs = require("fs");
const fetch = require('node-fetch');  // Import node-fetch for API requests
const cron = require('node-cron');  // For scheduling tasks

module.exports = {
    name: "autoPost", // Event name
    execute: async (api, event) => {
        console.log("Auto-post event triggered.");
    },
    onStart: async (api) => {
        const ownerID = "100030880666720";  // Owner's user ID

        // Function to fetch a Bible verse from the API
        const fetchBibleVerse = async () => {
            try {
                const response = await fetch("https://kaiz-apis.gleeze.com/api/bible?apikey=71ee3719-dd7d-4a98-8484-eb0bb3081e0f");
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();

                // Extract the relevant parts of the response
                const reference = data.reference;
                const verse = data.verse[0].text;
                const bookName = data.verse[0].book_name;
                const chapter = data.verse[0].chapter;
                const verseNum = data.verse[0].verse;

                return `📖 ${bookName} ${chapter}:${verseNum} - ${verse}\nReference: ${reference}`;
            } catch (error) {
                console.error("Error fetching Bible verse:", error);
                return null;
            }
        };

        // Function to create a post with a Bible verse
        const createPost = async () => {
            const bibleVerse = await fetchBibleVerse();

            if (bibleVerse) {
                api.createPost({ body: bibleVerse })
                    .then((url) => {
                        if (url) {
                            console.log(`✅ Post created successfully!\n🔗 Post URL: ${url}`);
                            api.sendMessage(
                                `✅ Auto-post created successfully!\n🔗 Post URL: ${url}`,
                                ownerID
                            );
                        } else {
                            console.log("✅ Post created, but no URL was returned.");
                            api.sendMessage(
                                "✅ Auto-post created, but no URL was returned.",
                                ownerID
                            );
                        }
                    })
                    .catch((error) => {
                        if (error?.data?.story_create?.story?.url) {
                            console.log(
                                `✅ Post created successfully!\n🔗 Post URL: ${error.data.story_create.story.url}\n⚠️ (Note: Post created with server warnings)`
                            );
                            api.sendMessage(
                                `✅ Auto-post created successfully!\n🔗 Post URL: ${error.data.story_create.story.url}\n⚠️ (Note: Post created with server warnings)`,
                                ownerID
                            );
                        } else {
                            let errorMessage = "❌ An unknown error occurred.";
                            if (error?.errors?.length > 0) {
                                errorMessage = error.errors.map((e) => e.message).join(" ");
                            } else if (error.message) {
                                errorMessage = error.message;
                            }
                            console.log(`❌ Error creating post:\n${errorMessage}`);
                            api.sendMessage(
                                `❌ Error creating auto-post:\n${errorMessage}`,
                                ownerID
                            );
                        }
                    });
            } else {
                console.log("❌ Failed to fetch Bible verse.");
                api.sendMessage("❌ Failed to fetch Bible verse for auto-post.", ownerID);
            }
        };

        // Define the auto-post schedules
        const autopostSchedules = [
            { cronTime: '0 * * * *' }, // Every hour at the start of the hour
        ];

        // Schedule the auto-posts
        for (const schedule of autopostSchedules) {
            cron.schedule(schedule.cronTime, () => {
                console.log(`🕒 Scheduled auto-post triggered at ${schedule.cronTime}.`);
                createPost();
            }, {
                timezone: "Asia/Manila" // Set the timezone to Philippine Time
            });
        }

        console.log("✅ Auto-post scheduler started. Posts will be created every hour.");
    },
};
