import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/*
Supabase 설정 방법:

1. https://supabase.com 에서 프로젝트 생성
2. .env.local 파일에 아래 환경변수 추가:
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

3. Supabase SQL 에디터에서 아래 스키마 실행:

CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  assignee TEXT DEFAULT '',
  contact_method TEXT DEFAULT '',
  total_amount INTEGER,
  balance INTEGER,
  review_proposed BOOLEAN DEFAULT false,
  balance_received BOOLEAN DEFAULT false,
  kmong_review BOOLEAN DEFAULT false,
  kakao_review BOOLEAN DEFAULT false,
  submit_date DATE,
  status TEXT DEFAULT '외주분석중',
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON customers FOR ALL USING (true);
*/
