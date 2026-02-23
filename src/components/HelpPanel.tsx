import { Info, X, MapPin, PlusCircle, MessagesSquare } from 'lucide-react';
import './HelpPanel.css';

interface HelpPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
    if (!isOpen) return null;

    return (
        <div className="help-panel-overlay">
            <div className="help-panel">
                <div className="help-header">
                    <div className="help-title">
                        <Info size={24} className="info-icon" />
                        <h2>MindNexus の使い方</h2>
                    </div>
                    <button onClick={onClose} className="close-btn" aria-label="閉じる">
                        <X size={24} />
                    </button>
                </div>

                <div className="help-content">
                    <div className="help-section">
                        <div className="help-icon-wrapper blue">
                            <MapPin size={24} />
                        </div>
                        <div className="help-text">
                            <h3>キャンバスの操作</h3>
                            <p>マウスの左ドラッグでキャンバス全体を移動（パン）できます。ホイールで拡大・縮小（ズーム）が可能です。<br />ノードは自由にドラッグ＆ドロップして配置を整理できます。</p>
                        </div>
                    </div>

                    <div className="help-section">
                        <div className="help-icon-wrapper purple">
                            <PlusCircle size={24} />
                        </div>
                        <div className="help-text">
                            <h3>新しい疑問を追加</h3>
                            <p>画面下部の入力フィールドから新しい疑問やアイデアを投稿すると、マインドマップ上にノードが追加され、他のノードと重ならないように自動配置されます。</p>
                        </div>
                    </div>

                    <div className="help-section">
                        <div className="help-icon-wrapper green">
                            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>o-o</span>
                        </div>
                        <div className="help-text">
                            <h3>ノード同士をつなぐ</h3>
                            <p>ノードの下部にある「丸い接続ポイント」をドラッグし、別のノードの上部にあるポイントへドロップすると、関連するアイデア同士を線で繋ぐことができます。</p>
                        </div>
                    </div>

                    <div className="help-section">
                        <div className="help-icon-wrapper rose">
                            <MessagesSquare size={24} />
                        </div>
                        <div className="help-text">
                            <h3>AI アシスタント</h3>
                            <p>右上の「AIに質問」ボタンを押すと、いつでもマインドマップ作成を助けてくれるAIチャットパネルが開きます。</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
