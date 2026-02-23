import { useState } from 'react';
import { Plus } from 'lucide-react';
import './AddNodePanel.css';

interface AddNodePanelProps {
    onAdd: (text: string) => void;
}

export function AddNodePanel({ onAdd }: AddNodePanelProps) {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text.trim());
        setText('');
    };

    return (
        <div className="add-node-panel">
            <form onSubmit={handleSubmit} className="add-node-form">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="新しい疑問やテーマを投稿..."
                    className="add-node-input"
                />
                <button type="submit" disabled={!text.trim()} className="add-node-button">
                    <Plus size={18} />
                    <span>追加</span>
                </button>
            </form>
        </div>
    );
}
