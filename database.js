// database.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // yung JSON na na-download mo

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mybot-d79df-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();

async function setData(path, value) {
  try {
    await db.ref(path).set(value);
    return true;
  } catch (err) {
    console.error("Error setting data:", err);
    return false;
  }
}

async function getData(path) {
  try {
    const snapshot = await db.ref(path).once("value");
    return snapshot.exists() ? snapshot.val() : null;
  } catch (err) {
    console.error("Error getting data:", err);
    return null;
  }
}

module.exports = { setData, getData };
