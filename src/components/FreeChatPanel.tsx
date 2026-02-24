import { useState, useRef, useEffect } from 'react';
import { X, Send, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // DBからの初期データロード
    useEffect(() => {
        if (!topicId) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('topic_id', topicId)
                .order('created_at', { ascending: false }) // 最新から取得
                .limit(50); // 最大50件

            if (!error && data) {
                const formattedMessages: Message[] = data.reverse().map(m => ({ // 昇順に戻す
                    id: m.id,
                    user: m.author,
                    text: m.text,
                    isMe: m.author === 'あなた', // 簡易的な自分判定（今回は名前ベースのモック）
                    timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));

                // 初期案内メッセージを先頭に付与
                setMessages([
                    {
                        ...INITIAL_MESSAGE,
                        id: `system-init-${topicId}`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    },
                    ...formattedMessages
                ]);
            }
        };

        fetchMessages();
    }, [topicId]);

    // リアルタイムサブスクリプション（他人のメッセージ受信）
    useEffect(() => {
        if (!topicId) return;

        const channel = supabase.channel(`chat_${topicId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `topic_id=eq.${topicId}` }, (payload) => {
                const newRecord = payload.new as any;
                const newMsg: Message = {
                    id: newRecord.id,
                    user: newRecord.author,
                    text: newRecord.text,
                    isMe: newRecord.author === 'あなた', // 簡易判定
                    timestamp: new Date(newRecord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };

                setMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    const newMessages = [...prev, newMsg];
                    // Systemメッセージ(+1)を含むため最大51件
                    return newMessages.length > 51 ? newMessages.slice(newMessages.length - 51) : newMessages;
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [topicId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // ユーザーからのメッセージなどを追加しDBへ保存（最大50件）
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !topicId) return;

        const textToSave = inputText;
        setInputText(''); // UIをすぐにクリア

        // Supabaseへ保存（RealtimeのINSERT通知が返ってきて表示される）
        await supabase.from('chat_messages').insert([{
            topic_id: topicId,
            author: 'あなた', // 簡易的なユーザー名
            text: textToSave
        }]);
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
