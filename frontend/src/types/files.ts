export interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
  parent?: Folder | null;
  children?: Folder[];
  projectId?: string | null;
  clientId?: string | null;
  createdBy?: { id: string; name: string; email: string } | null;
  isActive: boolean;
  _count?: { files: number; children: number };
  createdAt: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  notes?: string | null;
  uploadedBy?: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  folderId?: string | null;
  folder?: { id: string; name: string } | null;
  projectId?: string | null;
  clientId?: string | null;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  version: number;
  uploadedBy?: { id: string; name: string; email: string } | null;
  versions?: FileVersion[];
  _count?: { versions: number; activity: number };
  createdAt: string;
  updatedAt: string;
}

export interface FileActivityLog {
  id: string;
  fileId?: string | null;
  folderId?: string | null;
  action: string;
  details?: string | null;
  user?: { id: string; name: string; email: string } | null;
  createdAt: string;
}
