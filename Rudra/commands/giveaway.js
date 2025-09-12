module.exports.config = {
  name: "giveaway",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT (fix from Priyansh Rajput)",
  description: "Create and manage giveaways",
  commandCategory: "other",
  usages: "[create/details/join/roll/end] [IDGiveAway]",
  cooldowns: 5
};

module.exports.handleReaction = async ({ api, event, handleReaction, Users }) => {
  let data = global.data.GiveAway.get(handleReaction.ID);
  if (!data || data.status !== "open") return;

  // if already joined, ignore
  if (data.joined.includes(event.userID)) return;

  data.joined.push(event.userID);
  global.data.GiveAway.set(handleReaction.ID, data);

  const userInfo = await Users.getInfo(event.userID);
  const name = userInfo.name;

  return api.sendMessage(
    `✅ ${name} joined giveaway #${handleReaction.ID}`,
    event.userID
  );
};

module.exports.run = async ({ api, event, args, Users }) => {
  if (!global.data.GiveAway) global.data.GiveAway = new Map();

  // CREATE
  if (args[0] === "create") {
    let reward = args.slice(1).join(" ");
    if (!reward) return api.sendMessage("❌ Please specify a reward.", event.threadID);

    let ID = (Math.floor(Math.random() * 100000) + 100000).toString().substring(1);
    let creatorName = (await Users.getInfo(event.senderID)).name;

    api.sendMessage(
      `🎁 GIVEAWAY STARTED 🎁\n\n👤 Created by: ${creatorName}\n🏆 Reward: ${reward}\n🆔 ID: #${ID}\n\n📌 React to this message to join!`,
      event.threadID,
      (err, info) => {
        if (err) return;

        let dataGA = {
          ID,
          author: creatorName,
          authorID: event.senderID,
          messageID: info.messageID,
          reward,
          joined: [],
          status: "open"
        };

        global.data.GiveAway.set(ID, dataGA);
        client.handleReaction.push({
          name: module.exports.config.name,
          messageID: info.messageID,
          author: event.senderID,
          ID
        });
      }
    );
  }

  // DETAILS
  else if (args[0] === "details") {
    let ID = args[1]?.replace("#", "");
    if (!ID) return api.sendMessage("❌ Please provide a giveaway ID.", event.threadID);

    let data = global.data.GiveAway.get(ID);
    if (!data) return api.sendMessage("❌ Giveaway not found.", event.threadID);

    return api.sendMessage(
      `🎁 GIVEAWAY DETAILS 🎁\n\n👤 Created by: ${data.author}\n🏆 Reward: ${data.reward}\n🆔 ID: #${data.ID}\n👥 Participants: ${data.joined.length}\n📌 Status: ${data.status}`,
      event.threadID
    );
  }

  // ROLL (pick random winner)
  else if (args[0] === "roll") {
    let ID = args[1]?.replace("#", "");
    if (!ID) return api.sendMessage("❌ Please provide a giveaway ID.", event.threadID);

    let data = global.data.GiveAway.get(ID);
    if (!data) return api.sendMessage("❌ Giveaway not found.", event.threadID);
    if (data.authorID !== event.senderID) return api.sendMessage("❌ Only the creator can roll this giveaway.", event.threadID);
    if (data.joined.length === 0) return api.sendMessage("❌ No participants in this giveaway.", event.threadID);

    let winner = data.joined[Math.floor(Math.random() * data.joined.length)];
    let userInfo = await Users.getInfo(winner);
    let name = userInfo.name;

    return api.sendMessage({
      body: `🎉 Congratulations ${name}!\n\n🏆 You won the giveaway #${data.ID}\nReward: ${data.reward}\n\n📌 Contact: ${data.author} (https://fb.me/${data.authorID})`,
      mentions: [{ tag: name, id: winner }]
    }, event.threadID);
  }

  // END
  else if (args[0] === "end") {
    let ID = args[1]?.replace("#", "");
    if (!ID) return api.sendMessage("❌ Please provide a giveaway ID.", event.threadID);

    let data = global.data.GiveAway.get(ID);
    if (!data) return api.sendMessage("❌ Giveaway not found.", event.threadID);
    if (data.authorID !== event.senderID) return api.sendMessage("❌ Only the creator can end this giveaway.", event.threadID);

    data.status = "ended";
    global.data.GiveAway.set(ID, data);

    api.unsendMessage(data.messageID);
    return api.sendMessage(`✅ Giveaway #${data.ID} ended by ${data.author}`, event.threadID);
  }

  // ERROR
  else {
    return api.sendMessage("❌ Invalid option. Use: create/details/roll/end", event.threadID);
  }
};
