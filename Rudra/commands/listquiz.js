const { getData } = require("../../database.js");

module.exports.config = {
  name: "listquiz",
  version: "1.0.0",
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
    msg += `${index + 1}. ${q.question}\n`;
    msg += `A: ${q.a}\nB: ${q.b}\nC: ${q.c}\nD: ${q.d}\nAnswer: ${q.answer.toUpperCase()}\n\n`;
  });

  return api.sendMessage(msg, threadID, messageID);
};
