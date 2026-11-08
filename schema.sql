CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  donor TEXT NOT NULL,
  amount REAL NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  trans_ref TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  audio_base64 TEXT,
  sample_rate INTEGER
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  tts_enabled INTEGER,
  tts_voice TEXT DEFAULT 'th-TH-NiwatNeural',
  tts_rate TEXT DEFAULT '+0%',
  tts_pitch TEXT DEFAULT '+0Hz',
  filter_enabled INTEGER DEFAULT 1,
  filter_words TEXT DEFAULT '',
  filter_action TEXT DEFAULT 'censor',
  token_version INTEGER DEFAULT 1,
  api_enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS subathon_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title TEXT DEFAULT 'SUBATHON',
  end_msg TEXT DEFAULT 'TIME UP',
  initial_seconds INTEGER DEFAULT 600,
  remaining_seconds INTEGER DEFAULT 600,
  target_epoch INTEGER DEFAULT 0,
  is_running INTEGER DEFAULT 1,
  rate_coins REAL DEFAULT 10,
  rate_seconds INTEGER DEFAULT 60,
  sec_per_thb REAL DEFAULT 6,
  max_hours INTEGER DEFAULT 24,
  total_added_secs INTEGER DEFAULT 0,
  total_donations REAL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
