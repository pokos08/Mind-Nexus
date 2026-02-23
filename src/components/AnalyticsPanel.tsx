import { BarChart3, X, Users, MessageSquareText, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import './AnalyticsPanel.css';

interface AnalyticsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AnalyticsPanel = ({ isOpen, onClose }: AnalyticsPanelProps) => {
    if (!isOpen) return null;

    // モックデータ
    const analyticsData = {
        liveViewers: { value: 124, trend: 'up', change: '+12%', label: '現在のアクティブユーザー' },
        totalVisitors: { value: '8,432', trend: 'up', change: '+5.4%', label: '累計訪問者数 (今月)' },
        totalComments: { value: '1,205', trend: 'down', change: '-2.1%', label: '総コメント数 (今週)' },
        avgTimeOnSite: { value: '4m 32s', trend: 'up', change: '+18%', label: '平均滞在時間' },
    };

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
                    {/* Live Viewers Card */}
                    <div className="bento-card highlight-card">
                        <div className="card-header">
                            <Eye size={18} className="card-icon" />
                            <span>Live Viewers</span>
                        </div>
                        <div className="card-body">
                            <span className="live-indicator"></span>
                            <h2>{analyticsData.liveViewers.value}</h2>
                        </div>
                        <div className="card-footer">
                            <p className="description">{analyticsData.liveViewers.label}</p>
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

                    {/* Avg Time Card (Span 2 columns if needed, or just normal card) */}
                    <div className="bento-card full-width">
                        <div className="card-header">
                            <BarChart3 size={18} className="card-icon green-icon" />
                            <span>Average Engagement</span>
                        </div>
                        <div className="card-body">
                            <h2>{analyticsData.avgTimeOnSite.value}</h2>
                        </div>
                        <div className="card-footer">
                            <div className="trend-badge positive">
                                <TrendingUp size={14} />
                                <span>{analyticsData.avgTimeOnSite.change}</span>
                            </div>
                            <p className="description">{analyticsData.avgTimeOnSite.label}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
