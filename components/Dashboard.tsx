"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown, Clock3, Copy, Download, ExternalLink, Film, History, LoaderCircle, LockKeyhole, Play, Plus, Send, ShieldCheck, UploadCloud, Youtube } from "lucide-react";
import type { Platform, UploadRecord } from "@/lib/types";

type Group = { id: string; name: string; hashtags: string[]; isSystem: boolean };
type Draft = { enabled: boolean; privacy: string; scheduledAt: string; useThumbnail: boolean };
type Connection = {
  connected: boolean; configured: boolean; approved: boolean; accountLabel: string | null;
  creator?: { creator_nickname?: string; privacy_level_options?: string[]; max_video_post_duration_sec?: number } | null;
  error?: string;
};
type Props = { initialUploads: UploadRecord[]; initialGroups: Group[]; initialConnections: Record<Platform, Connection> };

const platformMeta: Record<Platform, { name: string; short: string; tone: string }> = {
  youtube: { name: "YouTube Shorts", short: "YT", tone: "red" },
  tiktok: { name: "TikTok", short: "TT", tone: "cyan" },
  instagram: { name: "Instagram Reels", short: "IG", tone: "violet" },
};
const checklists: Record<"tiktok" | "instagram", string[]> = {
  tiktok: ["Download the prepared TikTok MP4", "Open TikTok and upload the file", "Paste the caption and review hashtags", "Choose cover, audience, and disclosure settings", "Review and post in TikTok"],
  instagram: ["Download the prepared Reels MP4", "Open Instagram and create a Reel", "Paste the caption and review hashtags", "Choose cover, audience, and disclosure settings", "Review and share in Instagram"],
};
const initialDrafts: Record<Platform, Draft> = {
  youtube: { enabled: true, privacy: "private", scheduledAt: "", useThumbnail: true },
  tiktok: { enabled: true, privacy: "public", scheduledAt: "", useThumbnail: true },
  instagram: { enabled: true, privacy: "public", scheduledAt: "", useThumbnail: true },
};

function tags(value: string) {
  return [...new Set(value.split(/[\s,]+/).map((tag) => tag.trim().replace(/^#+/, "")).filter(Boolean).map((tag) => `#${tag.replace(/[^\p{L}\p{N}_]/gu, "")}`))].filter((tag) => tag.length > 1).slice(0, 30);
}

function prettyStatus(status: string) { return status.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }

export default function Dashboard({ initialUploads, initialGroups, initialConnections }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtagText, setHashtagText] = useState("");
  const [drafts, setDrafts] = useState(initialDrafts);
  const [uploads, setUploads] = useState(initialUploads);
  const [groups, setGroups] = useState(initialGroups);
  const [busy, setBusy] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(initialUploads[0]?.id || null);
  const [groupName, setGroupName] = useState("");
  const [connections, setConnections] = useState(initialConnections);
  const fileInput = useRef<HTMLInputElement>(null);
  const parsedTags = useMemo(() => tags(hashtagText), [hashtagText]);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(window.location.search);
    for (const platform of Object.keys(platformMeta) as Platform[]) {
      const connected = query.get(`${platform}_connected`);
      const error = query.get(`${platform}_error`);
      if (connected) setMessage({ type: "success", text: `${platformMeta[platform].name} connected as ${connected}.` });
      if (error) setMessage({ type: "error", text: `${platformMeta[platform].name}: ${error}` });
    }
    if (window.location.search) window.history.replaceState({}, "", window.location.pathname);
    Promise.all((Object.keys(platformMeta) as Platform[]).map(async (platform) => {
      const response = await fetch(`/api/${platform}/status`);
      return [platform, await response.json()] as const;
    })).then((entries) => {
      if (!active) return;
      setConnections((current) => ({ ...current, ...Object.fromEntries(entries) }));
      const tiktok = entries.find(([platform]) => platform === "tiktok")?.[1] as Connection | undefined;
      const options = tiktok?.creator?.privacy_level_options;
      if (options?.length) setDrafts((current) => ({ ...current, tiktok: { ...current.tiktok, privacy: options[0] } }));
      refreshHistory();
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  function chooseFile(next: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    setMessage(null);
  }

  function updateDraft(platform: Platform, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [platform]: { ...current[platform], ...patch } }));
  }

  async function prepare() {
    if (!file || !caption.trim()) { setMessage({ type: "error", text: "Choose a video and add a caption first." }); return; }
    setBusy(true); setMessage(null);
    const form = new FormData();
    form.set("video", file); form.set("caption", caption); form.set("hashtags", parsedTags.join(" "));
    form.set("settings", JSON.stringify(Object.fromEntries(Object.entries(drafts).map(([platform, value]) => [platform, {
      ...value, scheduledAt: value.scheduledAt ? new Date(value.scheduledAt).toISOString() : null, caption: "", hashtags: parsedTags,
    }]))));
    try {
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Preparation failed.");
      setUploads((current) => [result.upload, ...current]); setExpanded(result.upload.id);
      setMessage({ type: "success", text: "Platform-ready files are prepared." });
      setFile(null); setPreview(null); setCaption(""); setHashtagText("");
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Preparation failed." }); }
    finally { setBusy(false); }
  }

  async function refreshHistory() {
    const response = await fetch("/api/uploads");
    if (response.ok) setUploads((await response.json()).uploads);
  }

  async function postPlatform(id: string, platform: Platform) {
    const postingKey = `${id}:${platform}`;
    setPosting(postingKey); setMessage(null);
    try {
      const response = await fetch(`/api/uploads/${id}/${platform}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `${platformMeta[platform].name} upload failed.`);
      await refreshHistory(); setMessage({ type: "success", text: result.status === "PROCESSING" ? `${platformMeta[platform].name} accepted the upload and is processing it.` : `Posted to ${platformMeta[platform].name} successfully.` });
    } catch (error) { await refreshHistory(); setMessage({ type: "error", text: error instanceof Error ? error.message : `${platformMeta[platform].name} upload failed.` }); }
    finally { setPosting(null); }
  }

  async function saveGroup() {
    if (!groupName.trim() || !parsedTags.length) return;
    const response = await fetch("/api/hashtags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: groupName, hashtags: parsedTags }) });
    const result = await response.json();
    if (response.ok) { setGroups(result.groups); setGroupName(""); setMessage({ type: "success", text: "Hashtag group saved." }); }
    else setMessage({ type: "error", text: result.error });
  }

  return <main>
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><Play size={16} fill="currentColor" /></span><span>Clip Pilot</span></a>
      <div className="top-actions">
        <span className="secure-pill"><ShieldCheck size={15} /> Local & secure</span>
        <button className="ghost-button" onClick={() => setShowHistory(!showHistory)}><History size={17} /> History <span className="count">{uploads.length}</span></button>
      </div>
    </header>

    <section className="hero">
      <div><p className="eyebrow">Publishing workspace</p><h1>One clip. Three platforms.<br /><span>Zero risky shortcuts.</span></h1>
      <p className="subhead">Prepare polished, platform-ready video and publish through official, account-safe workflows.</p></div>
      <div className="trust-card"><LockKeyhole size={20} /><div><strong>Your credentials stay yours</strong><p>OAuth only. Tokens are encrypted locally. No passwords, scraping, or browser bots.</p></div></div>
    </section>

    {message && <div className={`notice ${message.type}`} role="alert">{message.type === "error" ? <AlertCircle size={18} /> : <Check size={18} />}<span>{message.text}</span><button onClick={() => setMessage(null)}>×</button></div>}

    <div className="workspace-grid">
      <section className="panel upload-panel">
        <div className="section-heading"><span className="step">1</span><div><h2>Add your clip</h2><p>MP4 or MOV · up to 500 MB · max 3 minutes</p></div></div>
        <input ref={fileInput} type="file" accept="video/mp4,video/quicktime,.mp4,.mov" hidden onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
        {preview ? <div className="video-preview"><video src={preview} controls /><div className="file-strip"><Film size={17} /><span>{file?.name}</span><button onClick={() => chooseFile(null)}>Remove</button></div></div>
          : <button className="dropzone" onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0] || null); }}>
            <span className="upload-icon"><UploadCloud size={25} /></span><strong>Drop your finished clip here</strong><span>or click to browse</span><small>We’ll fit it to 1080 × 1920 without cropping your content.</small></button>}
      </section>

      <section className="panel copy-panel">
        <div className="section-heading"><span className="step">2</span><div><h2>Write once</h2><p>We’ll adapt it for each platform</p></div></div>
        <label>Main caption <span>{caption.length} characters</span></label>
        <textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="What makes this clip worth watching?" maxLength={5000} />
        <label>Hashtags <span>{parsedTags.length}/30</span></label>
        <div className="tag-input"><input value={hashtagText} onChange={(event) => setHashtagText(event.target.value)} placeholder="#gaming #funnyclips #shorts" /></div>
        <div className="group-row">
          {groups.slice(0, 5).map((group) => <button key={group.id} className="tag-chip" onClick={() => setHashtagText((value) => `${value} ${group.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}`.trim())}>+ {group.name}</button>)}
        </div>
        <details className="save-group"><summary>Save current tags as a custom group</summary><div><input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" /><button onClick={saveGroup}>Save</button></div></details>
      </section>
    </div>

    <section className="platform-section">
      <div className="section-heading"><span className="step">3</span><div><h2>Choose destinations</h2><p>Each platform keeps its own privacy and timing</p></div></div>
      <div className="platform-grid">
        {(Object.keys(platformMeta) as Platform[]).map((platform) => {
          const meta = platformMeta[platform]; const draft = drafts[platform]; const connection = connections[platform]; const autoEnabled = connection.connected && connection.approved;
          const tiktokPrivacy = platform === "tiktok" ? connection.creator?.privacy_level_options : null;
          return <article className={`platform-card ${draft.enabled ? "active" : ""}`} key={platform}>
            <div className="platform-head"><span className={`platform-logo ${meta.tone}`}>{meta.short}</span><div><h3>{meta.name}</h3><p>{connection.connected ? `Connected · ${connection.accountLabel || "account"}` : "Official API connection"}</p></div>
              <button aria-label={`Toggle ${meta.name}`} className={`switch ${draft.enabled ? "on" : ""}`} onClick={() => updateDraft(platform, { enabled: !draft.enabled })}><span /></button></div>
            <div className={`connection-row ${connection.connected ? "connected" : ""}`}>
              {connection.connected ? <><Check size={14} /><span>{autoEnabled ? "Account connected · automatic posting ready" : "Account connected · posting approval required"}</span></> : connection.configured ? <a href={`/api/${platform}/connect`}><Plus size={14} /> Connect {meta.name}</a> : <a href="#connection-setup"><AlertCircle size={14} /> Set up official connector</a>}
            </div>
            <div className="card-fields">
              <label>Visibility<select value={draft.privacy} onChange={(event) => updateDraft(platform, { privacy: event.target.value })} disabled={!draft.enabled}>
                {tiktokPrivacy?.length ? tiktokPrivacy.map((option) => <option key={option} value={option}>{option.toLowerCase().replaceAll("_", " ")}</option>) : <>{platform === "youtube" && <><option value="private">Private</option><option value="unlisted">Unlisted</option></>}<option value="public">Public</option>{platform !== "youtube" && <><option value="friends">Friends</option><option value="private">Private</option></>}</>}
              </select></label>
              <label>Schedule <input type="datetime-local" value={draft.scheduledAt} min={new Date().toISOString().slice(0, 16)} onChange={(event) => updateDraft(platform, { scheduledAt: event.target.value })} disabled={!draft.enabled} /></label>
              <label className="check-row"><input type="checkbox" checked={draft.useThumbnail} onChange={(event) => updateDraft(platform, { useThumbnail: event.target.checked })} disabled={!draft.enabled} /><span>Use generated thumbnail</span></label>
            </div>
            <div className={`support-note ${autoEnabled ? "api" : "manual"}`}>{autoEnabled ? <><ShieldCheck size={15} /> Automatic posting enabled via official API</> : <><Clock3 size={15} /> Manual fallback stays available</>}</div>
          </article>;
        })}
      </div>
      <details className="connector-setup" id="connection-setup">
        <summary><LockKeyhole size={15} /> One-time connector setup</summary>
        <div className="connector-setup-grid">
          <p><strong>YouTube</strong><span>Google Cloud OAuth app</span><code>GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET</code><small>Callback: /api/youtube/callback</small></p>
          <p><strong>TikTok</strong><span>Login Kit + approved Content Posting API</span><code>TIKTOK_CLIENT_KEY · TIKTOK_CLIENT_SECRET</code><small>Callback: /api/tiktok/callback</small></p>
          <p><strong>Instagram</strong><span>Meta app + approved Instagram publishing permissions</span><code>INSTAGRAM_CLIENT_ID · INSTAGRAM_CLIENT_SECRET</code><small>Callback: /api/instagram/callback</small></p>
        </div>
        <p className="setup-footnote">Add credentials to <code>.env.local</code> and set <code>APP_ENCRYPTION_KEY</code>. Restart the app, then the Connect buttons will activate. Tokens are encrypted locally.</p>
      </details>
      <button className="prepare-button" onClick={prepare} disabled={busy || !file || !caption.trim()}>{busy ? <><LoaderCircle className="spin" size={20} /> Preparing video…</> : <><Send size={19} /> Prepare posts</>}<span>Creates 3 platform-ready exports</span></button>
    </section>

    {(showHistory || uploads.length > 0) && <section className="history-section">
      <div className="history-title"><div><p className="eyebrow">Prepared library</p><h2>Posting history</h2></div><span>{uploads.length} {uploads.length === 1 ? "clip" : "clips"}</span></div>
      {uploads.length === 0 ? <div className="empty-state"><Film size={25} /><p>Your prepared clips will appear here.</p></div> : <div className="history-list">
        {uploads.map((upload) => <article className="history-item" key={upload.id}>
          <button className="history-summary" onClick={() => setExpanded(expanded === upload.id ? null : upload.id)}>
            <img src={upload.thumbnailUrl || ""} alt="Video thumbnail" /><div className="history-copy"><strong>{upload.originalFilename}</strong><p>{upload.caption}</p><small>{new Date(upload.createdAt).toLocaleString()} · {Math.round(upload.durationSeconds)}s · {upload.isVertical ? "Native 9:16" : "Fitted to 9:16"}</small></div>
            <div className="status-dots">{upload.platforms.filter((post) => post.enabled).map((post) => <span key={post.platform} className={`mini-logo ${platformMeta[post.platform].tone}`}>{platformMeta[post.platform].short}</span>)}</div><ChevronDown className={expanded === upload.id ? "rotated" : ""} size={19} />
          </button>
          {expanded === upload.id && <div className="history-detail">
            <div className="detail-preview"><video src={upload.previewUrl} controls poster={upload.thumbnailUrl || undefined} /></div>
            <div className="post-list">{upload.platforms.filter((post) => post.enabled).map((post) => <div className="post-row" key={post.platform}>
              <div className="post-row-head"><span className={`platform-logo small ${platformMeta[post.platform].tone}`}>{platformMeta[post.platform].short}</span><div><strong>{platformMeta[post.platform].name}</strong><span className={`status status-${post.status.toLowerCase()}`}>{prettyStatus(post.status)}</span></div></div>
              <div className="caption-copy"><p>{post.caption}</p><button title="Copy caption" onClick={() => navigator.clipboard.writeText(post.caption)}><Copy size={15} /></button></div>
              {post.error && <p className="row-error">{post.error}</p>}
              <div className="row-actions">
                {!connections[post.platform].connected && connections[post.platform].configured && <a className="secondary-action" href={`/api/${post.platform}/connect`}>{post.platform === "youtube" && <Youtube size={16} />} Connect {platformMeta[post.platform].name}</a>}
                {!connections[post.platform].connected && !connections[post.platform].configured && <span className="setup-required">Developer app setup required for automatic posting</span>}
                {connections[post.platform].connected && connections[post.platform].approved && post.status !== "POSTED" && <button className="primary-action" onClick={() => postPlatform(upload.id, post.platform)} disabled={posting === `${upload.id}:${post.platform}` || Boolean(post.scheduledAt && post.platform !== "youtube")}>{posting === `${upload.id}:${post.platform}` ? <LoaderCircle className="spin" size={16} /> : <UploadCloud size={16} />} {post.scheduledAt && post.platform === "youtube" ? "Upload & schedule" : "Post now"}</button>}
                {connections[post.platform].connected && !connections[post.platform].approved && <span className="setup-required">Connected, but the posting scope is not approved</span>}
                {post.postedUrl && <a className="secondary-action" href={post.postedUrl} target="_blank" rel="noreferrer">View post <ExternalLink size={14} /></a>}
              </div>
              {post.platform !== "youtube" && <details className="checklist"><summary>Manual posting fallback <ChevronDown size={15} /></summary><ol>{checklists[post.platform].map((item) => <li key={item}><span><Check size={12} /></span>{item}</li>)}</ol></details>}
              <a className="download-action" href={post.downloadUrl || "#"}><Download size={15} /> Download prepared MP4</a>
            </div>)}</div>
          </div>}
        </article>)}
      </div>}
    </section>}
    <footer><span><ShieldCheck size={15} /> Official APIs. Manual fallbacks. No credential scraping.</span><span>Files and history stay on this machine.</span></footer>
  </main>;
}
