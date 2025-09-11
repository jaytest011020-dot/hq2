module.exports.config = {
 name: "antiout",
 eventType: ["log:unsubscribe"],
 version: "0.0.1",
 credits: "Priyansh Rajput",
 description: "Listen events"
};

module.exports.run = async({ event, api, Threads, Users }) => {
 let data = (await Threads.getData(event.threadID)).data || {};
 if (data.antiout == false) return;
 if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;

 const name = global.data.userName.get(event.logMessageData.leftParticipantFbId) 
   || await Users.getNameUser(event.logMessageData.leftParticipantFbId);

 const type = (event.author == event.logMessageData.leftParticipantFbId) 
   ? "self-separation" 
   : "Someone kicked them out";

 if (type == "self-separation") {
  api.addUserToGroup(event.logMessageData.leftParticipantFbId, event.threadID, (error, info) => {
   if (error) {
    api.sendMessage(`⚠️ Anti-out is ON but I couldn’t add ${name} back to the group.`, event.threadID);
   } else {
    api.sendMessage(`✅ Anti-out is ON!\n${name} tried to leave but I added them back to the group.`, event.threadID);
   }
  });
 }
}
