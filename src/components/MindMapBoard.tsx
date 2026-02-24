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
import { supabase } from '../lib/supabase';

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

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // 自分が作成したノードのIDをローカルに記録
    const [createdNodeIds, setCreatedNodeIds] = useState<string[]>(() => {
        const storageKey = `mindmap_createdNodes_${topicId || 'default'}`;
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const storageKey = `mindmap_createdNodes_${topicId || 'default'}`;
        localStorage.setItem(storageKey, JSON.stringify(createdNodeIds));
    }, [createdNodeIds, topicId]);

    // Supabaseからの初期データロード
    useEffect(() => {
        if (!topicId) return;

        const fetchData = async () => {
            const { data: dbNodes, error: nodesError } = await supabase
                .from('nodes')
                .select('*')
                .eq('topic_id', topicId);

            const { data: dbEdges, error: edgesError } = await supabase
                .from('edges')
                .select('*')
                .eq('topic_id', topicId);

            if (!nodesError && !edgesError && dbNodes && dbEdges) {
                // DBから取得したデータをReact Flow用のフォーマットに変換
                let formattedNodes: Node[] = dbNodes.map(n => ({
                    id: n.id,
                    type: 'question',
                    position: { x: n.position_x || 0, y: n.position_y || 0 }, // d3レイアウトが後で上書きするが初期値として必要
                    data: { label: n.label, depth: n.depth } as CustomNodeData
                }));

                let formattedEdges: Edge[] = dbEdges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    type: 'straight'
                }));

                // 新規作成されたばかり（DBが空）の場合、rootノードを作成してDBへ保存
                if (formattedNodes.length === 0) {
                    const rootNode: Node = {
                        id: 'root',
                        data: { label: initialTopicTitle || '新しい疑問トピック', depth: 0 } as CustomNodeData,
                        position: { x: 400, y: 100 },
                        type: 'question',
                    };
                    formattedNodes = [rootNode];

                    // 初期ノードをDBに保存(非同期)
                    supabase.from('nodes').insert([{
                        id: rootNode.id,
                        topic_id: topicId,
                        label: rootNode.data.label,
                        depth: 0,
                        position_x: 400,
                        position_y: 100,
                        parent_id: null
                    }]).then();

                    setCreatedNodeIds(prev => Array.from(new Set([...prev, rootNode.id])));
                }

                // 初期配置もレイアウト適用
                const depthUpdatedNodes = calculateDepths(formattedNodes, formattedEdges);
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(depthUpdatedNodes, formattedEdges);

                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
                setIsInitialized(true);
                setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
            }
        };

        fetchData();
    }, [topicId, initialTopicTitle, fitView]);

    // ─────────────────────────────────────────
    // リアルタイムサブスクリプション（Nodes & Edges）
    // ─────────────────────────────────────────
    useEffect(() => {
        if (!topicId || !isInitialized) return;

        const channel = supabase.channel(`mindmap_${topicId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nodes', filter: `topic_id=eq.${topicId}` }, (payload) => {
                const newRecord = payload.new as any;
                setNodes(prev => {
                    if (prev.find(n => n.id === newRecord.id)) return prev;
                    const newNode: Node = {
                        id: newRecord.id,
                        type: 'question',
                        position: { x: newRecord.position_x || 0, y: newRecord.position_y || 0 },
                        data: { label: newRecord.label, depth: newRecord.depth } as CustomNodeData
                    };
                    return [...prev, newNode];
                });
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'edges', filter: `topic_id=eq.${topicId}` }, (payload) => {
                const newRecord = payload.new as any;
                setEdges(prev => {
                    if (prev.find(e => e.id === newRecord.id)) return prev;
                    const newEdge: Edge = {
                        id: newRecord.id,
                        source: newRecord.source,
                        target: newRecord.target,
                        type: 'straight'
                    };
                    return [...prev, newEdge];
                });
            })
            // エッジ更新（繋ぎ直し）の場合の削除対応などは省略し、最新状態を手動で計算するロジックはクライアントで担保する前提
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [topicId, isInitialized]);

    // サブスクリプションからの削除イベント対応を追加
    useEffect(() => {
        if (!topicId || !isInitialized) return;

        const channel = supabase.channel(`mindmap_delete_${topicId}`)
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'nodes', filter: `topic_id=eq.${topicId}` }, (payload) => {
                const oldRecord = payload.old as any;
                setNodes(prev => prev.filter(n => n.id !== oldRecord.id));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'edges', filter: `topic_id=eq.${topicId}` }, (payload) => {
                const oldRecord = payload.old as any;
                setEdges(prev => prev.filter(e => e.id !== oldRecord.id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [topicId, isInitialized]);

    // ノードやエッジが外部(サブスクリプション)から更新された際に全体レイアウトを再計算する
    // ※ ユーザー自身が操作した直後にも呼ばれる
    useEffect(() => {
        if (!isInitialized) return;
        // （複雑化を避けるため、ここでは再レイアウトのトリガーは主に handleAddNode など操作側に寄せる。
        // リモートからの挿入時のみレイアウト再計算が必要だが、無限ループ防止のためここでは簡易実装にとどめる）
    }, [nodes.length, edges.length]);


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
                const filteredEdges = eds.filter(e => e.target !== node.id);
                const newEdge = {
                    id: `e-${lastClickedNodeId}-${node.id}`,
                    source: lastClickedNodeId,
                    target: node.id,
                    type: 'straight',
                };
                const newEdges = [...filteredEdges, newEdge];

                setNodes(nds => {
                    const depthUpdatedNodes = calculateDepths(nds, newEdges);
                    const { nodes: layoutedNodes } = getLayoutedElements(depthUpdatedNodes, newEdges);
                    setTimeout(() => fitView({ duration: 800 }), 100);
                    return layoutedNodes;
                });

                // DBへの反映 (エッジの削除と再作成)
                if (topicId) {
                    // 対象ノードに向かう古いエッジをDBから削除し、新しいエッジをINSERTする
                    supabase.from('edges').delete().eq('target', node.id).eq('topic_id', topicId).then(() => {
                        supabase.from('edges').insert([{
                            id: newEdge.id,
                            topic_id: topicId,
                            source: newEdge.source,
                            target: newEdge.target
                        }]).then();
                    });
                }

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

    // ノードがドラッグ等で接続されたときに階層（depth）を再計算する (今回はAddNodePanel中心なので予備)
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
                const { edges: layoutedEdges } = getLayoutedElements(updatedNodes, updatedEdges);

                // DBへの保存処理
                if (topicId) {
                    supabase.from('nodes').insert([{
                        id: newNode.id,
                        topic_id: topicId,
                        label: newNode.data.label,
                        depth: newNode.data.depth,
                        position_x: 0,
                        position_y: 0,
                        parent_id: sourceId
                    }]).then();

                    supabase.from('edges').insert([{
                        id: newEdge.id,
                        topic_id: topicId,
                        source: newEdge.source,
                        target: newEdge.target
                    }]).then();

                    setCreatedNodeIds(prev => Array.from(new Set([...prev, newNode.id])));
                }

                setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
                return layoutedEdges;
            });
            const depthUpdatedNodes = calculateDepths(updatedNodes, [...edges, newEdge]);
            const { nodes: layoutedNodes } = getLayoutedElements(depthUpdatedNodes, [...edges, newEdge]);
            return layoutedNodes;
        });
    }, [nodes, edges, fitView, topicId]);

    // ノード削除処理
    const handleDeleteNode = useCallback(async () => {
        if (!lastClickedNodeId || lastClickedNodeId === 'root' || !topicId) return;

        // 子ノードを持っている場合は削除をブロック（ツリー構造の破壊を防ぐため）
        const hasChildren = edges.some(e => e.source === lastClickedNodeId);
        if (hasChildren) {
            alert('このテーマから下層に新しい疑問が繋がっているため削除できません。先に下層の疑問を削除してください。');
            return;
        }

        if (!window.confirm('このノードを削除してもよろしいですか？')) return;

        const targetId = lastClickedNodeId;

        // 楽観的UI更新
        setNodes(nds => nds.filter(n => n.id !== targetId));
        setEdges(eds => eds.filter(e => e.source !== targetId && e.target !== targetId));
        setCreatedNodeIds(prev => prev.filter(id => id !== targetId));
        setLastClickedNodeId(null);

        // Supabase上から対象のノードと、対象ノードに向かっているエッジを削除
        await supabase.from('nodes').delete().eq('id', targetId).eq('topic_id', topicId);
        await supabase.from('edges').delete().or(`source.eq.${targetId},target.eq.${targetId}`).eq('topic_id', topicId);

    }, [lastClickedNodeId, edges, topicId]);

    const isSelectedDeletable = Boolean(
        lastClickedNodeId &&
        lastClickedNodeId !== 'root' &&
        createdNodeIds.includes(lastClickedNodeId)
    );

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
            <AddNodePanel
                onAdd={handleAddNode}
                onDelete={handleDeleteNode}
                isDeletable={isSelectedDeletable}
            />
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
