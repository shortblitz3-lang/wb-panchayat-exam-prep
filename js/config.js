/* ============================================================
   config.js — Supabase configuration & app constants
   ------------------------------------------------------------
   এই ফাইলে Supabase project-এর URL এবং anon key বসাতে হবে।
   ডিপ্লয় করার আগে এই দুটি মান আপনার Supabase ড্যাশবোর্ড থেকে
   নিয়ে এখানে বসান। (Settings → API)
============================================================ */

// ⚠️ ডিপ্লয় করার আগে এই দুটি মান আপনার Supabase ড্যাশবোর্ড থেকে নিন
export const SUPABASE_URL = 'YOUR_SUPABASE_URL';        // e.g. https://xxxxx.supabase.co
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // anon public key

// অ্যাপের নাম ও বিবরণ
export const APP_NAME = 'গ্রাম পঞ্চায়েত পরীক্ষা প্রস্তুতি';
export const APP_SUBTITLE = 'পশ্চিমবঙ্গ গ্রাম পঞ্চায়েত নির্বাচন সহকারী / গ্রাম কর্মী / এক্সটেনশন ওয়ার্কার';

// Data path (relative to site root)
export const DATA_PATH = 'data';

// ক্যাশ সংক্রান্ত কনফিগ
export const CACHE_ENABLED = true;
export const CACHE_PREFIX = 'gp_cache_';
export const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ঘন্টা

// মক টেস্ট কনফিগ
export const MOCK_TEST_CONFIG = {
  duration: 90 * 60 * 1000,  // ৯০ মিনিট (মিলিসেকেন্ড)
  questionCount: 100,
  passScore: 40
};

// প্র্যাকটিস সেট কনফিগ
export const PRACTICE_CONFIG = {
  questionsPerSession: 10,
  timePerQuestion: 60 // সেকেন্ড
};

// প্রতিদিনের লক্ষ্য
export const DAILY_GOAL = {
  chapters: 2,        // প্রতিদিন ২টি অধ্যায়
  quizzes: 1,        // প্রতিদিন ১টি কুইজ
  mockTests: 0       // মক টেস্ট ঐচ্ছিক
};

// বিষয় তালিকা (আইকন সহ)
export const SUBJECTS = [
  { id: 'panchayat', name: 'পঞ্চায়েত ব্যবস্থা', icon: '🏛️', color: '#6366f1' },
  { id: 'bengali',   name: 'বাংলা',           icon: '📖', color: '#ec4899' },
  { id: 'english',   name: 'English',         icon: '🔤', color: '#3b82f6' },
  { id: 'math',      name: 'গণিত',           icon: '🔢', color: '#10b981' },
  { id: 'gk',        name: 'সাধারণ জ্ঞান',    icon: '🌍', color: '#f59e0b' }
];

// পরীক্ষার প্যাটার্ন তথ্য
export const EXAM_INFO = {
  totalMarks: 100,
  totalQuestions: 100,
  duration: '90 মিনিট',
  negativeMarking: false,
  subjects: [
    { name: 'পঞ্চায়েত ব্যবস্থা', questions: 20 },
    { name: 'বাংলা', questions: 20 },
    { name: 'English', questions: 20 },
    { name: 'গণিত', questions: 20 },
    { name: 'সাধারণ জ্ঞান', questions: 20 }
  ]
};

// Supabase কনফিগার করা আছে কিনা যাচাই
export function isSupabaseConfigured() {
  return SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
         SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
         SUPABASE_URL.startsWith('https://') &&
         SUPABASE_ANON_KEY.length > 20;
}
