import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const getUid = () => {
  let uid = localStorage.getItem('ht-uid');
  if (!uid) { uid = Math.random().toString(36).slice(2, 11); localStorage.setItem('ht-uid', uid); }
  return uid;
};

const getGroup = () => localStorage.getItem('ht-group') || '';
const setGroup = (code) => localStorage.setItem('ht-group', code);

const storage = {
  async get(key, shared) {
    try {
      if (shared) {
        const code = getGroup();
        if (!code) return null;
        const snap = await getDoc(doc(db, 'groups', code, 'data', key));
        return snap.exists() ? { value: snap.data().value } : null;
      }
      const snap = await getDoc(doc(db, 'users', getUid(), 'data', key));
      return snap.exists() ? { value: snap.data().value } : null;
    } catch { return null; }
  },

  async set(key, value, shared) {
    try {
      if (shared) {
        const code = getGroup();
        if (!code) return null;
        await setDoc(doc(db, 'groups', code, 'data', key), { value, t: Date.now() });
      } else {
        await setDoc(doc(db, 'users', getUid(), 'data', key), { value });
      }
      return { key, value, shared };
    } catch { return null; }
  },

  async delete(key, shared) {
    try {
      if (shared) {
        const code = getGroup();
        if (code) await deleteDoc(doc(db, 'groups', code, 'data', key));
      } else {
        await deleteDoc(doc(db, 'users', getUid(), 'data', key));
      }
      return { key, deleted: true };
    } catch { return null; }
  },

  // 实时监听共享数据
  listen(key, callback) {
    const code = getGroup();
    if (!code) return () => {};
    return onSnapshot(doc(db, 'groups', code, 'data', key), snap => {
      if (snap.exists()) callback(snap.data().value);
    });
  },

  getGroup,
  setGroup,
};

export default storage;
