// database.js
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, get, child, update } = require("firebase/database");

// 🔹 Firebase config mo (kukunin sa Firebase Console → Project Settings → General → SDK setup)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

module.exports = {
  async set(path, value) {
    await set(ref(db, path), value);
  },

  async get(path) {
    const snapshot = await get(child(ref(db), path));
    return snapshot.exists() ? snapshot.val() : null;
  },

  async update(path, value) {
    await update(ref(db, path), value);
  }
};
