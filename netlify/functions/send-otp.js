/* ============================================================
   Netlify Function: send-otp.js
   ------------------------------------------------------------
   ঐচ্ছিক: যদি Supabase-এর বিল্ট-ইন ইমেইলের বদলে নিজস্ব
   Gmail থেকে OTP ইমেইল পাঠাতে চান, এই ফাংশন ব্যবহার করুন।

   এটি Nodemailer দিয়ে Gmail SMTP ব্যবহার করে ৬-সংখ্যার OTP
   ইমেইল পাঠায়।

   সেটআপ:
   1. npm install (netlify/functions ফোল্ডারে package.json থেকে)
   2. Netlify-এ এনভায়রনমেন্ট ভেরিয়েবল সেট করুন:
      - GMAIL_USER: আপনার Gmail ঠিকানা
      - GMAIL_APP_PASSWORD: Gmail App Password (নিচে নির্দেশিকা)
   3. ফ্রন্টএন্ড থেকে POST /api/send-otp কল করুন

   Gmail App Password তৈরির নির্দেশিকা:
   - Google Account → Security → 2-Step Verification চালু করুন
   - App Passwords → "Mail" সিলেক্ট করে একটি 16-অক্ষরের পাসওয়ার্ড পাবেন
   - সেটি GMAIL_APP_PASSWORD হিসেবে ব্যবহার করুন
============================================================ */

const nodemailer = require('nodemailer');

// OTP স্টোরেজ (প্রোডাকশনে Redis বা ডেটাবেস ব্যবহার করুন)
// সাধারণ ইন-মেমরি স্টোর — প্রতিটি Netlify Function instance-এ আলাদা
const otpStore = new Map();

// OTP জেনারেট
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Gmail transporter
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  return transporter;
}

// OTP ইমেইল টেমপ্লেট
function otpEmailHTML(otp, purpose) {
  const title = purpose === 'reset' ? 'পাসওয়ার্ড রিসেট' : 'ইমেইল যাচাই';
  return `
    <div style="font-family: 'Noto Sans Bengali', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1, #ec4899); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">🏛️ গ্রাম পঞ্চায়েত পরীক্ষা প্রস্তুতি</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1f2937;">${title}</h2>
        <p style="color: #4b5563; font-size: 15px;">
          আপনার ${title} কোড:
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <div style="display: inline-block; background: #6366f1; color: white; font-size: 32px; font-weight: bold; padding: 15px 40px; border-radius: 8px; letter-spacing: 8px;">
            ${otp}
          </div>
        </div>
        <p style="color: #6b7280; font-size: 13px;">
          এই কোডটি ১০ মিনিটের জন্য বৈধ। আপনি এই অনুরোধ করেননি হলে এই ইমেইল উপেক্ষা করুন।
        </p>
      </div>
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        © 2026 গ্রাম পঞ্চায়েত পরীক্ষা প্রস্তুতি
      </p>
    </div>
  `;
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, purpose } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ইমেইল প্রয়োজন' })
      };
    }

    // পরিবেশ পরিবর্তনশীল যাচাই
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Gmail SMTP কনফিগার করা হয়নি। GMAIL_USER ও GMAIL_APP_PASSWORD সেট করুন।' })
      };
    }

    // OTP জেনারেট
    const otp = generateOTP();
    const purposeLabel = purpose === 'reset' ? 'reset' : 'verify';

    // OTP স্টোর করা (১০ মিনিট TTL)
    otpStore.set(email, { otp, purpose: purposeLabel, expires: Date.now() + 10 * 60 * 1000 });

    // ইমেইল পাঠানো
    const transport = getTransporter();
    await transport.sendMail({
      from: `"গ্রাম পঞ্চায়েত প্রস্তুতি" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: purpose === 'reset'
        ? 'পাসওয়ার্ড রিসেট OTP — গ্রাম পঞ্চায়েত পরীক্ষা প্রস্তুতি'
        : 'ইমেইল যাচাই OTP — গ্রাম পঞ্চায়েত পরীক্ষা প্রস্তুতি',
      html: otpEmailHTML(otp, purposeLabel)
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'OTP আপনার ইমেইলে পাঠানো হয়েছে।'
      })
    };
  } catch (error) {
    console.error('OTP send error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'ইমেইল পাঠাতে সমস্যা: ' + error.message
      })
    };
  }
};

// OTP যাচাই এক্সপোর্ট (অন্য ফাংশন থেকে কল করার জন্য)
exports.verifyOTP = (email, otp) => {
  const stored = otpStore.get(email);
  if (!stored) return false;
  if (Date.now() > stored.expires) {
    otpStore.delete(email);
    return false;
  }
  if (stored.otp === otp) {
    otpStore.delete(email);
    return true;
  }
  return false;
};
