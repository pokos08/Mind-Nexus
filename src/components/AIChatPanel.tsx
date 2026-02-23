import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, User } from 'lucide-react';
import './AIChatPanel.css';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
}

interface AIChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'ai',
            content: 'こんにちは！マインドマップの作成で分からないことや、アイデアの相談があれば何でもどうぞ。',
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // ダミーのAI応答を遅延して追加
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: `「${userMessage.content}」についてですね！現在はダミー応答を使用していますが、将来APIキーを登録することで本物のAIと通話できるようになります。`,
            };
            setMessages((prev) => [...prev, aiResponse]);
            setIsTyping(false);
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <div className="ai-chat-panel open">
            <div className="chat-header">
                <div className="chat-title">
                    <Bot size={20} className="ai-icon" />
                    <h3>AI アシスタント</h3>
                </div>
                <button onClick={onClose} className="close-btn" aria-label="閉じる">
                    <X size={20} />
                </button>
            </div>

            <div className="chat-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                        <div className="message-avatar">
                            {msg.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
                        </div>
                        <div className="message-content">{msg.content}</div>
                    </div>
                ))}
                {isTyping && (
                    <div className="chat-message ai typing-indicator">
                        <div className="message-avatar">
                            <Bot size={16} />
                        </div>
                        <div className="message-content">
                            <span>.</span><span>.</span><span>.</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="chat-input-area">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="AIに質問する..."
                    className="chat-input"
                />
                <button type="submit" disabled={!input.trim()} className="send-btn">
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
