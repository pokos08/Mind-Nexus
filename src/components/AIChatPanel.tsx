import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, User } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
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
    const [messages, setMessages] = useState<Message[]>(() => {
        const savedMessages = localStorage.getItem('mindmap_ai_chat');
        if (savedMessages) {
            return JSON.parse(savedMessages);
        }
        return [
            {
                id: '1',
                role: 'ai',
                content: 'こんにちは！マインドマップの作成で分からないことや、アイデアの相談があれば何でもどうぞ。',
            },
        ];
    });

    useEffect(() => {
        localStorage.setItem('mindmap_ai_chat', JSON.stringify(messages));
    }, [messages]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userText = input;
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userText,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            // apiKeyはローカルの.env.local、もしくはVercel環境変数から取得
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("APIキーが設定されていません。VITE_GEMINI_API_KEY を確認してください。");
            }

            const ai = new GoogleGenAI({ apiKey });

            // これまでの会話履歴を作成してコンテキストを持たせる
            const contents = messages.map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            // 初回システムの挨拶は省略する等の工夫も可能ですが、今回はそのまま送信
            contents.push({
                role: 'user',
                parts: [{ text: userText }]
            });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contents
            });

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response.text || '回答を取得できませんでした。',
            };
            setMessages((prev) => [...prev, aiResponse]);

        } catch (error) {
            console.error("Gemini API Error:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: `エラーが発生しました: ${(error as Error).message}`,
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
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
