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
import * as d3 from 'd3-hierarchy';

interface MindMapBoardProps {
    initialTopicTitle?: string;
    topicId?: string;
}

// 階層情報を持たせるためのカスタム型拡張
type CustomNodeData = {
    label: string;
    depth?: number;
};

// d3-hierarchyを用いた放射状（Radial）レイアウト関数
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    if (nodes.length === 0) return { nodes, edges };

    // edges から親子の階層構造マップを作成
    const childrenMap: Record<string, string[]> = {};
    nodes.forEach(n => childrenMap[n.id] = []);
    edges.forEach(e => {
        if (childrenMap[e.source]) {
            childrenMap[e.source].push(e.target);
        }
    });

    // rootから始まる階層データ（d3に適した形）を再帰的に生成
    // { id, children: [...] }
    const buildHierarchy = (nodeId: string): any => {
        return {
            id: nodeId,
            children: childrenMap[nodeId].map(buildHierarchy)
        };
    };

    // データフローの中央にあるべき「root」ノードを探す
    const rootNodeData = buildHierarchy('root');
    const root = d3.hierarchy(rootNodeData);

    // 半径の計算：1階層（depth）ごとの距離を設定
    const radiusStep = 160;

    // d3のtreeレイアウトを使用して、角度(x)と半径(y)を計算
    // xは 0 から 2*PI までの角度、yは深さに応じた半径の仮想座標として扱う
    const treeLayout = d3.tree<any>()
        .size([2 * Math.PI, 1])
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.5) / a.depth);

    treeLayout(root);

    // root ノードの中心座標を基準とする
    const centerX = 400;
    const centerY = 300;

    // d3が計算したノード情報を元に元のnodes配列を更新
    const layoutedNodes = nodes.map(node => {
        // ツリー探索でこのノードのポジショニング情報を探す
        const d3Node = root.descendants().find(d => d.data.id === node.id);

        let x = centerX;
        let y = centerY;

        if (d3Node && d3Node.depth !== 0 && d3Node.x !== undefined && d3Node.y !== undefined) {
            // 極座標(角度x, 距離y) を 直交座標(X, Y) に変換
            // d3Node.x は角度(ラジアン)、d3Node.y は深さ依存の相対半径(ここでは使用せず階層で固定計算)
            const angle = d3Node.x - Math.PI / 2; // -90度シフトして上起点にする
            const radius = d3Node.depth * radiusStep;
            x = centerX + radius * Math.cos(angle);
            y = centerY + radius * Math.sin(angle);
        }

        return {
            ...node,
            position: { x, y }
        };
    });

    return { nodes: layoutedNodes, edges };
};

// 全ノードの深さを再計算する関数（ルート起点でBFS）
const calculateDepths = (nodes: Node[], edges: Edge[]): Node[] => {
    const adjacencyList: Record<string, string[]> = {};
    nodes.forEach(n => adjacencyList[n.id] = []);
    edges.forEach(e => {
        if (adjacencyList[e.source]) adjacencyList[e.source].push(e.target);
    });

    const newNodes = [...nodes];
    const queue = [{ id: 'root', depth: 0 }];
    const visited = new Set(['root']);

    // rootノードの深さを0に初期化
    const rootIndex = newNodes.findIndex(n => n.id === 'root');
    if (rootIndex !== -1) {
        newNodes[rootIndex] = { ...newNodes[rootIndex], data: { ...newNodes[rootIndex].data, depth: 0 } };
    }

    while (queue.length > 0) {
        const { id, depth } = queue.shift()!;
        adjacencyList[id]?.forEach(targetId => {
            if (!visited.has(targetId)) {
                visited.add(targetId);
                const tIndex = newNodes.findIndex(n => n.id === targetId);
                if (tIndex !== -1) {
                    newNodes[tIndex] = { ...newNodes[tIndex], data: { ...newNodes[tIndex].data, depth: depth + 1 } };
                }
                queue.push({ id: targetId, depth: depth + 1 });
            }
        });
    }
    return newNodes;
};

const MindMapFlow = ({ initialTopicTitle, topicId }: MindMapBoardProps) => {
    const { fitView } = useReactFlow();

    const [nodes, setNodes] = useState<Node[]>(() => {
        const storageKey = topicId ? `mindmap_nodes_${topicId}` : `mindmap_nodes`;
        const savedNodes = localStorage.getItem(storageKey);
        if (savedNodes) return JSON.parse(savedNodes);

        // 初期データがない場合のみ作成
        const rootNode: Node = {
            id: 'root',
            data: { label: initialTopicTitle || '新しい疑問トピック', depth: 0 } as CustomNodeData,
            position: { x: 400, y: 100 },
            type: 'question',
        };
        return [rootNode];
    });

    const [edges, setEdges] = useState<Edge[]>(() => {
        const storageKey = topicId ? `mindmap_edges_${topicId}` : `mindmap_edges`;
        const savedEdges = localStorage.getItem(storageKey);
        return savedEdges ? JSON.parse(savedEdges) : [];
    });

    // 状態が変更されたらlocalStorageに保存
    useEffect(() => {
        const storageKey = topicId ? `mindmap_nodes_${topicId}` : `mindmap_nodes`;
        localStorage.setItem(storageKey, JSON.stringify(nodes));
    }, [nodes, topicId]);

    useEffect(() => {
        const storageKey = topicId ? `mindmap_edges_${topicId}` : `mindmap_edges`;
        localStorage.setItem(storageKey, JSON.stringify(edges));
    }, [edges, topicId]);

    const nodeTypes = useMemo(() => ({ question: QuestionNode }), []);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [],
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [],
    );

    // ノードの連続クリックによる繋ぎ直し機能
    const [lastClickedNodeId, setLastClickedNodeId] = useState<string | null>(null);

    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        if (lastClickedNodeId && lastClickedNodeId !== node.id) {
            // ルートノードの親は変更できない
            if (node.id === 'root') {
                setLastClickedNodeId(node.id);
                return;
            }

            setEdges((eds) => {
                // node.idに向かう既存のエッジを削除し、新しい親(lastClickedNodeId)からのエッジを追加
                const filteredEdges = eds.filter(e => e.target !== node.id);
                const newEdge = {
                    id: `e-${lastClickedNodeId}-${node.id}`,
                    source: lastClickedNodeId,
                    target: node.id,
                    type: 'straight',
                };
                const newEdges = [...filteredEdges, newEdge];

                // エッジが変更されたらノードのdepthを再計算し、レイアウトも整える
                setNodes(nds => {
                    const depthUpdatedNodes = calculateDepths(nds, newEdges);
                    const { nodes: layoutedNodes } = getLayoutedElements(depthUpdatedNodes, newEdges);
                    setTimeout(() => fitView({ duration: 800 }), 100);
                    return layoutedNodes;
                });

                return newEdges;
            });
            setLastClickedNodeId(null);
        } else {
            // 親候補として選択状態にする
            setLastClickedNodeId(node.id);
        }
    }, [lastClickedNodeId, fitView]);

    const onPaneClick = useCallback(() => {
        setLastClickedNodeId(null);
    }, []);

    // ノードが接続されたときに階層（depth）を再計算する
    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => {
                const newEdges = addEdge(params, eds);
                setNodes(nds => calculateDepths(nds, newEdges));
                return newEdges;
            });
        },
        []
    );

    // 新規ノードの追加
    const handleAddNode = useCallback((text: string) => {
        const newNodeId = Date.now().toString();

        // 選択されているノードがあればそれを親とし、無ければ root に繋ぐ
        const selectedNode = nodes.find(n => n.selected);
        const sourceId = selectedNode ? selectedNode.id : 'root';
        const sourceNode = nodes.find(n => n.id === sourceId);
        const sourceDepth = (sourceNode?.data as CustomNodeData)?.depth || 0;

        const newNode: Node = {
            id: newNodeId,
            data: { label: text, depth: sourceDepth + 1 } as CustomNodeData,
            position: { x: 0, y: 0 },
            type: 'question',
        };

        const newEdge: Edge = {
            id: `e-${sourceId}-${newNodeId}`,
            source: sourceId,
            target: newNodeId,
            type: 'straight',
        };

        setNodes((nds) => {
            const updatedNodes = [...nds, newNode];
            setEdges((eds) => {
                const updatedEdges = [...eds, newEdge];
                // d3による自動レイアウトを適用
                const { edges: layoutedEdges } = getLayoutedElements(
                    updatedNodes,
                    updatedEdges
                );
                setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
                return layoutedEdges;
            });
            // edgesのセッター内で計算したノード位置はsetNodesのコールバックでは即座に得られないため、
            // ここでもd3計算を行う
            const depthUpdatedNodes = calculateDepths(updatedNodes, [...edges, newEdge]);
            const { nodes: layoutedNodes } = getLayoutedElements(depthUpdatedNodes, [...edges, newEdge]);
            return layoutedNodes;
        });
    }, [nodes, edges, fitView]);

    return (
        <div className="mindmap-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                defaultEdgeOptions={{ type: 'straight' }}
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
