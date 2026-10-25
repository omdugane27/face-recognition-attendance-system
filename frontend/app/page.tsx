'use client';

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, ChevronDown,
  CircleHelp, Clock3, GraduationCap, LayoutDashboard, Search, Settings,
  ShieldCheck, Users, Bell, Fingerprint, Menu, X, RefreshCw, LogIn
} from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://face-recognition-attendance-system-3-7fc5.onrender.com/api/v1").replace(/\/$/, "");
const HEALTH_URL = API ? API.replace(/\/api\/v1$/, "") + "/health" : "";

type View = "Overview" | "Attendance" | "Students" | "Classes & subjects" | "Reports" | "Roles & permissions" | "Settings";
type Notice = { kind: "success" | "error" | "info"; text: string };

export default function Home() {
  const [apiState, setApiState] = useState("Checking API");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState<View>("Overview");
  const [modal, setModal] = useState<"session" | "login" | "guide" | "notifications" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [searchText, setSearchText] = useState("");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  async function checkHealth() {
    if (!HEALTH_URL) {
      setApiState("API URL not configured");
      return;
    }
    setApiState("Checking API");
    try {
      const response = await fetch(HEALTH_URL, { cache: "no-store" });
      setApiState(response.ok ? "API connected" : "API unavailable");
    } catch {
      setApiState("API unavailable");
    }
  }

  useEffect(() => { void checkHealth(); }, []);

  const nav: { label: View; icon: typeof LayoutDashboard }[] = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Attendance", icon: CheckCircle2 },
    { label: "Students", icon: GraduationCap },
    { label: "Classes & subjects", icon: BookOpen },
    { label: "Reports", icon: Activity },
  ];

  function goTo(view: View) {
    setActiveView(view);
    setMobileOpen(false);
    setNotice(null);
  }

  function openSession() {
    if (!token) {
      setNotice({ kind: "info", text: "Sign in first. Session creation requires an authenticated admin or teacher account." });
      setModal("login");
      return;
    }
    setModal("session");
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!API) {
      setNotice({ kind: "error", text: "API URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in the frontend Render environment." });
      return;
    }
    setBusy(true);
    try {
      const body = new URLSearchParams({ username: email, password });
      const response = await fetch(API + "/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.access_token) {
        setNotice({ kind: "error", text: data.detail || "Sign-in failed. Check your credentials and backend setup." });
        return;
      }
      setToken(data.access_token);
      setModal(null);
      setNotice({ kind: "success", text: "Signed in successfully." });
      setPassword("");
    } catch {
      setNotice({ kind: "error", text: "Could not reach the backend. Check the API URL and CORS settings." });
    } finally {
      setBusy(false);
    }
  }

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!API || !token) {
      setNotice({ kind: "error", text: "Sign in with an admin or teacher account before creating a session." });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(API + "/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ class_name: className, subject }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice({ kind: "error", text: data.detail || "Could not create session." });
        if (response.status === 401) setToken("");
        return;
      }
      setNotice({ kind: "success", text: "Attendance session created (ID " + data.id + ")." });
      setClassName("");
      setSubject("");
      setModal(null);
      setActiveView("Attendance");
    } catch {
      setNotice({ kind: "error", text: "Could not reach the backend. Check your API URL and CORS settings." });
    } finally {
      setBusy(false);
    }
  }

  async function loadStudents() {
    if (!API || !token) { setNotice({ kind: "info", text: "Sign in with an admin or teacher account to view student records." }); return; }
    setBusy(true);
    try {
      const response = await fetch(API + "/students", { headers: { Authorization: "Bearer " + token } });
      const data = await response.json().catch(() => []);
      if (!response.ok) { setNotice({ kind: "error", text: data.detail || "Could not load students." }); return; }
      setStudents(Array.isArray(data) ? data : []);
      setNotice({ kind: "success", text: "Student list loaded." });
    } catch { setNotice({ kind: "error", text: "Could not reach the backend while loading students." }); }
    finally { setBusy(false); }
  }

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) { setModal("login"); setNotice({kind:"info",text:"Sign in first to add a student."}); return; }
    setBusy(true);
    try {
      const response = await fetch(API + "/students", { method:"POST", headers:{"Content-Type":"application/json", Authorization:"Bearer "+token}, body:JSON.stringify({student_identifier:studentId, full_name:studentName, class_name:studentClass, email:studentEmail || null}) });
      const data = await response.json().catch(()=>({}));
      if (!response.ok) { setNotice({kind:"error",text:data.detail || "Could not add student."}); return; }
      setStudents(old => [...old, data].sort((a,b)=>a.full_name.localeCompare(b.full_name)));
      setStudentId(""); setStudentName(""); setStudentClass(""); setStudentEmail("");
      setNotice({kind:"success",text:"Student added successfully."});
    } catch { setNotice({kind:"error",text:"Could not reach the backend while adding student."}); }
    finally { setBusy(false); }
  }

  const filteredNav = useMemo(() => nav.filter(n => n.label.toLowerCase().includes(searchText.toLowerCase())), [searchText]);

  function unsupported(feature: string) {
    setNotice({ kind: "info", text: feature + " is not implemented in the current backend yet. This screen won't pretend that the feature is working." });
  }

  const navButton = (item: { label: View; icon: typeof LayoutDashboard }) => {
    const Icon = item.icon;
    return <button key={item.label} onClick={() => {
      goTo(item.label);
      if (item.label === "Students") void loadStudents();
      if (item.label === "Classes & subjects" || item.label === "Reports") unsupported(item.label);
    }} className={"navitem w-full text-left " + (activeView === item.label ? "active" : "")}>
      <Icon size={18} />{item.label}
    </button>;
  };

  return <main className="min-h-screen lg:flex">
    {mobileOpen && <button aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-10 bg-slate-900/30 lg:hidden" />}
    <aside className={(mobileOpen ? "flex" : "hidden") + " lg:flex fixed lg:static z-20 h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-5"}>
      <div className="mb-10 flex items-center gap-3 px-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white"><Fingerprint size={23}/></div><div><div className="text-lg font-extrabold tracking-tight">attendly<span className="text-teal-600">.</span></div><div className="text-xs text-slate-500">CAMPUS WORKSPACE</div></div></div>
      <div className="mb-3 px-3 text-[10px] font-bold tracking-[.18em] text-slate-400">WORKSPACE</div>
      <nav className="space-y-1">{nav.map(navButton)}</nav>
      <div className="mb-3 mt-9 px-3 text-[10px] font-bold tracking-[.18em] text-slate-400">ADMINISTRATION</div>
      <button onClick={() => { goTo("Roles & permissions"); unsupported("Roles & permissions"); }} className={"navitem w-full text-left " + (activeView === "Roles & permissions" ? "active" : "")}><ShieldCheck size={18}/>Roles & permissions</button>
      <button onClick={() => goTo("Settings")} className={"navitem w-full text-left " + (activeView === "Settings" ? "active" : "")}><Settings size={18}/>Settings</button>
      <div className="mt-auto rounded-2xl bg-slate-900 p-4 text-white"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><CircleHelp size={17}/>Need a hand?</div><p className="mb-3 text-xs leading-5 text-slate-300">Open the quick setup guide.</p><button onClick={() => setModal("guide")} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold">View guide ↗</button></div>
    </aside>

    <section className="min-w-0 flex-1">
      <header className="flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-9">
        <div className="flex items-center gap-3"><button aria-label="Open menu" className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}><Menu/></button><div><div className="text-sm font-bold">{activeView === "Overview" ? "Campus overview" : activeView}</div><div className="text-xs text-slate-500">Your daily snapshot</div></div></div>
        <div className="flex items-center gap-2">
          <form onSubmit={e => { e.preventDefault(); const match = nav.find(n => n.label.toLowerCase().includes(searchText.toLowerCase())); if (match) goTo(match.label); else setNotice({kind:"info",text:"No matching section. Try Overview, Attendance, Students, Classes or Reports."}); }} className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm md:flex"><Search size={15}/><input aria-label="Search sections" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search sections..." className="w-32 outline-none"/></form>
          <button aria-label="Check API status" title="Check API status" onClick={() => void checkHealth()} className="rounded-xl border border-slate-200 p-2.5"><RefreshCw size={18}/></button>
          <button aria-label="Notifications" onClick={() => setModal("notifications")} className="relative rounded-xl border border-slate-200 p-2.5"><Bell size={18}/></button>
          <button onClick={() => setModal("login")} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><LogIn size={17}/><span className="hidden text-sm sm:inline">{token ? "Signed in" : "Sign in"}</span><ChevronDown size={15}/></button>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] p-5 md:p-9">
        {notice && <div role="status" className={"mb-5 flex items-start justify-between gap-3 rounded-xl border p-4 text-sm " + (notice.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : notice.kind === "success" ? "border-teal-200 bg-teal-50 text-teal-800" : "border-blue-200 bg-blue-50 text-blue-900")}><span>{notice.text}</span><button aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={17}/></button></div>}

        {activeView === "Overview" && <>
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-teal-700"><span className="h-2 w-2 rounded-full bg-teal-500"/> YOUR SCHOOL AT A GLANCE</div><h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Good morning, Admin 👋</h1><p className="mt-2 text-sm text-slate-500">Here&apos;s what&apos;s happening across your campus today.</p></div><button onClick={openSession} className="flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-teal-800"><CalendarDays size={17}/> Start attendance session</button></div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{label:"Total students",note:"Student records API not available",icon:Users,color:"bg-blue-50 text-blue-700"},{label:"Present today",note:"Attendance summary API not available",icon:CheckCircle2,color:"bg-teal-50 text-teal-700"},{label:"Attendance rate",note:"Calculated when reports are implemented",icon:Activity,color:"bg-violet-50 text-violet-700"},{label:"Active classes",note:"Class management API not available",icon:BookOpen,color:"bg-amber-50 text-amber-700"}].map(c=><button key={c.label} onClick={() => { goTo(c.label === "Total students" ? "Students" : c.label === "Active classes" ? "Classes & subjects" : "Attendance"); unsupported(c.label); }} className="surface p-5 text-left hover:border-teal-200"><div className="mb-5 flex items-center justify-between"><span className="text-sm text-slate-500">{c.label}</span><span className={"rounded-xl p-2.5 " + c.color}><c.icon size={19}/></span></div><div className="text-3xl font-extrabold">—</div><div className="mt-2 text-xs text-slate-400">{c.note}</div></button>)}</div>
          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]"><div className="surface p-5 md:p-6"><div className="mb-6"><h2 className="font-bold">Attendance activity</h2><p className="mt-1 text-xs text-slate-500">Daily attendance will appear when connected to records</p></div><div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70"><div className="mb-3 rounded-full bg-white p-3 text-slate-400 shadow-sm"><Activity size={23}/></div><div className="text-sm font-semibold text-slate-700">Activity chart not yet connected</div><p className="mt-1 text-center text-xs text-slate-400">The backend currently has no dashboard summary endpoint.</p></div><div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-500"><span className="flex items-center gap-2"><span className={"h-2 w-2 rounded-full " + (apiState === "API connected" ? "bg-teal-500" : "bg-amber-500")}/>{apiState}</span><button onClick={() => void checkHealth()} className="underline">Refresh</button></div></div>
          <div className="surface p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="font-bold">Quick actions</h2><ArrowUpRight size={17} className="text-slate-400"/></div><div className="space-y-3"><button onClick={openSession} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-teal-200"><span className="rounded-xl bg-teal-50 p-3 text-teal-700"><CalendarDays size={18}/></span><span className="flex-1"><span className="block text-sm font-semibold">Take attendance</span><span className="mt-1 block text-xs text-slate-500">Open a class session</span></span><ArrowUpRight size={15}/></button><button onClick={() => { goTo("Students"); void loadStudents(); }} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-blue-200"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Users size={18}/></span><span className="flex-1"><span className="block text-sm font-semibold">Manage students</span><span className="mt-1 block text-xs text-slate-500">Student API still needs implementation</span></span><ArrowUpRight size={15}/></button><button onClick={() => { goTo("Attendance"); unsupported("Attendance review"); }} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-violet-200"><span className="rounded-xl bg-violet-50 p-3 text-violet-700"><Clock3 size={18}/></span><span className="flex-1"><span className="block text-sm font-semibold">Review attendance</span><span className="mt-1 block text-xs text-slate-500">Attendance record listing needs implementation</span></span><ArrowUpRight size={15}/></button></div><div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Important:</strong> Face recognition and liveness detection are not implemented in this starter project.</div></div></div>
        </>}

        {activeView !== "Overview" && <div className="surface p-6 md:p-8"><h1 className="text-2xl font-extrabold">{activeView}</h1>
          {activeView === "Attendance" ? <><p className="mt-2 text-sm text-slate-500">Create an attendance session using the backend API. You must sign in first.</p><button onClick={openSession} className="mt-5 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white">Start attendance session</button></> :
          activeView === "Settings" ? <><p className="mt-2 text-sm text-slate-500">Frontend connection status and sign-in settings.</p><p className="mt-4 text-sm">API status: <strong>{apiState}</strong></p><p className="mt-2 break-all text-xs text-slate-500">Configured API: {API || "Not configured — set NEXT_PUBLIC_API_BASE_URL in Render"}</p><button onClick={() => void checkHealth()} className="mt-4 rounded-xl border px-4 py-2 text-sm"><RefreshCw size={15} className="mr-2 inline"/>Test API</button><button onClick={() => setModal("login")} className="ml-2 mt-4 rounded-xl border px-4 py-2 text-sm">Sign in</button></> :
          activeView === "Students" ? <div className="mt-4 space-y-5">
            <p className="text-sm text-slate-500">Manage student records. Sign in with an admin or teacher account first.</p>
            <form onSubmit={addStudent} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Student ID *<input required value={studentId} onChange={e=>setStudentId(e.target.value)} className="mt-1 w-full rounded-lg border p-3" placeholder="e.g. BCA001"/></label>
              <label className="text-sm font-medium">Full name *<input required value={studentName} onChange={e=>setStudentName(e.target.value)} className="mt-1 w-full rounded-lg border p-3" placeholder="Student full name"/></label>
              <label className="text-sm font-medium">Class *<input required value={studentClass} onChange={e=>setStudentClass(e.target.value)} className="mt-1 w-full rounded-lg border p-3" placeholder="e.g. BCA Year 1"/></label>
              <label className="text-sm font-medium">Email (optional)<input type="email" value={studentEmail} onChange={e=>setStudentEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-3" placeholder="student@example.com"/></label>
              <button disabled={busy} className="rounded-xl bg-teal-700 p-3 font-bold text-white disabled:opacity-50 sm:col-span-2">{busy ? "Saving…" : "Add student"}</button>
            </form>
            <div className="flex items-center justify-between"><h2 className="font-bold">Student records ({students.length})</h2><button onClick={() => void loadStudents()} disabled={busy} className="rounded-lg border px-3 py-2 text-sm"><RefreshCw size={14} className="mr-1 inline"/> Refresh list</button></div>
            {students.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">No students loaded yet. Sign in and tap Refresh list.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Student ID</th><th className="p-3">Name</th><th className="p-3">Class</th><th className="p-3">Email</th></tr></thead><tbody>{students.map(s=><tr key={s.id} className="border-b border-slate-100"><td className="p-3">{s.student_identifier}</td><td className="p-3">{s.full_name}</td><td className="p-3">{s.class_name}</td><td className="p-3">{s.email || "—"}</td></tr>)}</tbody></table></div>}
          </div> : <><p className="mt-2 text-sm text-slate-500">This feature is not yet implemented in the backend. Class management and reports still require implementation.</p><button onClick={() => setNotice({kind:"info",text:"Class management and reporting require additional database models and API routes."})} className="mt-5 rounded-xl border px-4 py-2 text-sm">View implementation status</button></>}
        </div>}
        <footer className="mt-7 flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row"><span>© 2026 Attendly Campus Workspace</span><span>Student records, reporting and face recognition require further implementation.</span></footer>
      </div>
    </section>

    {modal && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setModal(null)}><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{modal === "login" ? "Sign in" : modal === "session" ? "New attendance session" : modal === "guide" ? "Quick setup guide" : "Notifications"}</h2><button aria-label="Close dialog" onClick={() => setModal(null)} className="rounded-lg p-1 hover:bg-slate-100"><X/></button></div>
      {modal === "login" && <form onSubmit={signIn} className="space-y-4"><p className="text-sm text-slate-500">Sign in with an existing backend admin or teacher account. This form does not create accounts.</p><label className="block text-sm font-medium">Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-xl border p-3" autoComplete="username"/></label><label className="block text-sm font-medium">Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-xl border p-3" autoComplete="current-password"/></label><button disabled={busy} className="w-full rounded-xl bg-teal-700 p-3 font-bold text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button></form>}
      {modal === "session" && <form onSubmit={createSession} className="space-y-4"><p className="text-sm text-slate-500">This will save a session to the backend database.</p><label className="block text-sm font-medium">Class name<input required value={className} onChange={e=>setClassName(e.target.value)} className="mt-1 w-full rounded-xl border p-3" placeholder="e.g. BCA Year 1"/></label><label className="block text-sm font-medium">Subject<input required value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 w-full rounded-xl border p-3" placeholder="e.g. Statistics"/></label><button disabled={busy} className="w-full rounded-xl bg-teal-700 p-3 font-bold text-white disabled:opacity-50">{busy ? "Creating…" : "Create session"}</button></form>}
      {modal === "guide" && <div className="space-y-3 text-sm text-slate-600"><p>1. Confirm the backend <code>/health</code> returns status ok.</p><p>2. Set <code>NEXT_PUBLIC_API_BASE_URL</code> in frontend Render to your backend URL ending in <code>/api/v1</code>.</p><p>3. Sign in with an existing backend user.</p><p>4. Create a session. Student management, reports and face recognition still require implementation.</p><button onClick={() => { setModal(null); goTo("Settings"); }} className="w-full rounded-xl border p-3 font-semibold">Open Settings</button></div>}
      {modal === "notifications" && <div className="space-y-3 text-sm text-slate-600"><p>No notification API is implemented yet.</p><p>Current backend status: <strong>{apiState}</strong></p><button onClick={() => { setModal(null); void checkHealth(); }} className="rounded-xl border px-4 py-2">Refresh API status</button></div>}
    </div></div>}
  </main>;
}
