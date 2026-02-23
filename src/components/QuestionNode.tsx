import { Handle, Position } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';
import './QuestionNode.css';

export function QuestionNode({ data }: { data: { label: string, depth?: number } }) {
    const depth = data.depth || 0;

    // 階層に応じたスケール計算。最大0.6倍まで縮小
    const scale = Math.max(1 - depth * 0.15, 0.6);
    // 階層が深いほど少し暗い色に
    const opacity = Math.max(1 - depth * 0.2, 0.5);

    return (
        <div
            className={`custom-node question-node depth-${depth}`}
            style={{
                transform: `scale(${scale})`,
                opacity: opacity,
            }}
        >
            <Handle type="target" position={Position.Top} />
            <div className="node-content">
                <HelpCircle size={18} className="node-icon" />
                <span className="node-label">{data.label}</span>
            </div>
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
}
