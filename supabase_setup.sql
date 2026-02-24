-- 既存のテーブルをリセットする場合 (初回はエラー出てもOK)
DROP TABLE IF EXISTS edges;
DROP TABLE IF EXISTS nodes;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS topics;

-- トピック一覧テーブル
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ノードデータテーブル
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  depth INTEGER DEFAULT 0,
  position_x FLOAT,
  position_y FLOAT,
  parent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- エッジデータテーブル
CREATE TABLE edges (
  id TEXT PRIMARY KEY,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 参加者チャットテーブル
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 全テーブルでリアルタイム受信(Subscribe)を許可する
-- （※SupabaseのRealtime機能を使うための設定です）
ALTER PUBLICATION supabase_realtime ADD TABLE topics, nodes, edges, chat_messages;
