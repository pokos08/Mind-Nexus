import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { AIChatPanel } from './components/AIChatPanel';
import { HelpPanel } from './components/HelpPanel';
import { FreeChatPanel } from './components/FreeChatPanel';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { TopicList } from './pages/TopicList';
import { MindMap } from './pages/MindMap';
import './App.css';

function App() {
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isFreeChatOpen, setIsFreeChatOpen] = useState(false);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

    const location = useLocation();
    const isMapPage = location.pathname.startsWith('/map/');
    const currentTopicId = isMapPage ? location.pathname.split('/map/')[1] : null;

    // パネル開閉のロジック（排他制御）
    const toggleChat = () => {
        if (!isAIChatOpen) {
            setIsFreeChatOpen(false); // 開くときはもう一方を閉じる
            setIsHelpOpen(false);
            setIsAnalyticsOpen(false);
            // 他のパネルが閉じる少しのアニメーション猶予を与えてから開く
            setTimeout(() => setIsAIChatOpen(true), 150);
        } else {
            setIsAIChatOpen(false);
        }
    };

    const toggleHelp = () => {
        if (!isHelpOpen) {
            setIsAIChatOpen(false);
            setIsFreeChatOpen(false);
            setIsAnalyticsOpen(false);
            setTimeout(() => setIsHelpOpen(true), 150);
        } else {
            setIsHelpOpen(false);
        }
    };

    const toggleFreeChat = () => {
        if (!isFreeChatOpen) {
            setIsAIChatOpen(false); // 開くときはもう一方を閉じる
            setIsHelpOpen(false);
            setIsAnalyticsOpen(false);
            setTimeout(() => setIsFreeChatOpen(true), 150);
        } else {
            setIsFreeChatOpen(false);
        }
    };

    const toggleAnalytics = () => {
        if (!isAnalyticsOpen) {
            setIsAIChatOpen(false);
            setIsHelpOpen(false);
            setIsFreeChatOpen(false);
            setTimeout(() => setIsAnalyticsOpen(true), 150);
        } else {
            setIsAnalyticsOpen(false);
        }
    };

    // 一覧画面に戻った時にパネルが開いたままになるのを防ぐ
    useEffect(() => {
        if (!isMapPage) {
            setIsAIChatOpen(false);
            setIsFreeChatOpen(false);
            setIsHelpOpen(false);
            setIsAnalyticsOpen(false);
        }
    }, [isMapPage]);

    return (
        <div className="app-layout">
            <Header
                onToggleChat={toggleChat}
                isChatOpen={isAIChatOpen}
                onToggleHelp={toggleHelp}
                onToggleFreeChat={toggleFreeChat}
                isFreeChatOpen={isFreeChatOpen}
                onToggleAnalytics={toggleAnalytics}
                isAnalyticsOpen={isAnalyticsOpen}
            />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<TopicList />} />
                    <Route path="/map/:id" element={<MindMap />} />
                </Routes>
                <AIChatPanel isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
                <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
                <AnalyticsPanel isOpen={isAnalyticsOpen} onClose={() => setIsAnalyticsOpen(false)} />
                <FreeChatPanel
                    isOpen={isFreeChatOpen}
                    onClose={() => setIsFreeChatOpen(false)}
                    topicId={currentTopicId || undefined}
                />
            </main>
        </div>
    );
}

export default App;
