export interface KnowledgeCategory {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId?: string | null;
  parent?: KnowledgeCategory | null;
  children?: KnowledgeCategory[];
  articles?: KnowledgeArticle[];
  _count?: { articles: number };
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeFile {
  id: string;
  articleId: string;
  name: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  isVideo: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  categoryId?: string | null;
  category?: KnowledgeCategory | null;
  tags?: string | null;
  createdBy?: { id: string; name: string; email: string } | null;
  publishedAt?: string | null;
  files: KnowledgeFile[];
  _count?: { views: number };
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDashboard {
  totalArticles: number;
  totalCategories: number;
  published: number;
  drafts: number;
  totalViews: number;
}
