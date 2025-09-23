const { getData } = require("../../database.js");

module.exports.config = {
  name: "listquiz",
  version: "1.3.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "List all quiz questions in the database (restricted users only)",
  usages: "/listquiz",
  commandCategory: "games",
  cooldowns: 3
};

const ALLOWED_USERS = [
  "61559999326713",
  "61563731477181"
];

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, senderID } = event;

  if (!ALLOWED_USERS.includes(senderID)) {
    return api.sendMessage("❌ You are not allowed to use this command.", threadID, messageID);
  }

  const quizData = (await getData("/quiz/qna")) || [];

  if (!quizData.length) {
    return api.sendMessage("❌ No questions found in the quiz database.", threadID, messageID);
  }

  let msg = `📋 Quiz Questions (Total: ${quizData.length})\n\n`;

  quizData.forEach((q, index) => {
    const question = q.question || "No question provided";
    const a = q.a || "N/A";
    const b = q.b || "N/A";
    const c = q.c || "N/A";
    const d = q.d || "N/A";
    const answer = (q.answer || "?").toUpperCase();

    msg += `${index + 1}. ${question}\n`;
    msg += `A: ${a}\nB: ${b}\nC: ${c}\nD: ${d}\n✅ Answer: ${answer}\n\n`;
  });

  // Split long messages
  const chunkSize = 4000;
  for (let i = 0; i < msg.length; i += chunkSize) {
    api.sendMessage(msg.slice(i, i + chunkSize), threadID, messageID);
  }
};
