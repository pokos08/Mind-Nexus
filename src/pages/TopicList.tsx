import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, Clock, Heart, Plus, Eye } from 'lucide-react';
import { initialTopics, Topic } from '../data/topics';
import './TopicList.css';

type SortType = 'latest' | 'popular' | 'views';

export function TopicList() {
    const navigate = useNavigate();

    // localStorageから初期データを取得するロジック
    const [topics, setTopics] = useState<Topic[]>(() => {
        const savedTopics = localStorage.getItem('mindmap_topics');
        return savedTopics ? JSON.parse(savedTopics) : initialTopics;
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [sortType, setSortType] = useState<SortType>('latest');
    const [newTopicTitle, setNewTopicTitle] = useState('');

    // localStorageから「いいね」履歴を取得
    const [userLikes, setUserLikes] = useState<Record<string, number>>(() => {
        const savedLikes = localStorage.getItem('mindmap_userLikes');
        return savedLikes ? JSON.parse(savedLikes) : {};
    });

    // 状態が変更されるたびにlocalStorageへ保存
    useEffect(() => {
        localStorage.setItem('mindmap_topics', JSON.stringify(topics));
    }, [topics]);

    useEffect(() => {
        localStorage.setItem('mindmap_userLikes', JSON.stringify(userLikes));
    }, [userLikes]);

    // 検索とソートロジック
    const filteredAndSortedTopics = useMemo(() => {
        let result = topics.filter((topic) =>
            topic.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

        result.sort((a, b) => {
            if (sortType === 'latest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } else if (sortType === 'popular') {
                return b.likes - a.likes;
            } else if (sortType === 'views') {
                return b.views - a.views;
            }
            return 0;
        });

        return result;
    }, [topics, searchQuery, sortType]);

    const [visibleCount, setVisibleCount] = useState(5);

    // 検索やソート条件が変わった場合は表示件数をリセットする
    useEffect(() => {
        setVisibleCount(5);
    }, [searchQuery, sortType]);

    const handleCreateTopic = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicTitle.trim()) return;

        const newTopic: Topic = {
            id: Date.now().toString(),
            title: newTopicTitle.trim(),
            createdAt: new Date().toISOString(),
            views: 0,
            likes: 0,
        };

        setTopics([newTopic, ...topics]);
        setNewTopicTitle('');
    };

    const handleToggleLike = (topicId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // パネルのクリックイベント（遷移）を親に伝播させない

        // 現在のユーザーのいいね回数を確認（最大10回）
        const currentLikes = userLikes[topicId] || 0;
        if (currentLikes >= 10) return;

        setUserLikes(prev => ({ ...prev, [topicId]: currentLikes + 1 }));

        setTopics((prev) =>
            prev.map((t) =>
                t.id === topicId ? { ...t, likes: t.likes + 1 } : t
            )
        );
    };

    const handleTopicClick = (topicId: string) => {
        // アクセス数を増やして画面遷移
        setTopics((prev) =>
            prev.map((t) =>
                t.id === topicId ? { ...t, views: t.views + 1 } : t
            )
        );
        navigate(`/map/${topicId}`);
    };

    // 表示するトピックを切り出す
    const displayedTopics = filteredAndSortedTopics.slice(0, visibleCount);

    return (
        <div className="topic-list-container">
            <div className="topic-list-header">
                <h2>疑問トピック一覧</h2>
                <p>気になる疑問を選択するか、新しい疑問を投稿してマインドマップを作り上げましょう。</p>
            </div>

            <div className="topic-controls">
                <div className="search-bar">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="トピックを検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="sort-buttons">
                    <button
                        className={`sort-btn ${sortType === 'latest' ? 'active' : ''}`}
                        onClick={() => setSortType('latest')}
                    >
                        <Clock size={16} /> 最新順
                    </button>
                    <button
                        className={`sort-btn ${sortType === 'popular' ? 'active' : ''}`}
                        onClick={() => setSortType('popular')}
                    >
                        <Flame size={16} /> いいね順
                    </button>
                    <button
                        className={`sort-btn ${sortType === 'views' ? 'active' : ''}`}
                        onClick={() => setSortType('views')}
                    >
                        <Eye size={16} /> アクセス順
                    </button>
                </div>
            </div>

            <form className="create-topic-form" onSubmit={handleCreateTopic}>
                <input
                    type="text"
                    placeholder="新しい疑問（トピック）を立てる..."
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                />
                <button type="submit" disabled={!newTopicTitle.trim()}>
                    <Plus size={18} /> 作成
                </button>
            </form>

            <div className="scrollable-list-wrapper">
                <div className="topic-grid">
                    {displayedTopics.map((topic) => {
                        const isMaxLikes = (userLikes[topic.id] || 0) >= 10;
                        return (
                            <div
                                key={topic.id}
                                className="topic-card"
                                onClick={() => handleTopicClick(topic.id)}
                            >
                                <div className="topic-card-content">
                                    <h3>{topic.title}</h3>
                                    <div className="topic-meta">
                                        <span className="meta-item">
                                            <Eye size={14} /> {topic.views.toLocaleString()}
                                        </span>
                                        <span className="meta-item">
                                            <Clock size={14} /> {new Date(topic.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className={`like-btn ${isMaxLikes ? 'maxed' : ''}`}
                                    onClick={(e) => handleToggleLike(topic.id, e)}
                                    title={isMaxLikes ? "いいね上限(10回)に達しました" : "いいね！(最大10回)"}
                                    disabled={isMaxLikes}
                                    style={{ opacity: isMaxLikes ? 0.7 : 1, cursor: isMaxLikes ? 'default' : 'pointer' }}
                                >
                                    <Heart size={18} className="heart-icon" style={{ fill: isMaxLikes ? '#f43f5e' : 'none' }} />
                                    <span>{isMaxLikes ? 'MAX' : topic.likes}</span>
                                </button>
                            </div>
                        );
                    })}
                    {filteredAndSortedTopics.length === 0 && (
                        <div className="no-results">条件に一致するトピックが見つかりません。</div>
                    )}
                </div>

                {visibleCount < filteredAndSortedTopics.length && (
                    <div className="load-more-container">
                        <button
                            className="load-more-btn"
                            onClick={() => setVisibleCount(prev => prev + 5)}
                        >
                            さらに見る
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
