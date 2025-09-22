// 📌 AUTO-DETECTION WITH AUTO-KICK
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, messageID, senderID, body } = event;
  if (!body) return;

  const text = body.toLowerCase();

  // Split message into words (remove punctuation)
  const words = text.replace(/[^\w\s]/g, "").split(/\s+/);

  let violationType = null;
  let note = "";

  // Detect badwords (whole word only)
  if (badwords.some(word => words.includes(word))) {
    violationType = "Bad Language";
    note = pickRandom(messages.badword);
  }

  // Detect racist words (whole word only)
  if (racistWords.some(word => words.includes(word))) {
    violationType = "Racist/Discriminatory Term";
    note = pickRandom(messages.racist);
  }

  // Detect unauthorized links
  const allowedLinks = [
    "facebook.com",
    "fb.com",
    "facebook.com/groups",
    "fb.com/groups",
    "m.me/j",
    "tiktok.com",
    "youtube.com",
    "youtu.be",
    "roblox.com"
  ];

  if (/https?:\/\/|www\./.test(text)) {
    const isAllowed = allowedLinks.some(link => text.includes(link));
    if (!isAllowed) {
      violationType = "Unauthorized Link";
      note = pickRandom(messages.link);
    }
  }

  if (!violationType) return;

  // Get and update warnings
  let warnings = await getData(`warnings/${threadID}/${senderID}`);
  if (!warnings) warnings = { count: 0 };
  warnings.count++;
  await setData(`warnings/${threadID}/${senderID}`, warnings);

  // Track warned users for /warning list
  let all = await getData(`warnings/${threadID}/_all`) || [];
  if (!all.includes(senderID)) {
    all.push(senderID);
    await setData(`warnings/${threadID}/_all`, all);
  }

  // Get violator name
  const name = await getUserName(senderID, api);

  // 🔔 Fetch admins
  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(a => a.id);
  const adminMentions = [];

  for (const id of adminIDs) {
    if (id !== senderID) {
      const adminName = await getUserName(id, api);
      adminMentions.push({ tag: `@${adminName}`, id });
    }
  }

  const displayAdmins = adminMentions.slice(0, MAX_DISPLAY_ADMINS);
  const extraCount = adminMentions.length - displayAdmins.length;
  const adminLine =
    displayAdmins.map(m => m.tag).join(" | ") +
    (extraCount > 0 ? ` ... (+${extraCount} more)` : "");

  // Format warning message
  let warningNote = formatWarning(name, violationType, note, warnings.count);

  // If user reached 5 warnings, add auto-kick info
  if (warnings.count >= 5) {
    warningNote += "\n\n⚠️ You have reached 5 warnings. Auto Kick will be applied!";
  }

  // Send warning with admin notification
  api.sendMessage(
    {
      body:
        warningNote +
        (adminMentions.length > 0
          ? `\n\n📢 Notifying admins: ${adminLine}`
          : ""),
      mentions: [{ tag: `@${name}`, id: senderID }, ...adminMentions]
    },
    threadID,
    null,
    messageID
  );

  // Auto-kick at 5 warnings
  if (warnings.count >= 5) {
    try {
      await api.removeUserFromGroup(threadID, senderID);
      await api.sendMessage(
        `⚠️ User @${name} has been removed from the group due to 5 warnings.`,
        threadID,
        null,
        messageID,
        { mentions: [{ tag: `@${name}`, id: senderID }] }
      );

      // Optional: reset warnings after kick
      await setData(`warnings/${threadID}/${senderID}`, { count: 0 });
    } catch (err) {
      console.error("Failed to kick user:", err);
    }
  }
};
