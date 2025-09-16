// database.js
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, get, child } = require("firebase/database");

// Firebase config (galing sa google-services.json mo)
const firebaseConfig = {
  apiKey: "AIzaSyCOGNYc3D7VSWlp3uTC9HCizoUTmaFpuqM",
  authDomain: "mybot-d79df.firebaseapp.com",
  databaseURL: "https://mybot-d79df-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mybot-d79df",
  storageBucket: "mybot-d79df.appspot.com",
  messagingSenderId: "215753443154",
  appId: "1:215753443154:web:b25322ec0b359c5fa15c8b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Function to set data
async function setData(path, value) {
  try {
    await set(ref(db, path), value);
    return true;
  } catch (err) {
    console.error("Error setting data:", err);
    return false;
  }
}

// Function to get data
async function getData(path) {
  try {
    const snapshot = await get(child(ref(db), path));
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return null;
    }
  } catch (err) {
    console.error("Error getting data:", err);
    return null;
  }
}

module.exports = { setData, getData };
