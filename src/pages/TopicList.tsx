import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, Clock, Heart, Plus, Eye, Trash2 } from 'lucide-react';
import { initialTopics, Topic } from '../data/topics';
import { supabase } from '../lib/supabase';
import './TopicList.css';

type SortType = 'latest' | 'popular' | 'views';

export function TopicList() {
    const navigate = useNavigate();

    const [topics, setTopics] = useState<Topic[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortType, setSortType] = useState<SortType>('latest');
    const [newTopicTitle, setNewTopicTitle] = useState('');

    // localStorageから「いいね」履歴（自分がいいねしたかどうかのローカル記録）を取得
    const [userLikes, setUserLikes] = useState<Record<string, number>>(() => {
        const savedLikes = localStorage.getItem('mindmap_userLikes');
        return savedLikes ? JSON.parse(savedLikes) : {};
    });

    // 自分が作成したトピックのIDを記録
    const [createdTopicIds, setCreatedTopicIds] = useState<string[]>(() => {
        const savedTopics = localStorage.getItem('mindmap_createdTopics');
        return savedTopics ? JSON.parse(savedTopics) : [];
    });

    useEffect(() => {
        localStorage.setItem('mindmap_userLikes', JSON.stringify(userLikes));
    }, [userLikes]);

    useEffect(() => {
        localStorage.setItem('mindmap_createdTopics', JSON.stringify(createdTopicIds));
    }, [createdTopicIds]);

    // Supabaseからの初期データロード
    useEffect(() => {
        const fetchTopics = async () => {
            const { data, error } = await supabase
                .from('topics')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching topics:', error);
                // エラー時はフォールバックとして初期データをセット
                setTopics(initialTopics);
            } else if (data) {
                // スネークケースからキャメルケースへの変換
                const formattedTopics = data.map(t => ({
                    id: t.id,
                    title: t.title,
                    createdAt: t.created_at,
                    views: t.views,
                    likes: t.likes,
                }));
                // もしテーブルが空なら初期データを表示用として一応セットする（DBには入れない）
                setTopics(formattedTopics.length > 0 ? formattedTopics : initialTopics);
            }
            setIsLoading(false);
        };

        fetchTopics();
    }, []);

    // リアルタイムサブスクリプション（他の人が追加・いいねした時の自動更新）
    useEffect(() => {
        const channel = supabase
            .channel('topics_channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'topics' },
                (payload) => {
                    const newRecord = payload.new as any;
                    if (payload.eventType === 'INSERT') {
                        const newTopic: Topic = {
                            id: newRecord.id,
                            title: newRecord.title,
                            createdAt: newRecord.created_at,
                            views: newRecord.views,
                            likes: newRecord.likes,
                        };
                        setTopics(prev => {
                            // 既に存在するかチェック（自分が追加したものは重複しないように）
                            if (prev.find(t => t.id === newTopic.id)) return prev;
                            // フォールバックのinitialTopicsしかない場合は置換、そうでない場合は先頭に追加
                            if (prev === initialTopics && newTopic.id !== '1' && newTopic.id !== '2') {
                                return [newTopic];
                            }
                            return [newTopic, ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setTopics(prev => prev.map(t =>
                            t.id === newRecord.id
                                ? { ...t, likes: newRecord.likes, views: newRecord.views }
                                : t
                        ));
                    } else if (payload.eventType === 'DELETE') {
                        const oldRecord = payload.old as any;
                        setTopics(prev => prev.filter(t => t.id !== oldRecord.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

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

    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicTitle.trim()) return;

        const titleToSave = newTopicTitle.trim();
        setNewTopicTitle(''); // UIをすぐにクリア

        const { data, error } = await supabase
            .from('topics')
            .insert([{ title: titleToSave }])
            .select();

        if (error) {
            console.error('Error creating topic:', error);
            alert('トピックの作成に失敗しました');
        } else if (data && data[0]) {
            // 自分が作成したトピックとしてIDを記録
            setCreatedTopicIds(prev => [...prev, data[0].id]);
        }
    };

    const handleDeleteTopic = async (topicId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!window.confirm('このトピックを削除してもよろしいですか？\n削除するとマインドマップやチャット等すべてのデータが消去されます。')) {
            return;
        }

        // オプティミスティック更新
        setTopics(prev => prev.filter(t => t.id !== topicId));
        setCreatedTopicIds(prev => prev.filter(id => id !== topicId));

        // DB削除
        const { error } = await supabase.from('topics').delete().eq('id', topicId);
        if (error) {
            console.error('Failed to delete topic:', error);
            alert('削除に失敗しました');
        }
    };

    const handleToggleLike = async (topicId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // パネルのクリックイベント（遷移）を親に伝播させない

        // 現在のユーザーのローカルいいね回数を確認（最大10回）
        const currentLikes = userLikes[topicId] || 0;
        if (currentLikes >= 10) return;

        // フォールバック初期データなどはUUIDではない可能性がありDB更新できないため弾く
        if (!topicId.includes('-')) return;

        setUserLikes(prev => ({ ...prev, [topicId]: currentLikes + 1 }));

        // 対象のトピックを現状のstateから探す
        const targetTopic = topics.find(t => t.id === topicId);
        if (targetTopic) {
            const newLikesCount = targetTopic.likes + 1;
            // オプティミスティック更新
            setTopics((prev) => prev.map((t) => t.id === topicId ? { ...t, likes: newLikesCount } : t));

            // Supabaseを更新
            await supabase.from('topics').update({ likes: newLikesCount }).eq('id', topicId);
        }
    };

    const handleTopicClick = async (topicId: string) => {
        // フォールバック初期データの遷移
        if (!topicId.includes('-')) {
            navigate(`/map/${topicId}`);
            return;
        }

        const targetTopic = topics.find(t => t.id === topicId);
        if (targetTopic) {
            // アクセス数を増やす
            const newViewsCount = targetTopic.views + 1;
            setTopics((prev) => prev.map((t) => t.id === topicId ? { ...t, views: newViewsCount } : t));

            // Supabaseのviewsを更新（※遷移を優先し await せずに裏で投げる）
            supabase.from('topics').update({ views: newViewsCount }).eq('id', topicId);
        }

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
                {isLoading ? (
                    <div className="no-results">読み込み中...</div>
                ) : (
                    <div className="topic-grid">
                        {displayedTopics.map((topic) => {
                            const isMaxLikes = (userLikes[topic.id] || 0) >= 10;
                            const isCreatedByMe = createdTopicIds.includes(topic.id);

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
                                    <div className="topic-actions">
                                        {isCreatedByMe && (
                                            <button
                                                className="delete-topic-btn"
                                                onClick={(e) => handleDeleteTopic(topic.id, e)}
                                                title="作成したトピックを削除"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
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
                                </div>
                            );
                        })}
                        {filteredAndSortedTopics.length === 0 && (
                            <div className="no-results">条件に一致するトピックが見つかりません。</div>
                        )}
                    </div>
                )}

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
