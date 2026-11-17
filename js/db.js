// Capa de datos única para ambas vistas.
// - Con firebase-config.js completo: Firestore (tiempo real + caché offline) y Firebase Auth.
// - Sin configurar: MODO LOCAL con localStorage, para probar sin backend.
import { firebaseConfig } from './firebase-config.js?v=20261117f';
import { SEMANAS, VOLUNTARIOS, PLANTILLA } from './seed.js?v=20261117f';

const FB_VERSION = '10.12.2';
const FB = `https://www.gstatic.com/firebasejs/${FB_VERSION}`;

export const MODE = firebaseConfig?.apiKey && !firebaseConfig.apiKey.startsWith('TU_') ? 'firebase' : 'local';
export const COLS = ['semanas', 'voluntarios', 'plantilla'];

const ORDER = {
  semanas: (a, b) => (a.fecha || '').localeCompare(b.fecha || ''),
  voluntarios: (a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'),
  plantilla: (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
};

/* ---------------------------- Firebase ---------------------------- */
let core, authMod;

async function fbCore() {
  if (core) return core;
  const [{ initializeApp }, fs] = await Promise.all([import(`${FB}/firebase-app.js`), import(`${FB}/firebase-firestore.js`)]);
  const app = initializeApp(firebaseConfig);
  let db;
  try {
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch {
    db = fs.getFirestore(app);
  }
  return (core = { app, fs, db });
}

async function fbAuth() {
  if (authMod) return authMod;
  const { app } = await fbCore();
  const au = await import(`${FB}/firebase-auth.js`);
  return (authMod = { au, auth: au.getAuth(app) });
}

/* ---------------------------- Local ---------------------------- */
const LS_KEY = 'grupo5_db_v3';
const listeners = new Map(); // col -> Set(cb)

function lsRead() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* datos corruptos → se regeneran */ }
  const data = { semanas: {}, voluntarios: {}, plantilla: {} };
  SEMANAS.forEach(s => (data.semanas[uid()] = structuredClone(s)));
  VOLUNTARIOS.forEach(v => (data.voluntarios[uid()] = { ...v }));
  PLANTILLA.forEach((t, i) => (data.plantilla[uid()] = { ...t, orden: i }));
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  return data;
}
const lsWrite = data => localStorage.setItem(LS_KEY, JSON.stringify(data));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const lsList = col => Object.entries(lsRead()[col] || {}).map(([id, v]) => ({ id, ...v })).sort(ORDER[col]);
const lsEmit = col => listeners.get(col)?.forEach(cb => cb(lsList(col)));
window.addEventListener('storage', e => e.key === LS_KEY && COLS.forEach(lsEmit));

/* ---------------------------- API pública ---------------------------- */

/** Escucha una colección en tiempo real. Devuelve función para desuscribirse. */
export async function subscribe(col, cb, onError = console.error) {
  if (MODE === 'local') {
    if (!listeners.has(col)) listeners.set(col, new Set());
    listeners.get(col).add(cb);
    queueMicrotask(() => cb(lsList(col)));
    return () => listeners.get(col).delete(cb);
  }
  const { fs, db } = await fbCore();
  return fs.onSnapshot(
    fs.collection(db, col),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(ORDER[col])),
    onError
  );
}

/** Crea (sin id) o reemplaza (con id) un documento. Devuelve el id. */
export async function save(col, { id, ...data }) {
  data.actualizado = new Date().toISOString();
  if (MODE === 'local') {
    const all = lsRead();
    const key = id || uid();
    all[col][key] = data;
    lsWrite(all);
    lsEmit(col);
    return key;
  }
  const { fs, db } = await fbCore();
  if (id) {
    await fs.setDoc(fs.doc(db, col, id), data);
    return id;
  }
  return (await fs.addDoc(fs.collection(db, col), data)).id;
}

export async function remove(col, id) {
  if (MODE === 'local') {
    const all = lsRead();
    delete all[col][id];
    lsWrite(all);
    lsEmit(col);
    return;
  }
  const { fs, db } = await fbCore();
  await fs.deleteDoc(fs.doc(db, col, id));
}

/** Guarda varios documentos de una vez (lote atómico en Firestore). */
export async function saveMany(col, docs) {
  if (MODE === 'local') {
    for (const d of docs) await save(col, d);
    return;
  }
  const { fs, db } = await fbCore();
  const batch = fs.writeBatch(db);
  const now = new Date().toISOString();
  docs.forEach(({ id, ...data }) => batch.set(id ? fs.doc(db, col, id) : fs.doc(fs.collection(db, col)), { ...data, actualizado: now }));
  await batch.commit();
}

/** Carga los datos iniciales en una BD vacía. */
export async function seed() {
  await saveMany('plantilla', PLANTILLA.map((t, i) => ({ ...t, orden: i })));
  await saveMany('voluntarios', VOLUNTARIOS);
  await saveMany('semanas', structuredClone(SEMANAS));
}

/* ---------------------------- Autenticación ---------------------------- */

export async function onAuth(cb) {
  if (MODE === 'local') return cb({ email: 'modo-local', local: true });
  const { au, auth } = await fbAuth();
  au.onAuthStateChanged(auth, cb);
}

export async function login(email, password) {
  const { au, auth } = await fbAuth();
  return au.signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  if (MODE === 'local') return;
  const { au, auth } = await fbAuth();
  return au.signOut(auth);
}

/** Un usuario es admin si existe el documento admins/{email} (lo crea el dueño en la consola). */
export async function isAdmin(user) {
  if (!user) return false;
  if (MODE === 'local') return true;
  const { fs, db } = await fbCore();
  try {
    return (await fs.getDoc(fs.doc(db, 'admins', user.email.toLowerCase()))).exists();
  } catch {
    return false;
  }
}
