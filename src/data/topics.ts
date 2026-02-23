export interface Topic {
    id: string;
    title: string;
    createdAt: string; // ISO String
    views: number;
    likes: number;
}

// モック用の初期トピックデータ
export const initialTopics: Topic[] = [
    {
        id: '1',
        title: 'Web開発のトレンドとは？',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        views: 1250,
        likes: 85,
    },
    {
        id: '2',
        title: 'AIツールを業務で活用する方法',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
        views: 840,
        likes: 120,
    },
    {
        id: '3',
        title: 'React Server Componentsの仕組み',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
        views: 200,
        likes: 15,
    },
    {
        id: '4',
        title: 'おすすめのUIライブラリについて',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
        views: 3400,
        likes: 45,
    },
    {
        id: '5',
        title: 'ViteとWebpackの比較',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
        views: 5200,
        likes: 210,
    },
];
