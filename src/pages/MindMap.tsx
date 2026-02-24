import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { MindMapBoard as MindMapComponent } from '../components/MindMapBoard';
import { initialTopics } from '../data/topics';
import { supabase } from '../lib/supabase';

// App.tsx から MindMapBoard のラップを別ページに分離
export function MindMap() {
    const { id } = useParams<{ id: string }>();
    const [title, setTitle] = useState<string | undefined>(undefined);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const fetchTitle = async () => {
            if (!id) return;

            // フォールバックデータの場合
            if (!id.includes('-')) {
                const topic = initialTopics.find(t => t.id === id);
                setTitle(topic?.title);
                setIsReady(true);
                return;
            }

            // DBから最新のトピック名を取得
            const { data } = await supabase.from('topics').select('title').eq('id', id).single();
            if (data) {
                setTitle(data.title);
            }
            setIsReady(true);
        };
        fetchTitle();
    }, [id]);

    if (!isReady) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                読み込み中...
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <MindMapComponent topicId={id} initialTopicTitle={title} />
        </div>
    );
}
