const { getData } = require("../../database.js");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "pair",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭 + Jaylord La Peña + ChatGPT",
  description: "Random pairing with fun percentage",
  commandCategory: "fun",
  usages: "",
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "canvas": ""
  },
  cooldowns: 0
};

module.exports.run = async function ({ args, Users, Threads, api, event }) {
  const { loadImage, createCanvas } = require("canvas");
  const axios = require("axios");

  // 🔍 Maintenance check
  const status = await getData("/maintenance");
  if (status?.enabled) {
    const mp4Path = path.join(__dirname, "cache", "AI data.mp4");
    return api.sendMessage(
      {
        body: "🚧 Bot is under MAINTENANCE. Pair command is temporarily disabled.",
        attachment: fs.existsSync(mp4Path) ? fs.createReadStream(mp4Path) : null
      },
      event.threadID,
      event.messageID
    );
  }

  let pathImg = __dirname + "/cache/background.png";
  let pathAvt1 = __dirname + "/cache/Avtmot.png";
  let pathAvt2 = __dirname + "/cache/Avthai.png";

  var id1 = event.senderID;
  var name1 = await Users.getNameUser(id1);
  var ThreadInfo = await api.getThreadInfo(event.threadID);
  var all = ThreadInfo.userInfo;

  for (let c of all) {
    if (c.id == id1) var gender1 = c.gender;
  }

  const botID = api.getCurrentUserID();
  let ungvien = [];

  if (gender1 == "FEMALE") {
    for (let u of all) {
      if (u.gender == "MALE") {
        if (u.id !== id1 && u.id !== botID) ungvien.push(u.id);
      }
    }
  } else if (gender1 == "MALE") {
    for (let u of all) {
      if (u.gender == "FEMALE") {
        if (u.id !== id1 && u.id !== botID) ungvien.push(u.id);
      }
    }
  } else {
    for (let u of all) {
      if (u.id !== id1 && u.id !== botID) ungvien.push(u.id);
    }
  }

  if (ungvien.length === 0) {
    return api.sendMessage("⚠️ No valid partner found in this group.", event.threadID, event.messageID);
  }

  var id2 = ungvien[Math.floor(Math.random() * ungvien.length)];
  var name2 = await Users.getNameUser(id2);
  var rd1 = Math.floor(Math.random() * 100) + 1;
  var cc = ["0", "-1", "99,99", "-99", "-100", "101", "0,01"];
  var rd2 = cc[Math.floor(Math.random() * cc.length)];
  var djtme = [`${rd1}`, `${rd1}`, `${rd1}`, `${rd1}`, `${rd1}`, `${rd2}`, `${rd1}`, `${rd1}`, `${rd1}`, `${rd1}`];
  var tile = djtme[Math.floor(Math.random() * djtme.length)];

  var background = [
    "https://i.postimg.cc/wjJ29HRB/background1.png",
    "https://i.postimg.cc/zf4Pnshv/background2.png",
    "https://i.postimg.cc/5tXRQ46D/background3.png"
  ];
  var rd = background[Math.floor(Math.random() * background.length)];

  let getAvtmot = (
    await axios.get(
      `https://graph.facebook.com/${id1}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
      { responseType: "arraybuffer" }
    )
  ).data;
  fs.writeFileSync(pathAvt1, Buffer.from(getAvtmot, "utf-8"));

  let getAvthai = (
    await axios.get(
      `https://graph.facebook.com/${id2}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
      { responseType: "arraybuffer" }
    )
  ).data;
  fs.writeFileSync(pathAvt2, Buffer.from(getAvthai, "utf-8"));

  let getbackground = (
    await axios.get(`${rd}`, {
      responseType: "arraybuffer",
    })
  ).data;
  fs.writeFileSync(pathImg, Buffer.from(getbackground, "utf-8"));

  let baseImage = await loadImage(pathImg);
  let baseAvt1 = await loadImage(pathAvt1);
  let baseAvt2 = await loadImage(pathAvt2);
  let canvas = createCanvas(baseImage.width, baseImage.height);
  let ctx = canvas.getContext("2d");
  ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(baseAvt1, 100, 150, 300, 300);
  ctx.drawImage(baseAvt2, 900, 150, 300, 300);

  const imageBuffer = canvas.toBuffer();
  fs.writeFileSync(pathImg, imageBuffer);
  fs.removeSync(pathAvt1);
  fs.removeSync(pathAvt2);

  return api.sendMessage(
    {
      body: `💘 Congratulations ${name1}, you are paired with ${name2}!\n❤️ Compatibility: ${tile}%`,
      mentions: [{ tag: `${name2}`, id: id2 }],
      attachment: fs.createReadStream(pathImg)
    },
    event.threadID,
    () => fs.unlinkSync(pathImg),
    event.messageID
  );
};
