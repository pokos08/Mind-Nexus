export interface Topic {
    id: string;
    title: string;
    createdAt: string; // ISO String
    views: number;
    likes: number;
}

// モック用の初期トピックデータ
export const initialTopics: Topic[] = [];
