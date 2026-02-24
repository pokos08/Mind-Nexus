import { useState, useRef, useEffect } from 'react';
import { X, Send, User } from 'lucide-react';
import './FreeChatPanel.css'; // AIChatPanelのCSSをベースに一部拡張

interface FreeChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    topicId?: string;
}

type Message = {
    id: string;
    user: string;
    text: string;
    isMe: boolean;
    timestamp: string;
};

// （不要となったモック用ダミーユーザーデータは削除しました）

const INITIAL_MESSAGE: Message = {
    id: 'system-init',
    user: 'システム',
    text: '視聴者チャットへようこそ！マインドマップを見ながら自由に交流しましょう。',
    isMe: false,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export function FreeChatPanel({ isOpen, onClose, topicId }: FreeChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>(() => {
        const storageKey = `mindmap_free_chat_${topicId || 'default'}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            // ローカルストレージからも最大50件を読み込む
            const parsed = JSON.parse(saved);
            return parsed.slice(-50);
        }

        return [{
            ...INITIAL_MESSAGE,
            id: `system-init-${topicId || 'default'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }];
    });

    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // トピックが切り替わったらlocalStorageから履歴を再取得。無ければ初期化。
    useEffect(() => {
        const storageKey = `mindmap_free_chat_${topicId || 'default'}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            setMessages(JSON.parse(saved));
        } else {
            setMessages([{
                ...INITIAL_MESSAGE,
                id: `system-init-${topicId || 'default'}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }
    }, [topicId]);

    // messagesが更新されるたびにlocalStorageへ保存
    useEffect(() => {
        const storageKey = `mindmap_free_chat_${topicId || 'default'}`;
        localStorage.setItem(storageKey, JSON.stringify(messages));
    }, [messages, topicId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // ユーザーからのメッセージなどを追加し、最大50件に制限
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        // 自分のメッセージを追加し、最大50件に保つ
        setMessages(prev => {
            const newMessages = [
                ...prev,
                {
                    id: Date.now().toString(),
                    user: 'あなた',
                    text: inputText,
                    isMe: true,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                },
            ];
            return newMessages.slice(-50);
        });
        setInputText('');
    };

    if (!isOpen) return null;

    return (
        <div className="free-chat-panel open">
            <div className="chat-header">
                <div className="chat-title">
                    <User size={20} className="user-icon" />
                    <h3>参加者チャット</h3>
                </div>
                <button className="close-btn" onClick={onClose} aria-label="閉じる">
                    <X size={20} />
                </button>
            </div>

            <div className="chat-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-wrapper ${msg.isMe ? 'message-me' : 'message-other'}`}>
                        <div className="message-info">
                            <span className="user-name">{msg.user}</span>
                            <span className="timestamp">{msg.timestamp}</span>
                        </div>
                        <div className="message-bubble">
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="メッセージを入力..."
                    className="chat-input"
                />
                <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="chat-submit-btn"
                    aria-label="送信"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
