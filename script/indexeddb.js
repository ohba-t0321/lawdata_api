const CACHE_EXPIRE_MS = 1000 * 60 * 60 * 24; // 24時間

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("LawCacheDB", 2);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // 既存の "laws" ストアがない場合のみ作成（既にあるときはスキップ）
      if (!db.objectStoreNames.contains("laws")) {
        const store = db.createObjectStore("laws", { keyPath: "lawNo" });
        store.createIndex("lawData", "lawData", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
      // 新しい "lawList" ストア（一覧データ用）を追加
      if (!db.objectStoreNames.contains("lawList")) {
        db.createObjectStore("lawList", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveLawToCache(lawNo, lawData) {
  const db = await openDB();
  const tx = db.transaction("laws", "readwrite");
  const store = tx.objectStore("laws");
  lawNo = decodeURIComponent(lawNo);
  const record = {lawNo, lawData, timestamp: Date.now() };
  store.put(record);
  return tx.complete;
}

async function getLawFromCache(lawNo) {
  const db = await openDB();
  const tx = db.transaction("laws", "readonly");
  const store = tx.objectStore("laws");
  return new Promise((resolve) => {
    lawNo = decodeURIComponent(lawNo);
    const request = store.get(lawNo);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function saveLawListToCache() {
  const db = await openDB();
  const tx = db.transaction("lawList", "readwrite");
  const store = tx.objectStore("lawList");
  const record = {id: "LawList", data: xmlData, timestamp: Date.now() };
  store.put(record);
  return tx.complete;
}

async function getLawListFromCache() {
  const db = await openDB();
  const tx = db.transaction("lawList", "readonly");
  const store = tx.objectStore("lawList");
  return new Promise((resolve) => {
    const request = store.get("LawList");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}
