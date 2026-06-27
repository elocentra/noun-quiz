-- =============================================
-- NOUN Smart Active Recall Quiz System
-- Database Schema v1.0
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- COURSES
-- Represents a course/subject (e.g. EDU231)
-- =============================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,           -- e.g. "EDU231"
  title TEXT NOT NULL,                 -- e.g. "Introduction to Linguistics"
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COURSE MATERIALS
-- Uploaded files per course/week
-- =============================================
CREATE TABLE course_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,        -- e.g. 1, 2, 3
  title TEXT NOT NULL,                 -- e.g. "Week 1: Morphology"
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,             -- 'pdf', 'docx', 'txt'
  raw_text TEXT NOT NULL,              -- extracted plain text
  storage_path TEXT,                   -- Supabase storage path
  processing_status TEXT DEFAULT 'pending', -- pending | processing | done | error
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUESTION POOL
-- Permanent, cumulative pool per course
-- Questions are NEVER deleted
-- =============================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  material_id UUID REFERENCES course_materials(id),
  week_number INTEGER NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'short_answer')),
  
  -- The sentence with ________ replacing the key word
  question_text TEXT NOT NULL,
  
  -- The correct answer (the word/phrase removed)
  correct_answer TEXT NOT NULL,
  
  -- Source sentence from material (verbatim)
  source_sentence TEXT NOT NULL,
  
  -- MCQ options (JSON array of 4 strings, only for mcq type)
  options JSONB,
  
  -- Explanation drawn from course material
  explanation TEXT NOT NULL,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUIZZES
-- Published quiz sessions per course
-- =============================================
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,           -- e.g. "edu231-weekly-quiz"
  title TEXT NOT NULL,                 -- e.g. "EDU231 Week 3 Quiz"
  week_number INTEGER NOT NULL,        -- current week (all questions up to this week included)
  
  -- Question counts
  mcq_count INTEGER DEFAULT 5,
  short_answer_count INTEGER DEFAULT 5,
  
  -- Status
  is_published BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,      -- admin can close quiz
  
  -- Timing (optional)
  time_limit_minutes INTEGER,          -- NULL = no limit
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STUDENT ATTEMPTS
-- One row per student per quiz session
-- =============================================
CREATE TABLE student_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  
  -- Student identification (name only, no matric)
  student_name TEXT NOT NULL,
  
  -- Device fingerprint to enforce one attempt per device
  device_fingerprint TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'reset')),
  
  -- Score (populated on submission)
  total_questions INTEGER,
  correct_count INTEGER,
  score_percentage NUMERIC(5,2),
  
  -- The shuffled question order for this attempt (array of question IDs)
  question_order JSONB,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_taken_seconds INTEGER
);

-- Unique constraint: one active attempt per device per quiz
CREATE UNIQUE INDEX idx_one_attempt_per_device 
  ON student_attempts(quiz_id, device_fingerprint) 
  WHERE status != 'reset';

-- =============================================
-- STUDENT ANSWERS
-- Individual answers per question per attempt
-- =============================================
CREATE TABLE student_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES student_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  
  -- What student entered/selected
  student_answer TEXT NOT NULL,
  
  -- Grading
  is_correct BOOLEAN,
  ai_feedback TEXT,                    -- AI explanation for wrong answers (from material only)
  
  -- For MCQ: which option index selected (0-3)
  selected_option_index INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

-- Public read for published quizzes
CREATE POLICY "Public can read published quizzes"
  ON quizzes FOR SELECT
  USING (is_published = TRUE AND is_active = TRUE);

-- Public read for questions (via quiz)
CREATE POLICY "Public can read active questions"
  ON questions FOR SELECT
  USING (is_active = TRUE);

-- Public can read courses
CREATE POLICY "Public can read courses"
  ON courses FOR SELECT
  USING (TRUE);

-- Students can insert their own attempts
CREATE POLICY "Students can create attempts"
  ON student_attempts FOR INSERT
  WITH CHECK (TRUE);

-- Students can read their own attempts
CREATE POLICY "Students can read own attempts"
  ON student_attempts FOR SELECT
  USING (TRUE);

-- Students can update their own in-progress attempts
CREATE POLICY "Students can update own attempts"
  ON student_attempts FOR UPDATE
  USING (status = 'in_progress');

-- Students can insert answers
CREATE POLICY "Students can insert answers"
  ON student_answers FOR INSERT
  WITH CHECK (TRUE);

-- Students can read answers
CREATE POLICY "Students can read answers"
  ON student_answers FOR SELECT
  USING (TRUE);

-- Service role bypasses RLS (for admin API routes using service role key)
-- Admin operations use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_questions_course ON questions(course_id);
CREATE INDEX idx_questions_week ON questions(course_id, week_number);
CREATE INDEX idx_attempts_quiz ON student_attempts(quiz_id);
CREATE INDEX idx_attempts_device ON student_attempts(device_fingerprint);
CREATE INDEX idx_answers_attempt ON student_answers(attempt_id);
CREATE INDEX idx_materials_course ON course_materials(course_id);

-- =============================================
-- SEED: Admin user note
-- Create admin via Supabase Auth dashboard or:
-- supabase auth admin create-user --email admin@noun.edu.ng --password yourpassword
-- Then set is_admin = true in profiles table
-- =============================================

-- Admin profiles table (linked to Supabase auth)
CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own profile"
  ON admin_profiles FOR SELECT
  USING (auth.uid() = id);
