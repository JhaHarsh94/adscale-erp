import { useEffect, useState } from "react";
import { Plus, RefreshCcw, BookOpen, FileText, Eye, Search, XCircle, Trash2, ChevronRight, Folder, Save, Send, Archive, CheckCircle, Edit3 } from "lucide-react";
import { apiClient } from "../api/client";
import type { KnowledgeArticle, KnowledgeCategory, KnowledgeDashboard } from "../types/knowledgeBase";

const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";

const statusBadge: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-green-50 text-green-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

export default function KnowledgeBasePage() {
  const [dashboard, setDashboard] = useState<KnowledgeDashboard | null>(null);
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [activeArticle, setActiveArticle] = useState<KnowledgeArticle | null>(null);
  const [showCreateArticle, setShowCreateArticle] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  const [articleForm, setArticleForm] = useState({ title: "", content: "", categoryId: "", tags: "", status: "DRAFT" });
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", parentId: "" });

  async function load() {
    try {
      const [dash, cats, arts] = await Promise.all([
        apiClient.get("/knowledge-base/dashboard"),
        apiClient.get("/knowledge-base/categories"),
        apiClient.get("/knowledge-base/articles"),
      ]);
      setDashboard(dash.data.data);
      setCategories(cats.data.data || []);
      setArticles(arts.data.data || []);
    } catch { setMessage("Unable to load knowledge base"); }
  }
  useEffect(() => { void load(); }, []);

  async function searchArticles() {
    try {
      const params: any = {};
      if (selectedCategory) params.categoryId = selectedCategory;
      if (search.trim()) params.search = search;
      const res = await apiClient.get("/knowledge-base/articles", { params });
      setArticles(res.data.data || []);
    } catch { setMessage("Search failed"); }
  }

  useEffect(() => { const t = setTimeout(() => void searchArticles(), 300); return () => clearTimeout(t); }, [search, selectedCategory]);

  async function createCategory() {
    try {
      if (!categoryForm.name.trim()) { setMessage("Category name is required"); return; }
      const payload: any = { name: categoryForm.name, description: categoryForm.description };
      if (categoryForm.parentId) payload.parentId = categoryForm.parentId;
      await apiClient.post("/knowledge-base/categories", payload);
      setMessage("Category created");
      setShowCreateCategory(false);
      setCategoryForm({ name: "", description: "", parentId: "" });
      void load();
    } catch { setMessage("Failed to create category"); }
  }

  async function createArticle() {
    try {
      if (!articleForm.title.trim()) { setMessage("Title is required"); return; }
      await apiClient.post("/knowledge-base/articles", articleForm);
      setMessage("Article created");
      setShowCreateArticle(false);
      setArticleForm({ title: "", content: "", categoryId: "", tags: "", status: "DRAFT" });
      void load();
    } catch { setMessage("Failed to create article"); }
  }

  async function publishArticle(id: string) {
    try { await apiClient.put(`/knowledge-base/articles/${id}/publish`); setMessage("Article published"); void load(); if (activeArticle?.id === id) setActiveArticle(null); } catch { setMessage("Failed"); }
  }

  async function archiveArticle(id: string) {
    try { await apiClient.put(`/knowledge-base/articles/${id}/archive`); setMessage("Article archived"); void load(); if (activeArticle?.id === id) setActiveArticle(null); } catch { setMessage("Failed"); }
  }

  async function deleteArticle(id: string) {
    try { await apiClient.delete(`/knowledge-base/articles/${id}`); setMessage("Article deleted"); void load(); if (activeArticle?.id === id) setActiveArticle(null); } catch { setMessage("Failed"); }
  }

  async function trackView(id: string) {
    try { await apiClient.post(`/knowledge-base/articles/${id}/view`); } catch {}
  }

  function openArticle(article: KnowledgeArticle) {
    setActiveArticle(article);
    setArticleForm({ title: article.title, content: article.content || "", categoryId: article.categoryId || "", tags: article.tags || "", status: article.status });
    if (article.status === "PUBLISHED") void trackView(article.id);
  }

  const filteredArticles = activeArticle ? articles : articles.filter((a) => a.status === "PUBLISHED" || a.status === "DRAFT");

  const cards = [
    { label: "Total Articles", value: dashboard?.totalArticles || 0, icon: FileText },
    { label: "Published", value: dashboard?.published || 0, icon: CheckCircle, color: "text-green-600" },
    { label: "Drafts", value: dashboard?.drafts || 0, icon: Edit3, color: "text-amber-600" },
    { label: "Total Views", value: dashboard?.totalViews || 0, icon: Eye },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-violet-700 via-purple-800 to-slate-950 p-6 md:p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.28em] text-violet-200">Phase 17</p>
            <h1 className="mt-3 text-2xl md:text-4xl font-black">Knowledge Base</h1>
            <p className="mt-2 text-xs md:text-sm text-violet-100">SOPs, training, HR policies, client processes — your internal learning center.</p>
          </div>
          <button onClick={load} className="rounded-xl bg-white/10 p-2.5 md:p-3"><RefreshCcw size={18} /></button>
        </div>
      </section>

      {message && (
        <div className="rounded-xl bg-blue-50 p-3 md:p-4 text-xs md:text-sm font-bold text-blue-800 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-blue-400 hover:text-blue-700"><XCircle size={16} /></button>
        </div>
      )}

      <section className="grid gap-3 md:gap-4 grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border bg-white p-3 md:p-4">
              <Icon className={card.color || "text-violet-700"} size={18} />
              <p className="mt-2 md:mt-3 text-[10px] md:text-xs font-black uppercase text-slate-400">{card.label}</p>
              <p className={`mt-0.5 md:mt-1 text-xl md:text-2xl font-black ${card.color || "text-slate-900"}`}>{card.value}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border bg-white p-4 md:p-6">
        {!activeArticle ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h2 className="text-lg md:text-xl font-black">Articles</h2>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:min-w-[200px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${field} pl-9`} placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <button onClick={() => setShowCreateArticle(!showCreateArticle)} className="flex items-center gap-1.5 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-black text-white"><Plus size={16} />New</button>
                <button onClick={() => setShowCreateCategory(!showCreateCategory)} className="rounded-xl border px-3 py-2.5 text-xs font-black text-slate-600"><Folder size={14} className="inline mr-1" />Category</button>
              </div>
            </div>

            {showCreateArticle && (
              <div className="mt-4 space-y-3 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <h3 className="font-black text-violet-800">New Article</h3>
                <div className="grid gap-3">
                  <input className={field} placeholder="Article title *" value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} />
                  <select className={field} value={articleForm.categoryId} onChange={(e) => setArticleForm({ ...articleForm, categoryId: e.target.value })}>
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input className={field} placeholder="Tags (comma separated)" value={articleForm.tags} onChange={(e) => setArticleForm({ ...articleForm, tags: e.target.value })} />
                  <select className={field} value={articleForm.status} onChange={(e) => setArticleForm({ ...articleForm, status: e.target.value })}>
                    <option value="DRAFT">Save as Draft</option>
                    <option value="PUBLISHED">Publish now</option>
                  </select>
                </div>
                <button onClick={createArticle} className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-black text-white">Create Article</button>
              </div>
            )}

            {showCreateCategory && (
              <div className="mt-4 space-y-3 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <h3 className="font-black text-violet-800">New Category</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className={field} placeholder="Category name *" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
                  <input className={field} placeholder="Description" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
                  <select className={field} value={categoryForm.parentId} onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })}>
                    <option value="">No parent (top level)</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <button onClick={createCategory} className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-black text-white">Create Category</button>
              </div>
            )}

            {/* Categories browser */}
            <div className="mt-4 mb-4 space-y-1">
              <p className="text-xs font-black uppercase text-slate-400 mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { setSelectedCategory(""); setSearch(""); }} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${!selectedCategory ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>All</button>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id === selectedCategory ? "" : cat.id)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${selectedCategory === cat.id ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name} ({cat._count?.articles || 0})
                  </button>
                ))}
                <button onClick={() => setShowCreateCategory(!showCreateCategory)} className="rounded-full px-3 py-1.5 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100"><Plus size={12} className="inline" /> New</button>
              </div>
            </div>

            {/* Article list */}
            <div className="space-y-2">
              {filteredArticles.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No articles found</p>}
              {filteredArticles.map((article) => (
                <div key={article.id} onClick={() => openArticle(article)} className="cursor-pointer rounded-2xl border bg-white p-4 transition hover:shadow-sm hover:border-violet-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${statusBadge[article.status]}`}>{article.status}</span>
                        {article.category && <span className="text-[10px] font-bold text-violet-600">{article.category.name}</span>}
                      </div>
                      <h3 className="mt-1.5 font-black text-slate-900">{article.title}</h3>
                      {article.tags && <p className="mt-1 text-xs text-slate-400">{article.tags}</p>}
                      <div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-slate-400">
                        {article.createdBy && <span>By {article.createdBy.name}</span>}
                        {article._count && <span className="flex items-center gap-1"><Eye size={12} />{article._count.views} views</span>}
                        <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteArticle(article.id); }} className="rounded-lg border p-1.5 text-red-400 hover:bg-red-50 shrink-0 ml-2"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Article detail view */
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setActiveArticle(null)} className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800"><ChevronRight size={16} className="rotate-180" /> Back</button>
              <div className="flex items-center gap-2">
                {activeArticle.status === "DRAFT" && <button onClick={() => publishArticle(activeArticle.id)} className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-black text-white"><Send size={14} />Publish</button>}
                {activeArticle.status === "PUBLISHED" && <button onClick={() => archiveArticle(activeArticle.id)} className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-black text-slate-600"><Archive size={14} />Archive</button>}
                <button onClick={() => deleteArticle(activeArticle.id)} className="rounded-xl border px-3 py-2 text-xs font-black text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${statusBadge[activeArticle.status]}`}>{activeArticle.status}</span>
              {activeArticle.category && <span className="text-xs font-bold text-violet-600">{activeArticle.category.name}</span>}
            </div>
            <h2 className="text-2xl font-black text-slate-900">{activeArticle.title}</h2>
            {activeArticle.tags && <p className="mt-1 text-xs text-slate-400">{activeArticle.tags}</p>}

            <div className="mt-6 grid gap-3">
              <textarea
                className={`${field} min-h-[200px] font-normal`}
                placeholder="Article content (markdown supported)..."
                value={articleForm.content}
                onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <select className={field} value={articleForm.categoryId} onChange={(e) => setArticleForm({ ...articleForm, categoryId: e.target.value })}>
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={async () => {
                  try { await apiClient.put(`/knowledge-base/articles/${activeArticle.id}`, articleForm); setMessage("Article updated"); void load(); } catch { setMessage("Failed to update"); }
                }} className="flex items-center gap-1.5 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-black text-white shrink-0"><Save size={16} />Save</button>
              </div>
            </div>

            {activeArticle.files.length > 0 && (
              <div className="mt-6">
                <h3 className="font-black text-slate-700 mb-3">Attachments</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {activeArticle.files.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                      <BookOpen size={16} className="text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{file.name}</p>
                        {file.fileSize && <p className="text-[10px] text-slate-400">{(file.fileSize / 1024).toFixed(1)} KB</p>}
                      </div>
                      <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-black text-white">Open</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
