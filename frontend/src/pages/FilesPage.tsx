import { useEffect, useState } from "react";
import { Folder as FolderIcon, File as FileIcon, Plus, RefreshCcw, Upload, Download, Trash2, XCircle, ChevronRight, Home, History, FileJson } from "lucide-react";
import { apiClient } from "../api/client";
import type { FileItem, FileVersion, FileActivityLog, Folder as FolderType } from "../types/files";

const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function formatSize(bytes: number) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime?: string | null) {
  if (!mime) return <FileIcon size={18} className="text-slate-400" />;
  if (mime.startsWith("image/")) return <FileIcon size={18} className="text-purple-500" />;
  if (mime.includes("pdf")) return <FileJson size={18} className="text-red-500" />;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("sheet")) return <FileIcon size={18} className="text-green-500" />;
  if (mime.includes("word") || mime.includes("document")) return <FileIcon size={18} className="text-blue-500" />;
  return <FileIcon size={18} className="text-slate-400" />;
}

export default function FilesPage() {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<FolderType[]>([]);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"browse" | "activity">("browse");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [activity, setActivity] = useState<FileActivityLog[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  async function loadFolders(parentId: string | null) {
    try {
      const params: Record<string, string> = {};
      if (parentId) params.parentId = parentId;
      const res = await apiClient.get("/files/folders", { params });
      setFolders(res.data.data || []);
    } catch { setMessage("Failed to load folders"); }
  }

  async function loadFiles(folderId: string | null) {
    try {
      const params: Record<string, string> = {};
      if (folderId) params.folderId = folderId;
      const res = await apiClient.get("/files", { params });
      setFiles(res.data.data || []);
    } catch { setMessage("Failed to load files"); }
  }

  async function loadBreadcrumb(folderId: string | null) {
    const crumbs: FolderType[] = [];
    let current = folderId;
    while (current) {
      try {
        const res = await apiClient.get(`/files/folders`);
        const folder = (res.data.data as FolderType[]).find((f: FolderType) => f.id === current);
        if (folder) { crumbs.unshift(folder); current = folder.parentId || null; }
        else break;
      } catch { break; }
    }
    setBreadcrumb(crumbs);
  }

  useEffect(() => {
    loadFolders(currentFolder);
    loadFiles(currentFolder);
    loadBreadcrumb(currentFolder);
  }, [currentFolder]);

  async function loadActivity() {
    try { const res = await apiClient.get("/files/activity/list"); setActivity(res.data.data || []); } catch {}
  }
  useEffect(() => { if (view === "activity") loadActivity(); }, [view]);

  async function createFolder() {
    if (!newFolderName.trim()) { setMessage("Folder name is required"); return; }
    try {
      await apiClient.post("/files/folders", { name: newFolderName, parentId: currentFolder });
      setMessage("Folder created");
      setNewFolderName("");
      setShowCreateFolder(false);
      loadFolders(currentFolder);
    } catch { setMessage("Failed to create folder"); }
  }

  async function deleteFolder(id: string) {
    try { await apiClient.delete(`/files/folders/${id}`); setMessage("Folder deleted"); loadFolders(currentFolder); } catch { setMessage("Cannot delete non-empty folder"); }
  }

  async function handleUpload() {
    if (!uploadFile) { setMessage("Select a file"); return; }
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (currentFolder) formData.append("folderId", currentFolder);
      await apiClient.post("/files/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setMessage("File uploaded");
      setUploadFile(null);
      loadFiles(currentFolder);
    } catch { setMessage("Failed to upload file"); }
  }

  async function deleteFile(id: string) {
    try { await apiClient.delete(`/files/${id}`); setMessage("File deleted"); loadFiles(currentFolder); if (selectedFile?.id === id) setSelectedFile(null); } catch { setMessage("Failed to delete"); }
  }

  async function loadVersions(fileId: string) {
    try { const res = await apiClient.get(`/files/${fileId}/versions`); setVersions(res.data.data || []); } catch {}
  }

  function openFile(file: FileItem) {
    setSelectedFile(file);
    loadVersions(file.id);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.28em] text-blue-200">Phase 13</p>
            <h1 className="mt-3 text-4xl font-black">File & Asset Management</h1>
            <p className="mt-2 text-sm text-blue-100">Folder system, file uploads, version control and activity tracking.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex rounded-xl bg-white/10">
              {(["browse", "activity"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-4 py-2 text-sm font-black transition ${view === v ? "bg-white text-blue-800" : "text-blue-100 hover:text-white"}`}>
                  {v === "browse" ? "Browse" : "Activity"}
                </button>
              ))}
            </div>
            <button onClick={() => { loadFolders(currentFolder); loadFiles(currentFolder); }} className="rounded-xl bg-white/10 p-3"><RefreshCcw size={18} /></button>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl bg-blue-50 p-4 text-sm font-bold text-blue-800">
          {message}
          <button onClick={() => setMessage("")} className="ml-3 text-blue-400 hover:text-blue-700"><XCircle size={16} className="inline" /></button>
        </div>
      )}

      {view === "browse" && (
        <>
          {/* Breadcrumb */}
          <section className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white px-5 py-3">
            <button onClick={() => setCurrentFolder(null)} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${!currentFolder ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:bg-slate-100"}`}>
              <Home size={15} />Root
            </button>
            {breadcrumb.map((f) => (
              <div key={f.id} className="flex items-center gap-1">
                <ChevronRight size={14} className="text-slate-300" />
                <button onClick={() => setCurrentFolder(f.id)} className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100">
                  <FolderIcon size={14} className="inline mr-1 text-amber-500" />{f.name}
                </button>
              </div>
            ))}
            <div className="ml-auto flex gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">
                <Upload size={16} />Upload
                <input type="file" className="hidden" onChange={(e) => { setUploadFile(e.target.files?.[0] || null); }} />
              </label>
              {uploadFile && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-600">{uploadFile.name}</span>
                  <button onClick={handleUpload} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-black text-white hover:bg-green-700">Save</button>
                  <button onClick={() => setUploadFile(null)} className="text-sm text-red-500"><XCircle size={18} /></button>
                </div>
              )}
              <button onClick={() => setShowCreateFolder(!showCreateFolder)} className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50">
                <Plus size={16} />Folder
              </button>
            </div>
          </section>

          {showCreateFolder && (
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex gap-2">
                <input className={field} placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createFolder(); }} />
                <button onClick={createFolder} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white">Create</button>
                <button onClick={() => setShowCreateFolder(false)} className="rounded-xl border px-5 py-2.5 text-sm font-black text-slate-500">Cancel</button>
              </div>
            </section>
          )}

          {/* Folders grid */}
          <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {folders.map((f) => (
              <div key={f.id} className="group relative rounded-2xl border bg-white p-5 transition hover:shadow-md hover:border-amber-200">
                <button onClick={() => setCurrentFolder(f.id)} className="w-full text-left">
                  <FolderIcon size={32} className="text-amber-400" />
                  <h3 className="mt-3 text-sm font-black truncate">{f.name}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">{f._count?.files || 0} files &middot; {f._count?.children || 0} folders</p>
                </button>
                <button onClick={() => deleteFolder(f.id)} className="absolute right-3 top-3 hidden rounded-lg border bg-white p-1 text-red-500 hover:bg-red-50 group-hover:block"><Trash2 size={14} /></button>
              </div>
            ))}
            {folders.length === 0 && (
              <div className="col-span-full rounded-2xl border-2 border-dashed bg-slate-50 p-10 text-center">
                <FolderIcon size={40} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-400">No folders here yet</p>
              </div>
            )}
          </section>

          {/* Files list */}
          <section className="rounded-2xl border bg-white">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-black">Files ({files.length})</h2>
            </div>
            <div className="divide-y">
              {files.length === 0 && <p className="px-6 py-10 text-center text-sm font-bold text-slate-400">No files in this location</p>}
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50">
                  <button onClick={() => openFile(file)} className="flex flex-1 items-center gap-4 text-left">
                    {fileIcon(file.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate">{file.name}</p>
                      <p className="text-xs font-bold text-slate-400">
                        {formatSize(file.fileSize || 0)} &middot; v{file.version} &middot; {file.uploadedBy?.name || "Unknown"}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <a href={`${API_BASE}${file.fileUrl}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Download"><Download size={15} /></a>
                    <button onClick={() => deleteFile(file.id)} className="rounded-lg border p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* File detail panel */}
          {selectedFile && (
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    {fileIcon(selectedFile.mimeType)}
                    <h3 className="text-xl font-black">{selectedFile.name}</h3>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm font-bold text-slate-500">
                    <span>Size: {formatSize(selectedFile.fileSize || 0)}</span>
                    <span>Version: {selectedFile.version}</span>
                    <span>Type: {selectedFile.mimeType || "-"}</span>
                  </div>
                </div>
                <a href={`${API_BASE}${selectedFile.fileUrl}`} target="_blank" className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white" rel="noopener noreferrer"><Download size={16} />Download</a>
              </div>

              {/* Versions */}
              <div className="mt-5">
                <h4 className="font-black text-blue-900">Version History ({versions.length})</h4>
                <div className="mt-2 space-y-2">
                  {versions.length === 0 && <p className="text-sm text-slate-400">No version history</p>}
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-xl bg-white p-4">
                      <div>
                        <p className="text-sm font-bold">Version {v.versionNumber}</p>
                        <p className="text-xs text-slate-400">{v.uploadedBy?.name} &middot; {new Date(v.createdAt).toLocaleString()}</p>
                        {v.notes && <p className="text-xs text-slate-500 mt-1">{v.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span>{formatSize(v.fileSize || 0)}</span>
                        <a href={`${API_BASE}${v.fileUrl}`} target="_blank" className="rounded-lg border p-1.5 text-blue-600 hover:bg-blue-50" rel="noopener noreferrer"><Download size={14} /></a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {view === "activity" && (
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-black">Activity Log</h2>
          <div className="mt-5 space-y-2">
            {activity.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No activity yet</p>}
            {activity.map((log) => (
              <div key={log.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <History size={16} className="text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    <span className="font-black">{log.user?.name || "System"}</span> {log.details || log.action}
                  </p>
                </div>
                <p className="text-xs font-bold text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
