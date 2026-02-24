import { Handle, Position } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';
import './QuestionNode.css';

export function QuestionNode({ data, selected }: { data: { label: string, depth?: number }, selected?: boolean }) {
    const depth = data.depth || 0;

    // Depthは最大10までサポート
    const validDepth = Math.min(depth, 10);
    const depthClass = `depth-${validDepth}`;

    // 選択中の場合は強調クラスを付与
    const selectedClass = selected ? 'is-selected' : '';

    return (
        <div className={`custom-node question-node ${depthClass} ${selectedClass}`}>
            <Handle
                type="target"
                position={Position.Top}
                style={{ opacity: 0, pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            />
            <div className="node-content">
                <HelpCircle size={18} className="node-icon" />
                <span className="node-label">{data.label}</span>
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                style={{ opacity: 0, pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            />
        </div>
    );
}
