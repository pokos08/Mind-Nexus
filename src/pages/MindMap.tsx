import { useParams } from 'react-router-dom';
import { MindMapBoard as MindMapComponent } from '../components/MindMapBoard';
import { initialTopics } from '../data/topics';

// App.tsx から MindMapBoard のラップを別ページに分離
export function MindMap() {
    const { id } = useParams<{ id: string }>();
    // 実際のアプリではここで id をもとにデータをフェッチしますが、今回はモックを使用
    const topic = initialTopics.find((t) => t.id === id);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* 選択したトピックの情報を渡すことも可能ですが、ここでは元のMindMapBoardをそのまま表示します */}
            <MindMapComponent initialTopicTitle={topic?.title} />
        </div>
    );
}
