import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// 读取组的共享数据
export async function getShared(groupCode, key) {
  try {
    const snap = await getDoc(doc(db, 'g', groupCode, 'd', key));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

// 写入组的共享数据
export async function setShared(groupCode, key, data) {
  await setDoc(doc(db, 'g', groupCode, 'd', key), data);
}

// 实时监听
export function listenShared(groupCode, key, cb) {
  if (!groupCode) return () => {};
  return onSnapshot(doc(db, 'g', groupCode, 'd', key), snap => {
    if (snap.exists()) cb(snap.data());
  });
}
