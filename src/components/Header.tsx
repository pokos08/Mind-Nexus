import { BrainCircuit, MessageSquareText, HelpCircle, ArrowLeft, Users, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
    onToggleChat: () => void;
    isChatOpen: boolean;
    onToggleHelp: () => void;
    onToggleFreeChat: () => void;
    isFreeChatOpen: boolean;
    onToggleAnalytics: () => void;
    isAnalyticsOpen: boolean;
}

export function Header({ onToggleChat, isChatOpen, onToggleHelp, onToggleFreeChat, isFreeChatOpen, onToggleAnalytics, isAnalyticsOpen }: HeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();

    // マインドマップ画面（/map/xxx）にいるか判定
    const isMapPage = location.pathname.startsWith('/map/');

    return (
        <header className="header">
            <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {isMapPage && (
                    <button
                        className="back-btn"
                        onClick={() => navigate('/')}
                        title="一覧へ戻る"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <ArrowLeft size={24} />
                    </button>
                )}
                <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BrainCircuit size={28} className="logo-icon" />
                    <h1>MindNexus</h1>
                </div>
            </div>

            <div className="header-actions" style={{ gap: '12px' }}>
                <button
                    className={`chat-toggle-btn ${isAnalyticsOpen ? 'active' : ''}`}
                    onClick={onToggleAnalytics}
                    title="アナリティクスを開閉"
                >
                    <BarChart3 size={20} />
                    <span>データ</span>
                </button>
                <button
                    className={`chat-toggle-btn ${isFreeChatOpen ? 'active' : ''}`}
                    onClick={onToggleFreeChat}
                    title="視聴者チャットを開閉"
                >
                    <Users size={20} />
                    <span>参加者チャット</span>
                </button>
                <button
                    className="chat-toggle-btn"
                    onClick={onToggleHelp}
                    title="操作方法のヘルプ"
                >
                    <HelpCircle size={20} />
                    <span>ヘルプ</span>
                </button>
                <button
                    className={`chat-toggle-btn ${isChatOpen ? 'active' : ''}`}
                    onClick={onToggleChat}
                    title="AIチャットを開閉"
                >
                    <MessageSquareText size={20} />
                    <span>AIに質問</span>
                </button>
            </div>
        </header>
    );
}
