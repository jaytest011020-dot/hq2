const fs = require("fs");
const path = require("path");
const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "quiz",
  version: "1.2.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Multiplayer quiz with coin betting integrated with bank system",
  usages: "/quiz <bet> to start, /quiz to join",
  commandCategory: "games",
  cooldowns: 3
};

const activeQuizzes = {};

async function getUserName(uid, api, Users) {
  let cachedName = global.data.userName.get(uid);
  if (cachedName) return cachedName;
  try {
    const name = await Users.getName(uid) || `FB-User(${uid})`;
    global.data.userName.set(uid, name);
    return name;
  } catch (err) {}
  const fallbackName = `FB-User(${uid})`;
  global.data.userName.set(uid, fallbackName);
  return fallbackName;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID } = event;

  if (!activeQuizzes[threadID]) {
    // Starting a new quiz
    let bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0)
      return api.sendMessage("❌ Usage: /quiz <bet> to start a new quiz.", threadID);

    const starterBank = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0 };
    if (starterBank.balance < bet)
      return api.sendMessage("❌ You don't have enough coins to start the quiz.", threadID);

    starterBank.balance -= bet;
    await setData(`bank/${threadID}/${senderID}`, starterBank);

    const quizData = await getData("/quiz/qna") || [];
    if (!quizData.length) return api.sendMessage("❌ No questions in database.", threadID);

    const questions = shuffleArray(quizData).slice(0, 5);

    activeQuizzes[threadID] = {
      starter: senderID,
      bet,
      started: false,
      currentQ: 0,
      questions,
      players: { [senderID]: { correct: 0 } },
      answers: {}
    };

    // Schedule quiz start after 1 minute
    setTimeout(async () => {
      const quiz = activeQuizzes[threadID];
      if (!quiz) return;

      const playerIDs = Object.keys(quiz.players);
      if (playerIDs.length <= 1) {
        // Refund starter
        const starterBank = (await getData(`bank/${threadID}/${quiz.starter}`)) || { balance: 0 };
        starterBank.balance += quiz.bet;
        await setData(`bank/${threadID}/${quiz.starter}`, starterBank);
        delete activeQuizzes[threadID];
        return api.sendMessage("❌ Not enough players joined. Bet refunded.", threadID);
      }

      quiz.started = true;
      askQuestion(api, threadID, Users);
    }, 60000);

    return api.sendMessage(
      `📝 Quiz starting in 1 minute! Type /quiz to join.\n💰 Bet: ${bet} coins`,
      threadID
    );
  } else {
    // Joining existing quiz
    const quiz = activeQuizzes[threadID];
    if (quiz.started) return api.sendMessage("❌ Quiz already started!", threadID);
    if (quiz.players[senderID]) return api.sendMessage("❌ You already joined!", threadID);

    const playerBank = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0 };
    if (playerBank.balance < quiz.bet) return api.sendMessage("❌ Not enough coins to join.", threadID);

    playerBank.balance -= quiz.bet;
    await setData(`bank/${threadID}/${senderID}`, playerBank);
    quiz.players[senderID] = { correct: 0 };

    return api.sendMessage(`✅ You joined the quiz!`, threadID);
  }
};

// Function to send/resend question with reminders
async function sendQuestionWithReminders(api, threadID, Users) {
  const quiz = activeQuizzes[threadID];
  if (!quiz || quiz.currentQ >= quiz.questions.length) return;

  const q = quiz.questions[quiz.currentQ];
  const uids = Object.keys(quiz.players);
  const userInfo = {};
  for (let uid of uids) userInfo[uid] = await getUserName(uid, api, Users);

  let msg = `❓ Question ${quiz.currentQ + 1}/${quiz.questions.length} ❓\n\n${q.question}\n\n`;
  msg += `A. ${q.a}\nB. ${q.b}\nC. ${q.c}\nD. ${q.d}\n\n`;

  msg += `📝 Answered:\n`;
  uids.forEach(uid => {
    if (quiz.answers[uid]) msg += `${userInfo[uid]} ✅\n`;
  });

  const remaining = uids.filter(uid => !quiz.answers[uid]);
  if (remaining.length) {
    msg += `\n⏱ Waiting for ${remaining.length} players: ${remaining.map(uid => userInfo[uid]).join(", ")}\n`;
  }

  api.sendMessage(msg, threadID);
}

// Ask question with 30-second timer
async function askQuestion(api, threadID, Users) {
  const quiz = activeQuizzes[threadID];
  if (!quiz) return;
  if (quiz.currentQ >= quiz.questions.length) return endQuiz(api, threadID, Users);

  quiz.answers = {}; // reset answers

  await sendQuestionWithReminders(api, threadID, Users);

  setTimeout(async () => {
    const q = quiz.questions[quiz.currentQ];
    const correctAnswer = q.answer.toLowerCase();
    const uids = Object.keys(quiz.players);
    const userInfo = {};
    for (let uid of uids) userInfo[uid] = await getUserName(uid, api, Users);

    let resultMsg = `✅ Correct Answer: ${correctAnswer.toUpperCase()}\n\n`;
    uids.forEach(uid => {
      if (quiz.answers[uid] === correctAnswer) quiz.players[uid].correct += 1;
      resultMsg += `${userInfo[uid]} - ${quiz.answers[uid] === correctAnswer ? "✅" : "❌"}\n`;
    });

    resultMsg += `\n📊 Leaderboard:\n`;
    const leaderboard = uids.sort((a,b) => quiz.players[b].correct - quiz.players[a].correct);
    leaderboard.forEach(uid => {
      resultMsg += `${userInfo[uid]} - ${quiz.players[uid].correct} correct\n`;
    });

    api.sendMessage(resultMsg, threadID);
    quiz.currentQ += 1;
    setTimeout(() => askQuestion(api, threadID, Users), 5000);
  }, 30000); // 30 seconds
}

// Handle player replies
module.exports.handleReply = async function({ api, event, Users }) {
  const { threadID, senderID, body } = event;
  const quiz = activeQuizzes[threadID];
  if (!quiz || !quiz.started) return;
  if (!quiz.players[senderID]) return;

  const answer = body.trim().toLowerCase();
  if (!["a","b","c","d"].includes(answer)) return;

  quiz.answers[senderID] = answer; // update answer immediately
  await sendQuestionWithReminders(api, threadID, Users); // resend question for reminders
}

// End the quiz and reward winners
async function endQuiz(api, threadID, Users) {
  const quiz = activeQuizzes[threadID];
  if (!quiz) return;

  const uids = Object.keys(quiz.players);
  const userInfo = {};
  for (let uid of uids) userInfo[uid] = await getUserName(uid, api, Users);

  const maxCorrect = Math.max(...uids.map(uid => quiz.players[uid].correct));
  const winners = uids.filter(uid => quiz.players[uid].correct === maxCorrect);

  const totalPrize = quiz.bet * uids.length;
  const reward = Math.floor(totalPrize / winners.length);

  for (let uid of winners) {
    const bank = (await getData(`bank/${threadID}/${uid}`)) || { balance: 0 };
    bank.balance += reward;
    await setData(`bank/${threadID}/${uid}`, bank);
  }

  let msg = `🏆 Quiz Finished!\n\nWinners:\n`;
  winners.forEach(uid => msg += `${userInfo[uid]} - ${quiz.players[uid].correct} correct\n`);
  msg += `\n💰 Each winner received ${reward} coins!`;

  api.sendMessage(msg, threadID);
  delete activeQuizzes[threadID];
      }
