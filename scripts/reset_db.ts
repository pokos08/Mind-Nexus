import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Viteの.envを読み込む
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDb() {
    console.log('🔄 テストデータを1回だけリセット中...');

    try {
        // 外部キー制約があるため、子テーブルから先に全件削除する
        // ※ neq('id', 'dummy') は「全件を対象にする」ためのダミー条件

        console.log('Deleting edges...');
        await supabase.from('edges').delete().neq('id', 'dummy-id');

        console.log('Deleting nodes...');
        await supabase.from('nodes').delete().neq('id', 'dummy-id');

        console.log('Deleting chat_messages...');
        await supabase.from('chat_messages').delete().neq('id', 'dummy-id');

        console.log('Deleting topics...');
        await supabase.from('topics').delete().neq('id', 'dummy-id');

        console.log('✅ データベースのリセット（全データ消去）が完了しました！');
    } catch (e) {
        console.error('❌ リセット中にエラーが発生しました:', e);
    }
}

resetDb();
