module.exports.config = {
  name: "help",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "august + edited by ChatGPT",
  description: "Guide for new users",
  commandCategory: "system",
  usages: "/help",
  cooldowns: 5
};

const mathSansBold = {
  A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜",
  J: "𝗝", K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥",
  S: "𝗦", T: "𝗧", U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭",
  a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶",
  j: "𝗷", k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿",
  s: "𝘀", t: "𝘁", u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇"
};

module.exports.run = async function ({ api, event, args }) {
  const uid = event.senderID;
  const userName = (await api.getUserInfo(uid))[uid].name;

  const { commands } = global.client;
  const { threadID, messageID } = event;
  const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
  const prefix = threadSetting.hasOwnProperty("PREFIX")
    ? threadSetting.PREFIX
    : global.config.PREFIX;

  const categories = new Set();
  const categorizedCommands = new Map();

  for (const [name, value] of commands) {
    const categoryName = value.config.commandCategory || "Uncategorized";
    if (!categories.has(categoryName)) {
      categories.add(categoryName);
      categorizedCommands.set(categoryName, []);
    }
    categorizedCommands.get(categoryName).push(`│ ✧ ${value.config.name}`);
  }

  let msg = `Hey ${userName}, these are commands that may help your assignments and essays:\n`;

  for (const categoryName of categories) {
    const categoryNameSansBold = categoryName
      .split("")
      .map(c => mathSansBold[c] || c)
      .join("");
    msg += `╭─❍「 ${categoryNameSansBold} 」\n`;
    msg += categorizedCommands.get(categoryName).join("\n");
    msg += "\n╰───────────⟡\n";
  }

  msg += `├─────☾⋆\n│ » Total commands: [ ${commands.size} ]\n│「 ☾⋆ PREFIX: ${prefix} 」\n╰──────────⧕\n\n`;

  const yourUID = "61559999326713";  
  const botOwnerBold = "𝗝𝗮𝘆𝗹𝗼𝗿𝗱 𝗟𝗮 𝗣𝗲ñ𝗮"; 
  msg += `\nBot Owner: ${botOwnerBold}`;

  api.sendMessage(msg, threadID, messageID);

  return api.shareContact(yourUID, event.senderID, threadID);
};
