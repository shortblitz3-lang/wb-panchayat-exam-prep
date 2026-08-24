-- ============================================================
-- Supabase ডেটাবেস সেটআপ স্ক্রিপ্ট
-- ------------------------------------------------------------
-- এই স্ক্রিপ্টটি Supabase SQL Editor-এ চালান।
-- এটি ব্যবহারকারীর প্রগতি সংরক্ষণের টেবিল তৈরি করে।
--
-- অথেন্টিকেশন (users) টেবিল Supabase স্বয়ংক্রিয়ভাবে তৈরি করে।
-- এখানে শুধু progress টেবিল তৈরি করা হয়।
-- ============================================================

-- progress টেবিল — প্রতিটি ব্যবহারকারীর প্রগতি JSON হিসেবে সেভ
CREATE TABLE IF NOT EXISTS public.progress (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) চালু
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- নীতি: ব্যবহারকারী শুধু নিজের ডেটা দেখতে ও এডিট করতে পারবে
CREATE POLICY "Users can read own progress"
  ON public.progress
  FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert own progress"
  ON public.progress
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update own progress"
  ON public.progress
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = user_email);

-- আপডেট হলে updated_at স্বয়ংক্রিয়ভাবে সেট করা
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER progress_updated_at
  BEFORE UPDATE ON public.progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- সফল বার্তা
INSERT INTO public.progress (user_email, data)
VALUES ('setup@test.com', '{"status": "setup_complete"}')
ON CONFLICT (user_email) DO NOTHING;

-- সেটআপ যাচাই
SELECT 'Supabase setup complete! Progress table created with RLS enabled.' as message;
