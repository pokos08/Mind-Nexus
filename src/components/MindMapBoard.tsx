import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Node,
    Edge,
    NodeChange,
    EdgeChange,
    Connection,
    BackgroundVariant,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { QuestionNode } from './QuestionNode';
import { AddNodePanel } from './AddNodePanel';
import dagre from 'dagre';

interface MindMapBoardProps {
    initialTopicTitle?: string;
}

// 階層情報を持たせるためのカスタム型拡張
type CustomNodeData = {
    label: string;
    depth?: number;
};

// Dagreを用いたノードの自動レイアウト関数
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 200;
    const nodeHeight = 60;

    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const newNode = {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
        return newNode;
    });

    return { nodes: newNodes, edges };
};

const MindMapFlow = ({ initialTopicTitle }: MindMapBoardProps) => {
    const { fitView } = useReactFlow();

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    // 初期ノードの設定
    useEffect(() => {
        const rootNode: Node = {
            id: 'root',
            data: { label: initialTopicTitle || '新しい疑問トピック', depth: 0 } as CustomNodeData,
            position: { x: 400, y: 100 },
            type: 'question',
        };
        setNodes([rootNode]);
    }, [initialTopicTitle]);

    const nodeTypes = useMemo(() => ({ question: QuestionNode }), []);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [],
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [],
    );

    // ノードが接続されたときに階層（depth）を計算する
    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => {
                const newEdges = addEdge(params, eds);

                // 接続先のノードのdepthを更新
                setNodes((nds) => {
                    const sourceNode = nds.find(n => n.id === params.source);
                    if (!sourceNode) return nds;

                    const sourceDepth = (sourceNode.data as CustomNodeData).depth || 0;
                    return nds.map(n => {
                        if (n.id === params.target) {
                            return { ...n, data: { ...n.data, depth: sourceDepth + 1 } };
                        }
                        return n;
                    });
                });

                return newEdges;
            });
        },
        []
    );

    // 新規ノードの追加。ランダム配置後、再レイアウトボタンなどで整列させる方針
    // 今回は追加時にDagreレイアウトを自動実行させる
    const handleAddNode = useCallback((text: string) => {
        const newNodeId = Date.now().toString();
        const newNode: Node = {
            id: newNodeId,
            data: { label: text, depth: 1 } as CustomNodeData, // デフォルト深さはルートからの派生を想定
            position: { x: 0, y: 0 }, // レイアウト関数で上書きされる
            type: 'question',
        };

        // 新規ノードはデフォルトでrootノードへ接続されると仮定する
        const newEdge: Edge = {
            id: `e-root-${newNodeId}`,
            source: 'root',
            target: newNodeId,
            type: 'default',
        };

        setNodes((nds) => {
            const updatedNodes = [...nds, newNode];
            setEdges((eds) => {
                const updatedEdges = [...eds, newEdge];
                // Dagreによる自動レイアウトを適用
                const { edges: layoutedEdges } = getLayoutedElements(
                    updatedNodes,
                    updatedEdges
                );
                setTimeout(() => fitView({ duration: 800 }), 100);
                return layoutedEdges;
            });
            // edgesのセッター内で計算したノード位置はsetNodesのコールバックでは即座に得られないため、
            // ここでもDagre計算を行う（実際のアプリではuseEffect等で纏めるのが望ましい）
            const { nodes: layoutedNodes } = getLayoutedElements(updatedNodes, [...edges, newEdge]);
            return layoutedNodes;
        });
    }, [edges, fitView]);

    return (
        <div className="mindmap-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
                <Controls />
            </ReactFlow>
            <AddNodePanel onAdd={handleAddNode} />
        </div>
    );
};

export function MindMapBoard(props: MindMapBoardProps) {
    return (
        <ReactFlowProvider>
            <MindMapFlow {...props} />
        </ReactFlowProvider>
    );
}
