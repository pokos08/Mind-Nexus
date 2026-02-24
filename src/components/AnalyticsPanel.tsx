import { useState, useEffect } from 'react';
import { BarChart3, X, Users, MessageSquareText, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './AnalyticsPanel.css';

interface AnalyticsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AnalyticsPanel = ({ isOpen, onClose }: AnalyticsPanelProps) => {
    if (!isOpen) return null;

    // 初期データ
    const defaultData = {
        totalTopics: { value: 0, trend: 'neutral', change: '-', label: '作成されたトピック数' },
        totalVisitors: { value: '0', trend: 'neutral', change: '-', label: '累計アクセス数' },
        totalComments: { value: '0', trend: 'neutral', change: '-', label: '総ユーザーコメント数' },
        totalLikes: { value: '0', trend: 'neutral', change: '-', label: '獲得した総いいね数' },
    };

    const [analyticsData, setAnalyticsData] = useState(() => {
        const savedData = localStorage.getItem('mindmap_analytics_real');
        return savedData ? JSON.parse(savedData) : defaultData;
    });

    // データ変更時にlocalStorageへ保存
    useEffect(() => {
        localStorage.setItem('mindmap_analytics_real', JSON.stringify(analyticsData));
    }, [analyticsData]);

    // 実データをポーリングして集計する
    useEffect(() => {
        if (!isOpen) return;

        const updateData = async () => {
            try {
                // TopicListの実データをDBから取得
                const { data: topics, error: topicsError } = await supabase.from('topics').select('views, likes');

                let totalTopics = 0;
                let totalViews = 0;
                let totalLikes = 0;

                if (!topicsError && topics) {
                    totalTopics = topics.length;
                    totalViews = topics.reduce((sum: number, t: any) => sum + (t.views || 0), 0);
                    totalLikes = topics.reduce((sum: number, t: any) => sum + (t.likes || 0), 0);
                }

                // チャットのメッセージ件数をDBから取得（システムメッセージは記録しない前提）
                const { count: commentsCount, error: commentsError } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true });

                const totalComments = commentsError ? 0 : (commentsCount || 0);

                setAnalyticsData({
                    totalTopics: { value: totalTopics, trend: 'neutral', change: '-', label: '作成されたトピック数' },
                    totalVisitors: { value: totalViews.toLocaleString(), trend: 'neutral', change: '-', label: '累計アクセス数' },
                    totalComments: { value: totalComments.toLocaleString(), trend: 'neutral', change: '-', label: '総ユーザーコメント数' },
                    totalLikes: { value: totalLikes.toLocaleString(), trend: 'neutral', change: '-', label: '獲得した総いいね数' },
                });
            } catch (error) {
                console.error('Failed to parse analytics data:', error);
            }
        };

        updateData();
        const intervalId = setInterval(updateData, 10000); // サーバー負荷軽減のため10秒おきに最新化

        return () => clearInterval(intervalId);
    }, [isOpen]);

    return (
        <div className="analytics-panel open">
            <div className="panel-header">
                <div className="panel-title">
                    <BarChart3 size={20} className="analytics-icon" />
                    <h3>ダッシュボード</h3>
                </div>
                <button className="close-btn" onClick={onClose} aria-label="閉じる">
                    <X size={20} />
                </button>
            </div>

            <div className="analytics-content">
                <p className="analytics-subtitle">サイト全体の盛り上がりやユーザーの反応を確認できます。</p>

                <div className="bento-grid">
                    {/* Total Topics Card */}
                    <div className="bento-card highlight-card">
                        <div className="card-header">
                            <BarChart3 size={18} className="card-icon" />
                            <span>Total Topics</span>
                        </div>
                        <div className="card-body">
                            <h2>{analyticsData.totalTopics.value}</h2>
                        </div>
                        <div className="card-footer">
                            <p className="description">{analyticsData.totalTopics.label}</p>
                        </div>
                    </div>

                    {/* Total Visitors Card */}
                    <div className="bento-card">
                        <div className="card-header">
                            <Users size={18} className="card-icon blue-icon" />
                            <span>Total Visitors</span>
                        </div>
                        <div className="card-body">
                            <h2>{analyticsData.totalVisitors.value}</h2>
                        </div>
                        <div className="card-footer">
                            <div className="trend-badge positive">
                                <TrendingUp size={14} />
                                <span>{analyticsData.totalVisitors.change}</span>
                            </div>
                            <p className="description">{analyticsData.totalVisitors.label}</p>
                        </div>
                    </div>

                    {/* Total Comments Card */}
                    <div className="bento-card">
                        <div className="card-header">
                            <MessageSquareText size={18} className="card-icon purple-icon" />
                            <span>Total Comments</span>
                        </div>
                        <div className="card-body">
                            <h2>{analyticsData.totalComments.value}</h2>
                        </div>
                        <div className="card-footer">
                            <div className="trend-badge negative">
                                <TrendingDown size={14} />
                                <span>{analyticsData.totalComments.change}</span>
                            </div>
                            <p className="description">{analyticsData.totalComments.label}</p>
                        </div>
                    </div>

                    {/* Total Likes Card */}
                    <div className="bento-card full-width">
                        <div className="card-header">
                            <TrendingUp size={18} className="card-icon green-icon" />
                            <span>Total Likes</span>
                        </div>
                        <div className="card-body">
                            <h2>{analyticsData.totalLikes.value}</h2>
                        </div>
                        <div className="card-footer">
                            <p className="description">{analyticsData.totalLikes.label}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
