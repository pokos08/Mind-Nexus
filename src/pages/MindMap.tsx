import { useParams } from 'react-router-dom';
import { MindMapBoard as MindMapComponent } from '../components/MindMapBoard';
import { initialTopics, Topic } from '../data/topics';

// App.tsx から MindMapBoard のラップを別ページに分離
export function MindMap() {
    const { id } = useParams<{ id: string }>();

    // localStorage から最新のトピック一覧を取得して検索する
    const savedTopics = localStorage.getItem('mindmap_topics');
    const topics: Topic[] = savedTopics ? JSON.parse(savedTopics) : initialTopics;
    const topic = topics.find((t) => t.id === id);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <MindMapComponent topicId={id} initialTopicTitle={topic?.title} />
        </div>
    );
}
