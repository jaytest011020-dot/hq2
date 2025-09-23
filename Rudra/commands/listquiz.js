const { getData } = require("../../database.js");

module.exports.config = {
  name: "listquiz",
  version: "1.1.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "List all quiz questions in the database",
  usages: "/listquiz",
  commandCategory: "games",
  cooldowns: 3
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID } = event;

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

  // Split long messages into chunks if necessary (Facebook Messenger has limits)
  const chunkSize = 4000;
  for (let i = 0; i < msg.length; i += chunkSize) {
    api.sendMessage(msg.slice(i, i + chunkSize), threadID, messageID);
  }
};
