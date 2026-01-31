/**
 * Guest Storage Service using IndexedDB
 * Stores meals and poops locally for guest users (no account required).
 * Data persists until the user creates an account, at which point
 * it gets migrated to the server and cleared locally.
 */

const DB_NAME = 'gut-feeling-guest';
const DB_VERSION = 1;

let db = null;

export async function initGuestDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains('meals')) {
        const store = database.createObjectStore('meals', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!database.objectStoreNames.contains('poops')) {
        const store = database.createObjectStore('poops', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

async function getDB() {
  if (!db) await initGuestDB();
  return db;
}

export async function saveGuestMeal(foods) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('meals', 'readwrite');
    const store = tx.objectStore('meals');
    const record = { foods, timestamp: new Date().toISOString() };
    const req = store.add(record);
    req.onsuccess = () => resolve({ ...record, id: req.result });
    req.onerror = () => reject(req.error);
  });
}

export async function saveGuestPoop(severity, symptoms) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('poops', 'readwrite');
    const store = tx.objectStore('poops');
    const record = { severity, symptoms: symptoms || [], timestamp: new Date().toISOString() };
    const req = store.add(record);
    req.onsuccess = () => resolve({ ...record, id: req.result });
    req.onerror = () => reject(req.error);
  });
}

export async function getGuestMeals() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('meals', 'readonly');
    const store = tx.objectStore('meals');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    req.onerror = () => reject(req.error);
  });
}

export async function getGuestPoops() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('poops', 'readonly');
    const store = tx.objectStore('poops');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    req.onerror = () => reject(req.error);
  });
}

export async function deleteGuestMeal(id) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('meals', 'readwrite');
    tx.objectStore('meals').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteGuestPoop(id) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('poops', 'readwrite');
    tx.objectStore('poops').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateGuestPoop(id, data) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('poops', 'readwrite');
    const store = tx.objectStore('poops');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) return reject(new Error('Not found'));
      const updated = { ...existing, ...data };
      store.put(updated);
      tx.oncomplete = () => resolve(updated);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearGuestData() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(['meals', 'poops'], 'readwrite');
    tx.objectStore('meals').clear();
    tx.objectStore('poops').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getGuestStats() {
  const meals = await getGuestMeals();
  const poops = await getGuestPoops();

  const dates = new Set();
  meals.forEach(m => dates.add(new Date(m.timestamp).toDateString()));
  poops.forEach(p => dates.add(new Date(p.timestamp).toDateString()));

  return {
    totalMeals: meals.length,
    totalPoops: poops.length,
    daysTracked: dates.size,
    daysCovered: dates.size
  };
}

export async function getAllGuestData() {
  const meals = await getGuestMeals();
  const poops = await getGuestPoops();
  return { meals, poops };
}
