// firebase.js - Synchronisation automatique Potager v5
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDU2n_yXwYtFL7GrxZmHiqb6o1ihhmuBkU",
    authDomain: "potager-v4.firebaseapp.com",
    databaseURL: "https://potager-v4-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "potager-v4",
    storageBucket: "potager-v4.firebasestorage.app",
    messagingSenderId: "604451790592",
    appId: "1:604451790592:web:7f9c8a43b8ab0f8e3c5de5",
    measurementId: "G-7ZWWZH18J0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Identifiant utilisateur (unique localement)
const userId = localStorage.getItem("userId") || crypto.randomUUID();
localStorage.setItem("userId", userId);

// Sauvegarde des données sur Firebase
export async function syncToCloud(data) {
  try {
    await set(ref(db, `potager/${userId}`), data);
    console.log("✅ Données sauvegardées sur Firebase");
  } catch (err) {
    console.error("⚠️ Erreur de sync Firebase:", err);
  }
}

// Chargement depuis le cloud
export async function loadFromCloud() {
  try {
    const snapshot = await get(child(ref(db), `potager/${userId}`));
    return snapshot.exists() ? snapshot.val() : [];
  } catch (err) {
    console.error("⚠️ Erreur de lecture Firebase:", err);
    return [];
  }
}
