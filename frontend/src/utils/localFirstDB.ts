import Dexie, { Table } from 'dexie';
import axios from 'axios';
import { API_URL } from '@/utils/api';

// 1. DEFINISI DATABASE LOKAL DI MEMORI DEVICE USER (IndexedDB)
export interface LocalQuestion {
  id?: string;
  localId?: number;
  subjectName: string;
  type: 'MULTIPLE_CHOICE' | 'ESSAY';
  text: string;
  options: any;
  correctAnswer: string;
  isSynced: boolean; // Flag penanda apakah data sudah aman ter-sync ke server pusat
  updatedAt: number;
}

class TeacherLocalDatabase extends Dexie {
  questions!: Table<LocalQuestion>;

  constructor() {
    super('CBT_Teacher_LocalDB');
    this.version(1).stores({
      // Indexing di memori perangkat user untuk pencarian super cepat
      questions: '++localId, id, subjectName, isSynced, updatedAt'
    });
  }
}

export const localDB = new TeacherLocalDatabase();

// 2. FUNGSI SIMPAN KE DEVICE (OFFLINE-FIRST) - SANGAT CEPAT (< 1 ms)
export async function saveQuestionToDevice(question: Omit<LocalQuestion, 'isSynced' | 'updatedAt'>) {
  try {
    const localData: LocalQuestion = {
      ...question,
      isSynced: false,
      updatedAt: Date.now()
    };

    // Simpan langsung ke memori lokal browser/device Guru
    const localId = await localDB.questions.add(localData);
    console.log(`✅ Soal berhasil disimpan di memori device lokal (ID: ${localId})`);

    // Coba sync ke server jika ada koneksi
    if (navigator.onLine) {
      syncLocalDataToServer();
    }

    return localId;
  } catch (err) {
    console.error('Gagal menyimpan ke memori device:', err);
    throw err;
  }
}

// 3. FUNGSI AMBIL SOAL DARI MEMORI DEVICE (TIDAK PERLU SERVER)
export async function getQuestionsFromDevice(subjectName: string) {
  return await localDB.questions
    .where('subjectName')
    .equalsIgnoreCase(subjectName)
    .toArray();
}

// 4. BACKGROUND SYNC ENGINE (MENYINKRONKAN KE SERVER PUSAT JIKA ONLINE)
export async function syncLocalDataToServer() {
  if (!navigator.onLine) {
    console.log('ℹ️ Perangkat offline. Sinkronisasi ditunda.');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) return;

  // Ambil semua data yang belum ter-sync ke server pusat
  const unsyncedQuestions = await localDB.questions.where('isSynced').equals(0).toArray();

  if (unsyncedQuestions.length === 0) return;

  try {
    console.log(`🔄 Menyinkronkan ${unsyncedQuestions.length} soal ke Server Pusat...`);

    // Kelompokkan per Mata Pelajaran
    const groupedBySubject = unsyncedQuestions.reduce((acc: any, q) => {
      acc[q.subjectName] = acc[q.subjectName] || [];
      acc[q.subjectName].push(q);
      return acc;
    }, {});

    for (const subjectName of Object.keys(groupedBySubject)) {
      const questionsList = groupedBySubject[subjectName];

      await axios.post(`${API_URL}/api/teacher/questions/batch`, {
        subjectName,
        questions: questionsList
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Tandai data lokal sudah aman ter-sync
      for (const q of questionsList) {
        if (q.localId) {
          await localDB.questions.update(q.localId, { isSynced: true });
        }
      }
    }

    console.log('🚀 Sinkronisasi ke Server Pusat Berhasil!');
  } catch (err) {
    console.warn('⚠️ Server Pusat sedang bermasalah/down. Data tetap AMAN di memori device lokal Guru.');
  }
}

// Event listener otomatis saat koneksi internet terhubung kembali
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Internet terhubung! Memulai sync otomatis...');
    syncLocalDataToServer();
  });
}