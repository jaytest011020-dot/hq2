const inviterID = newP.inviterID || actorID; // fallback sa actor
// ✅ Check if valid inviter (hindi sarili niya)
if (inviterID && inviterID !== newUserID) {
  if (!gcData[inviterID]) gcData[inviterID] = { count: 0 };
  gcData[inviterID].count += 1;
  await setData(`invite/${threadID}`, gcData);

  const inviterName = await getUserName(inviterID, api, Users);
  const newUserName = await getUserName(newUserID, api, Users);

  msg = `╭━[INVITE NOTIF]━╮
┃ 👤 Inviter: ${inviterName}
┃ ➕ Invited: ${newUserName}
┃ 📊 Total Invites: ${gcData[inviterID].count}
╰━━━━━━━━━━━━━━━━━━━━╯`;
} else {
  // ✅ True join via link
  const joinerName = await getUserName(newUserID, api, Users);
  msg = `╭━[JOIN NOTIF]━╮
┃ 🚪 ${joinerName} joined the group via link.
╰━━━━━━━━━━━━━━━━━━━━╯`;
}
