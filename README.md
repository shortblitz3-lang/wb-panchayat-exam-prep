# 🏛️ গ্রাম পঞ্চায়েত পরীক্ষা প্রস্তুতি — ওয়েবসাইট

পশ্চিমবঙ্গ গ্রাম পঞ্চায়েত নির্বাচন সহকারী / গ্রাম কর্মী / এক্সটেনশন ওয়ার্কার পরীক্ষা প্রস্তুতির সম্পূর্ণ ওয়েব অ্যাপ্লিকেশন।

## ✨ ফিচার

- **ড্যাশবোর্ড** — প্রগতি পরিসংখ্যান, প্রোগ্রেস বার, স্ট্রিক, আজকের লক্ষ্য
- **পড়াশোনা** — ৬টি বিষয়ের ৭১টি অধ্যায়, প্রতিটি আলাদা lazy-loaded
- **পড়ার প্ল্যান** — পরীক্ষার তারিখ অনুযায়ী দৈনিক সূচি
- **প্র্যাকটিস** — বিষয়/উপবিষয় অনুযায়ী ১০,৬১৪+ প্রশ্ন, টাইমার, ব্যাখ্যা
- **মক টেস্ট** — ৯০ মিনিটে ১০০ প্রশ্ন, সম্পূর্ণ পরীক্ষার ধাঁচ
- **কুইজ** — বিষয়ভিত্তিক, উপবিষয় ফিল্টার, পেজিনেশন
- **কারেন্ট অ্যাফেয়ার্স** — ১,৬২৩টি আইটেম, মাস অনুযায়ী
- **PYQ** — ৫টি বিগত বছরের প্রশ্নপত্র + ৩০টি প্র্যাকটিস সেট
- **রিপোর্ট** — স্কোর ট্রেন্ড চার্ট, বিষয়ভিত্তিক বিশ্লেষণ, সম্পূর্ণ ইতিহাস
- **Gmail ইমেইল ভেরিফিকেশন** — OTP রেজিস্ট্রেশন, লগইন, ফরগট পাসওয়ার্ড

---

## 📁 প্রজেক্ট স্ট্রাকচার

```
gram-panchayat-prep/
├── index.html              # মূল HTML (SPA)
├── css/
│   └── style.css          # ডার্ক থিম, রেসপন্সিভ ডিজাইন
├── js/
│   ├── config.js          # Supabase কনফিগ ও কনস্ট্যান্ট
│   ├── utils.js           # ইউটিলিটি ফাংশন (fetch, cache, format)
│   ├── auth.js            # Supabase অথেন্টিকেশন (OTP, login, reset)
│   ├── authUI.js          # অথ ফর্ম UI কন্ট্রোলার
│   ├── store.js           # প্রগতি সেভ/লোড (localStorage + Supabase)
│   ├── ui.js              # কুইজ ইঞ্জিন, টাইমার, মডাল, কম্পোনেন্ট
│   ├── app.js             # রাউটার ও অ্যাপ এন্ট্রি পয়েন্ট
│   └── pages/
│       ├── dashboard.js   # ড্যাশবোর্ড
│       ├── study.js       # পড়াশোনা
│       ├── studyPlan.js   # পড়ার প্ল্যান
│       ├── practice.js    # প্র্যাকটিস
│       ├── mockTest.js    # মক টেস্ট
│       ├── quiz.js        # কুইজ
│       ├── currentAffairs.js  # কারেন্ট অ্যাফেয়ার্স
│       ├── pyq.js         # PYQ
│       └── report.js      # রিপোর্ট
├── data/
│   ├── study_index.json       # স্টাডি ইনডেক্স
│   ├── study/                 # ৭১টি অধ্যায় ফাইল (lazy loaded)
│   ├── mcq_index.json         # MCQ ইনডেক্স
│   ├── mcqs/                  # বিষয়ভিত্তিক MCQ ফাইল
│   ├── question_sets_index.json
│   ├── question_sets/         # PYQ ও প্র্যাকটিস সেট
│   ├── current_affairs_index.json
│   └── current_affairs/       # মাসভিত্তিক কারেন্ট অ্যাফেয়ার্স
├── netlify/
│   └── functions/
│       ├── send-otp.js        # ঐচ্ছিক: Gmail SMTP OTP
│       └── package.json
├── netlify.toml               # Netlify কনফিগ
├── supabase_setup.sql         # ডেটাবেস সেটআপ স্ক্রিপ্ট
└── README.md
```

---

## 🚀 ডিপ্লয়মেন্ট গাইড

### ধাপ ১: Supabase সেটআপ (অথেন্টিকেশন + ডেটাবেস)

1. **Supabase অ্যাকাউন্ট তৈরি**: https://supabase.com এ যান এবং একটি নতুন প্রজেক্ট তৈরি করুন।

2. **SQL স্ক্রিপ্ট চালান**:
   - Supabase Dashboard → SQL Editor
   - `supabase_setup.sql` ফাইলের কন্টেন্ট কপি করে পেস্ট করুন
   - Run ক্লিক করুন

3. **অথেন্টিকেশন সেটিংস**:
   - Dashboard → Authentication → Email
   - "Enable Email signup" চালু করুন
   - "Confirm email" চালু করুন (OTP ভেরিফিকেশনের জন্য)
   - "Email OTP" চালু করুন

4. **Gmail SMTP (ঐচ্ছিক — কাস্টম ইমেইলের জন্য)**:
   - Google Account → Security → 2-Step Verification চালু করুন
   - App Passwords → "Mail" সিলেক্ট করে 16-অক্ষরের পাসওয়ার্ড তৈরি করুন
   - Supabase Dashboard → Authentication → Email Templates → SMTP Settings
   - Host: `smtp.gmail.com`, Port: `587`
   - Username: আপনার Gmail, Password: App Password

5. **API Key সংগ্রহ**:
   - Dashboard → Settings → API
   - "Project URL" এবং "anon public key" কপি করুন

6. **কনফিগ ফাইল আপডেট**:
   - `js/config.js` খুলুন
   - `SUPABASE_URL` এবং `SUPABASE_ANON_KEY` এ আপনার মান বসান

### ধাপ ২: Netlify ডিপ্লয় (প্রস্তাবিত)

1. **GitHub-এ পুশ করুন**:
   ```bash
   git init
   git add .
   git commit -m "Gram Panchayat Exam Prep Website"
   git remote add origin https://github.com/USERNAME/REPO.git
   git push -u origin main
   ```

2. **Netlify সাইট তৈরি**:
   - https://app.netlify.com → "Add new site" → "Import from Git"
   - আপনার GitHub রিপোজিটরি সিলেক্ট করুন
   - Build command: (খালি রাখুন)
   - Publish directory: `.` (root)

3. **এনভায়রনমেন্ট ভেরিয়েবল (ঐচ্ছিক Gmail SMTP)**:
   - Netlify Dashboard → Site Settings → Environment Variables
   - `GMAIL_USER`: আপনার Gmail ঠিকানা
   - `GMAIL_APP_PASSWORD`: Gmail App Password

4. **ডিপ্লয়**: "Deploy" ক্লিক করুন।

### ধাপ ৩: বিকল্প — Vercel ডিপ্লয়

1. https://vercel.com → "New Project"
2. রিপোজিটরি ইম্পোর্ট করুন
3. Framework Preset: "Other"
4. Build Command: (খালি)
5. Output Directory: `.`
6. Environment Variables সেট করুন (Gmail SMTP এর জন্য)
7. Deploy

### ধাপ ৪: বিকল্প — ডেমো মোড (কোনো সেটআপ ছাড়া)

Supabase কনফিগার না করলেও সাইট কাজ করবে — ডেমো মোডে:
- যেকোনো ইমেইল/পাসওয়ার্ড দিয়ে রেজিস্টার করুন
- OTP: `123456` (সবসময়)
- ডেটা শুধু localStorage-এ সেভ হবে (ডিভাইস পরিবর্তনে মুছে যাবে)

---

## 🔧 আর্কিটেকচার ও অপ্টিমাইজেশন

### আগের সাইটের ক্র্যাশের কারণ ও সমাধান:

| সমস্যা | সমাধান |
|--------|--------|
| ৯ মেগাবাইটের একটি JSON একসাথে লোড | ডেটা ১২৪টি ছোট ফাইলে বিভক্ত, lazy loading |
| সব কোড ইনলাইন | মডুলার ES6 ইম্পোর্ট, আলাদা ফাইল |
| localStorage ওভারফ্লো | ক্যাশ TTL (২৪ঘন্টা), পুরোনো ক্যাশ স্বয়ংক্রিয় মুছুন |
| কোনো pagination নেই | প্রতিটি লিস্টে pagination |
| সব প্রশ্ন একবারে রেন্ডার | QuizEngine একটি করে প্রশ্ন দেখায় |

### ডেটা লোডিং কৌশল:

- **Lazy Loading**: প্রতিটি অধ্যায় ও বিষয়ের প্রশ্ন আলাদা ফাইলে, প্রয়োজনে লোড হয়
- **Caching**: fetch করা ডেটা localStorage ও মেমরিতে ক্যাশ হয় (২৪ ঘন্টা TTL)
- **Pagination**: বড় লিস্ট (কুইজ, কারেন্ট অ্যাফেয়ার্স) পেজিনেশনে দেখানো হয়
- **Code Splitting**: প্রতিটি পেজ আলাদা JS মডিউল, dynamic import

---

## 🎨 ডিজাইন

- **থিম**: ডার্ক থিম, গ্রেডিয়েন্ট (#6366f1 → #ec4899)
- **ফন্ট**: Noto Sans Bengali (Google Fonts)
- **রেসপন্সিভ**: মোবাইল-ফার্স্ট, ট্যাবলেট ও ডেস্কটপ সাপোর্ট
- **UI**: কার্ড-ভিত্তিক, প্রোগ্রেস বার, সার্কেল প্রোগ্রেস

---

## 📊 ডেটা পরিসংখ্যা

| ডেটা | পরিমাণ |
|------|--------|
| স্টাডি অধ্যায় | ৭১টি (৬ বিষয়) |
| MCQ প্রশ্ন | ১০,৬১৪টি (৬ বিষয়) |
| উত্তরসহ প্রশ্ন | ৮,৩৮৬টি |
| PYQ সেট | ৫টি |
| প্র্যাকটিস সেট | ৩০টি |
| কারেন্ট অ্যাফেয়ার্স | ১,৬২৩টি |
| মোট ডেটা ফাইল | ১২৪টি |
| মোট সাইজ | ~৮.২ মেগাবাইট |

---

## 🔐 অথেন্টিকেশন ফ্লো

1. **রেজিস্ট্রেশন**: ইমেইল + পাসওয়ার্ড → OTP ইমেইলে → OTP যাচাই → অ্যাকাউন্ট অ্যাক্টিভ
2. **লগইন**: ইমেইল + পাসওয়ার্ড → ভেরিফাইড চেক → লগইন
3. **ফরগট পাসওয়ার্ড**: ইমেইল → OTP → নতুন পাসওয়ার্ড সেট
4. **রাউট গার্ড**: লগইন না করা পর্যন্ত শুধু অথ স্ক্রিন দেখা যায়
5. **প্রগতি**: প্রতিটি ব্যবহারকারীর আলাদা, localStorage + Supabase-এ সিঙ্ক

---

## 📝 লাইসেন্স

© 2026 গ্রাম পঞ্চায়েত পরীক্ষা প্রস্তুতি। শিক্ষার উদ্দেশ্যে তৈরি।
