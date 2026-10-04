import { Fragment, useRef, useState } from "react";
import {
  ASSIGNMENTS,
  COMPONENTS,
  DEFAULT_CFG,
  ROLES,
  SEED,
  STUDENTS,
  TEACHERS,
  compute,
  descriptor,
  maxes,
  padRow,
  total,
  type CKey,
  type Cfg,
  type Role,
  type Student,
} from "./data";

type Status = "synced" | "pending" | "failed";
type Audit = { who: string; when: string; action: string; detail: string };
type Msg = {
  id: number;
  from: string;
  fromRole: Role;
  to: string;
  subject: string;
  learner: string;
  kind: "Concern" | "Missing grades" | "Info";
  text: string;
  when: string;
  resolved: boolean;
  replies: { who: string; text: string; when: string }[];
};
type Toast = { id: number; kind: "ok" | "warn" | "bad"; text: string };

const NAV: Record<Role, [string, string][]> = {
  teacher: [
    ["dash", "Dashboard"],
    ["encode", "Encode grades"],
    ["collab", "Collaboration"],
    ["reports", "Reports"],
    ["sync", "Sync & audit"],
    ["privacy", "Settings & Privacy"],
  ],
  adviser: [
    ["dash", "Dashboard"],
    ["advisory", "Advisory & Students"],
    ["collab", "Collaboration"],
    ["encode", "Encode grades"],
    ["reports", "Reports"],
    ["sync", "Sync & audit"],
    ["privacy", "Settings & Privacy"],
  ],
  admin: [
    ["admin", "Accounts"],
    ["assign", "Assignments"],
    ["periods", "Periods"],
    ["audit", "Audit log"],
    ["privacy", "Settings & Privacy"],
  ],
};

const stamp = () =>
  new Date().toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function Chip({
  kind,
  children,
}: {
  kind: "ok" | "warn" | "bad" | "mute";
  children: React.ReactNode;
}) {
  const c = {
    ok: "bg-tint text-ok",
    warn: "bg-signal-bg text-signal",
    bad: "bg-red-100 text-bad",
    mute: "bg-rule/60 text-mute",
  }[kind];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c}`}
    >
      {children}
    </span>
  );
}

function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-rule bg-panel ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b border-rule px-4 py-2.5">
          <h3 className="lbl">{title}</h3>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

function Btn({
  children,
  onClick,
  kind = "solid",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "solid" | "line" | "signal";
  disabled?: boolean;
}) {
  const k = {
    solid: "bg-chalk text-white hover:bg-chalk-2",
    line: "border border-ink/30 hover:bg-tint",
    signal: "bg-signal text-white hover:brightness-110",
  }[kind];
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-40 ${k}`}
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="lbl">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full border border-rule bg-white px-2 py-1.5 text-[12px]"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [view, setView] = useState("dash");
  const [menu, setMenu] = useState(false);
  const [online, setOnline] = useState(true);
  const [aid, setAid] = useState("a1");
  const [q, setQ] = useState("2");
  const [sy, setSy] = useState("2026–2027");
  const [recs, setRecs] = useState<Record<string, Record<string, string[]>>>({
    "a1|2": structuredClone(SEED),
  });
  const [saved, setSaved] = useState<Record<string, Record<string, string[]>>>({
    "a1|2": structuredClone(SEED),
  });
  const [students, setStudents] = useState<Student[]>(STUDENTS);
  const [cfgs, setCfgs] = useState<Record<string, Cfg>>({});
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 1,
      from: "Ramon D. Bautista",
      fromRole: "adviser",
      to: "Ma. Corazon Villanueva",
      subject: "Mathematics 6",
      learner: "Dela Cruz, John Paolo",
      kind: "Concern",
      text: "John Paolo has been absent for most of Q2 and his Math scores are dropping. Could you share how he is doing on performance tasks so I can talk to his parents?",
      when: "Sep 26, 10:05",
      resolved: false,
      replies: [],
    },
    {
      id: 2,
      from: "Ramon D. Bautista",
      fromRole: "adviser",
      to: "Ma. Corazon Villanueva",
      subject: "Mathematics 6",
      learner: "Hernandez, Lance Gabriel",
      kind: "Missing grades",
      text: "No Q2 Math scores yet for Lance. Report cards are due Dec 19.",
      when: "Sep 27, 08:30",
      resolved: false,
      replies: [],
    },
  ]);
  const [status, setStatus] = useState<Record<string, Status>>(() =>
    Object.fromEntries(
      STUDENTS.filter(
        (s) => s.id !== "2026-10-0219" && s.id !== "2026-10-0188",
      ).map((s) => [`a1|2|${s.id}`, "synced" as Status]),
    ),
  );
  const [audit, setAudit] = useState<Audit[]>([
    {
      who: "M. Villanueva",
      when: "Sep 24, 09:12",
      action: "Updated",
      detail: "Bernardo, M. · WW-2 12 → 11 · Math 6-Rizal Q2",
    },
    {
      who: "M. Villanueva",
      when: "Sep 22, 14:40",
      action: "Encoded",
      detail: "Class batch · Math 6-Rizal Q2 (6 learners)",
    },
  ]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const failedOnce = useRef(false);

  const mine = ASSIGNMENTS.filter((a) => a.owner === role);
  const key = `${aid}|${q}`;
  const asg = ASSIGNMENTS.find((a) => a.id === aid)!;
  const canEditGrades = asg.owner === role;
  const canManageRoster = role === "adviser";
  const deny = (what: string) => (
    toast("bad", `Access denied: ${what}`),
    false
  );
  const cfg = cfgs[key] ?? DEFAULT_CFG;
  const mx = maxes(cfg);
  const rec = Object.fromEntries(
    students.map((s) => [s.id, padRow(recs[key]?.[s.id], cfg)]),
  ) as Record<string, string[]>;
  const base = Object.fromEntries(
    students.map((s) => [s.id, padRow(saved[key]?.[s.id], cfg)]),
  ) as Record<string, string[]>;

  const toast = (kind: Toast["kind"], text: string) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };

  const myStatus = Object.fromEntries(
    Object.entries(status).filter(([k]) =>
      mine.some((a) => a.id === k.split("|")[0]),
    ),
  );
  const pending = Object.entries(myStatus).filter(([, s]) => s !== "synced");
  const errors = (sid: string) =>
    rec[sid].map(
      (v, i) =>
        v !== "" && (isNaN(Number(v)) || Number(v) < 0 || Number(v) > mx[i]),
    );
  const dirty = (sid: string) => rec[sid].some((v, i) => v !== base[sid][i]);

  const setCell = (sid: string, i: number, v: string) => {
    if (!canEditGrades) return;
    if (!/^\d{0,3}(\.\d?)?$/.test(v)) return;
    setRecs((r) => ({
      ...r,
      [key]: { ...rec, [sid]: rec[sid].map((x, j) => (j === i ? v : x)) },
    }));
  };

  const logAudit = (action: string, detail: string) =>
    setAudit((a) => [
      {
        who:
          ROLES[role!].name.split(" ")[0][0] +
          ". " +
          ROLES[role!].name.split(" ").slice(-1)[0],
        when: stamp(),
        action,
        detail,
      },
      ...a,
    ]);

  const offsetOf = (c: CKey, cf: Cfg) =>
    c === "WW" ? 0 : c === "PT" ? cf.WW.length : cf.WW.length + cf.PT.length;
  const editCols = (
    fn: (row: string[], off: number, cf: Cfg) => string[],
    nextCfg: Cfg,
    c: CKey,
  ) => {
    const off = offsetOf(c, cfg);
    const apply = (m: Record<string, Record<string, string[]>>) => ({
      ...m,
      [key]: Object.fromEntries(
        students.map((s) => [s.id, fn(padRow(m[key]?.[s.id], cfg), off, cfg)]),
      ),
    });
    setRecs(apply);
    setSaved(apply);
    setCfgs((x) => ({ ...x, [key]: nextCfg }));
  };
  const addItem = (c: CKey) => {
    if (!canEditGrades)
      return deny(
        "only the assigned subject teacher can change assessment items.",
      );
    if (cfg[c].length >= 10)
      return toast("bad", "Maximum of 10 items per component.");
    const nextMax = cfg[c][cfg[c].length - 1] ?? 20;
    editCols(
      (row, off) => {
        const r = [...row];
        r.splice(off + cfg[c].length, 0, "");
        return r;
      },
      { ...cfg, [c]: [...cfg[c], nextMax] },
      c,
    );
    const label = COMPONENTS.find((x) => x.key === c)!.label;
    logAudit(
      "Structure",
      `Added ${c}${cfg[c].length + 1} to ${label} · ${asg.subject} ${asg.section} Q${q}`,
    );
    toast(
      "warn",
      `${c}${cfg[c].length + 1} added. Learners now lack this score until encoded, so their grade shows as incomplete.`,
    );
  };
  const removeItem = (c: CKey, i: number) => {
    if (!canEditGrades)
      return deny(
        "only the assigned subject teacher can change assessment items.",
      );
    if (cfg[c].length <= 1)
      return toast("bad", `At least one ${c} item is required.`);
    const filled = students.filter(
      (s) => (recs[key]?.[s.id] ?? [])[offsetOf(c, cfg) + i],
    ).length;
    if (
      !window.confirm(
        `Remove ${c}${i + 1}? ${filled} recorded score(s) will be deleted and all affected grades recomputed.`,
      )
    )
      return;
    editCols(
      (row, off) => row.filter((_, j) => j !== off + i),
      { ...cfg, [c]: cfg[c].filter((_, j) => j !== i) },
      c,
    );
    logAudit(
      "Structure",
      `Removed ${c}${i + 1} (${filled} scores) · ${asg.subject} ${asg.section} Q${q}`,
    );
    toast("ok", `${c}${i + 1} removed. Grades recomputed.`);
  };
  const setMax = (c: CKey, i: number, v: string) => {
    if (!canEditGrades) return;
    const n = Number(v);
    if (v !== "" && (!/^\d{1,3}$/.test(v) || n < 1)) return;
    setCfgs((x) => ({
      ...x,
      [key]: {
        ...cfg,
        [c]: cfg[c].map((m, j) => (j === i ? (v === "" ? 0 : n) : m)),
      },
    }));
  };

  const addStudent = (name: string, id: string) => {
    if (!canManageRoster)
      return deny("only the class adviser can manage the roster.");
    if (!name.trim() || !id.trim())
      return (
        toast("bad", "Validation: learner name and LRN are required."),
        false
      );
    if (!/^[\d-]{6,20}$/.test(id.trim()))
      return (
        toast(
          "bad",
          "Validation: LRN may only contain digits and dashes (6–20 characters).",
        ),
        false
      );
    if (students.some((s) => s.id === id.trim()))
      return (
        toast("bad", "Duplicate record: this LRN is already enrolled."),
        false
      );
    setStudents((l) =>
      [...l, { id: id.trim(), name: name.trim() }].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    logAudit(
      "Roster",
      `Added learner ${name.trim().split(",")[0]} · ${asg.cls}-${asg.section}`,
    );
    toast("ok", "Learner added to the class roster.");
    return true;
  };
  const removeStudent = (s: Student) => {
    if (!canManageRoster)
      return void deny("only the class adviser can manage the roster.");
    if (
      !window.confirm(
        `Remove ${s.name} from the roster? Their recorded grades in your classes will be deleted.`,
      )
    )
      return;
    setStudents((l) => l.filter((x) => x.id !== s.id));
    setStatus((st) =>
      Object.fromEntries(Object.entries(st).filter(([k]) => !k.endsWith(s.id))),
    );
    logAudit(
      "Roster",
      `Removed learner ${s.name.split(",")[0]} · ${asg.cls}-${asg.section}`,
    );
    toast("warn", "Learner removed from the roster.");
  };
  const renameStudent = (id: string, name: string) => {
    if (!canManageRoster)
      return void deny("only the class adviser can manage the roster.");
    if (!name.trim()) return toast("bad", "Validation: name cannot be empty.");
    setStudents((l) =>
      l.map((s) => (s.id === id ? { ...s, name: name.trim() } : s)),
    );
    logAudit("Roster", `Corrected learner name (${id})`);
    toast("ok", "Learner record updated.");
  };

  const save = () => {
    if (!canEditGrades)
      return void deny("you are not assigned to this subject.");
    const bad = students.filter((s) => errors(s.id).some(Boolean));
    if (bad.length)
      return toast(
        "bad",
        `Validation: ${bad.length} learner(s) have scores outside the allowed range. Nothing was saved for them.`,
      );
    let n = 0;
    let skipped = 0;
    const nb = { ...base };
    const ns = { ...status };
    const na: Audit[] = [];
    for (const s of students) {
      if (!dirty(s.id)) continue;
      if (rec[s.id].some((v) => v === "")) {
        skipped++;
        continue;
      }
      const existed = base[s.id].every((v) => v !== "");
      nb[s.id] = [...rec[s.id]];
      ns[`${key}|${s.id}`] = online ? "synced" : "pending";
      na.push({
        who:
          ROLES[role!].name.split(" ")[0][0] +
          ". " +
          ROLES[role!].name.split(" ").slice(-1)[0],
        when: stamp(),
        action: existed ? "Updated" : "Encoded",
        detail: `${s.name.split(",")[0]} · ${asg.subject} ${asg.section} Q${q}${online ? "" : " · offline"}`,
      });
      n++;
    }
    setSaved((x) => ({ ...x, [key]: nb }));
    setStatus(ns);
    setAudit((a) => [...na.reverse(), ...a]);
    if (n)
      toast(
        online ? "ok" : "warn",
        online
          ? `${n} record(s) saved to central database. Grades recomputed.`
          : `Offline: ${n} record(s) stored on this device, pending synchronization.`,
      );
    if (skipped)
      toast(
        "warn",
        `${skipped} learner(s) have missing entries and were not stored.`,
      );
    if (!n && !skipped) toast("warn", "No changes to save.");
  };

  const runSync = () => {
    const ns = { ...status };
    let ok = 0;
    let fail = 0;
    for (const [k, s] of Object.entries(ns)) {
      if (s === "synced" || !mine.some((a) => a.id === k.split("|")[0]))
        continue;
      if (k.endsWith("0205") && !failedOnce.current) {
        ns[k] = "failed";
        fail++;
        failedOnce.current = true;
      } else {
        ns[k] = "synced";
        ok++;
      }
    }
    setStatus(ns);
    toast(
      fail ? "bad" : "ok",
      `Sync finished: ${ok} succeeded${fail ? `, ${fail} failed (conflict on server; kept locally, not counted as saved)` : ""}.`,
    );
  };

  const toggleNet = () => {
    const next = !online;
    setOnline(next);
    if (next) {
      toast("ok", "Connection restored. Synchronizing pending records…");
      setTimeout(() => setStatus((s) => s), 0);
      if (pending.length) setTimeout(runSync, 600);
    } else
      toast(
        "warn",
        "You are offline. Grades will be held on this device until sync.",
      );
  };

  const login = (r: Role) => {
    setRole(r);
    setView(NAV[r][0][0]);
    const f = ASSIGNMENTS.find((a) => a.owner === r);
    if (f) {
      setAid(f.id);
      setQ("2");
    }
  };

  const signOut = () => {
    setMenu(false);
    setRole(null);
  };

  if (!role) return <Login onLogin={login} />;

  const me = ROLES[role];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[224px_1fr]">
      <div className="noprint lg:hidden sticky top-0 z-40 flex items-center justify-between bg-chalk px-4 py-3 text-white">
        <button
          aria-label="Open menu"
          aria-expanded={menu}
          onClick={() => setMenu(true)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded border border-white/25 hover:bg-white/10"
        >
          <span className="block h-0.5 w-5 bg-white" />
          <span className="block h-0.5 w-5 bg-white" />
          <span className="block h-0.5 w-5 bg-white" />
        </button>
        <div className="font-serif text-[20px] italic leading-none">
          Pedagoclick
        </div>
        <span className="w-9" />
      </div>
      {menu && (
        <div
          className="noprint fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        className={`noprint fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-chalk text-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:translate-x-0 ${menu ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
      >
        <div className="flex items-start justify-between px-5 pt-6 pb-5 border-b border-white/15">
          <div>
            <div className="font-serif text-[22px] leading-none italic">
              Pedagoclick
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/60">
              Grade ledger · SY {sy}
            </div>
          </div>
          <button
            aria-label="Close menu"
            onClick={() => setMenu(false)}
            className="lg:hidden -mt-1 text-[22px] leading-none text-white/70 hover:text-white"
          >
            ×
          </button>
        </div>
        <nav className="flex flex-col overflow-y-auto py-3 flex-1">
          {NAV[role].map(([k, l]) => (
            <button
              key={k}
              onClick={() => {
                setView(k);
                setMenu(false);
              }}
              className={`px-5 py-2.5 text-left text-[13px] border-l-2 transition ${view === k ? "border-signal bg-white/10 font-semibold" : "border-transparent text-white/75 hover:bg-white/5"}`}
            >
              {l}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/15 p-4 text-[12px]">
          <div className="font-semibold">{me.name}</div>
          <div className="text-white/60 leading-snug mt-0.5">{me.title}</div>
          <button
            onClick={signOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-signal px-3 py-2 text-[13px] font-semibold text-white hover:brightness-110"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Sign out
          </button>
          <div className="mt-1.5 text-center text-[10px] text-white/50">
            Session · 14:52 left
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <div
          className={`noprint flex flex-wrap items-center justify-between gap-3 border-b px-6 py-2 text-[12px] ${online ? "border-rule bg-panel/70" : "border-signal bg-signal-bg"}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${online ? "bg-ok" : "bg-signal animate-pulse"}`}
            />
            <span className="font-semibold">
              {online
                ? "Online · connected to central database"
                : "Offline · working from device storage"}
            </span>
            <span className="text-mute">· {pending.length} pending</span>
          </div>
          <div className="flex gap-2">
            {role !== "admin" && (
              <Btn kind="line" onClick={toggleNet}>
                {online ? "Simulate offline" : "Restore connection"}
              </Btn>
            )}
          </div>
        </div>

        <div className="p-6 lg:p-8 max-w-[1180px]">
          {view === "dash" && (
            <Dashboard
              {...{
                me,
                pending: pending.length,
                setView,
                setAid,
                setQ,
                saved,
                online,
                students,
                cfgs,
                mine,
                msgs: msgs.filter((m) => m.to === me.name && !m.resolved)
                  .length,
              }}
            />
          )}
          {view === "encode" && (
            <Encode
              {...{
                aid,
                setAid,
                q,
                setQ,
                sy,
                setSy,
                asg,
                rec,
                errors,
                dirty,
                setCell,
                save,
                status,
                key_: key,
                online,
                students,
                cfg,
                addItem,
                removeItem,
                setMax,
                mine,
                canEdit: canEditGrades,
              }}
            />
          )}
          {view === "collab" && (
            <Collab
              {...{
                role: role!,
                me,
                msgs,
                setMsgs,
                students,
                toast,
                saved,
                cfgs,
              }}
            />
          )}
          {view === "reports" && (
            <Reports {...{ asg, q, saved: base, role, students, cfg }} />
          )}
          {view === "advisory" && (
            <Advisory
              {...{
                students,
                setView,
                addStudent,
                removeStudent,
                renameStudent,
                asg: ASSIGNMENTS.find((a) => a.section === "Rizal")!,
                canManage: canManageRoster,
              }}
            />
          )}
          {view === "sync" && (
            <Sync {...{ status: myStatus, runSync, online, audit, students }} />
          )}
          {view === "admin" && <Admin toast={toast} />}
          {view === "assign" && <AssignAdmin />}
          {view === "periods" && <Periods sy={sy} />}
          {view === "audit" && <AuditTable audit={audit} />}
          {view === "privacy" && <Privacy me={me} />}
        </div>
      </main>

      <div className="noprint fixed bottom-5 right-5 z-50 flex w-[340px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`border-l-4 bg-panel px-3 py-2.5 text-[12px] shadow-lg ${{ ok: "border-ok", warn: "border-signal", bad: "border-bad" }[t.kind]}`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function Head({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
      <div>
        <div className="lbl text-signal">{kicker}</div>
        <h1 className="font-serif text-[30px] leading-tight mt-1">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (r: Role) => void }) {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [agree, setAgree] = useState(false);
  const [role, setRole] = useState<Role>("teacher");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwErr, setPwErr] = useState("");
  const submit = () => {
    if (mode === "up") {
      if (pw.length < 8)
        return setPwErr("Password must be at least 8 characters.");
      if (pw !== pw2) return setPwErr("Passwords do not match.");
    }
    onLogin(role);
  };
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <div className="bg-chalk text-white p-10 lg:p-14 flex flex-col justify-between">
        <div className="font-serif italic text-[26px]">Pedagoclick</div>
        <div className="my-12">
          <h1 className="font-serif text-[44px] lg:text-[58px] leading-[1.05]">
            Record every grade,
            <br />
            even when the
            <br />
            <span className="italic text-[#f4b27d]">signal drops.</span>
          </h1>
          <p className="mt-6 max-w-md text-white/75 leading-relaxed">
            Written Work, Performance Tasks and Quarterly Assessment, computed
            automatically, stored offline, synchronized securely, and visible
            only to the teachers who are assigned.
          </p>
        </div>
        <div className="num text-[11px] text-white/55 grid grid-cols-3 max-w-md gap-4">
          <div>
            <div className="text-white text-[22px]">30·50·20</div>WW · PT · QA
            weights
          </div>
          <div>
            <div className="text-white text-[22px]">RBAC</div>per class &amp;
            subject
          </div>
          <div>
            <div className="text-white text-[22px]">DPA</div>RA 10173 aligned
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex border-b border-rule mb-5">
            {(["in", "up"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setSent(false);
                }}
                className={`px-4 py-2 text-[13px] font-semibold border-b-2 -mb-px ${mode === m ? "border-signal" : "border-transparent text-mute"}`}
              >
                {m === "in" ? "Sign in" : "Register teacher account"}
              </button>
            ))}
          </div>
          {mode === "forgot" ? (
            <div className="space-y-3">
              <h2 className="font-serif text-[20px]">Reset your password</h2>
              {sent ? (
                <div className="border-l-4 border-ok bg-tint p-3 text-[12px] leading-relaxed">
                  If an account exists for{" "}
                  <span className="font-semibold">{email}</span>, a single-use
                  reset link has been sent. It expires in 15 minutes. Check with
                  your administrator if it does not arrive.
                </div>
              ) : (
                <>
                  <p className="text-[12px] text-mute leading-relaxed">
                    Enter your DepEd email. We will send a reset link without
                    revealing whether the account exists.
                  </p>
                  <Field
                    label="DepEd email"
                    ph="name@deped.gov.ph"
                    value={email}
                    onChange={(v) => {
                      setEmail(v);
                      setEmailErr("");
                    }}
                    error={emailErr}
                  />
                  <Btn
                    onClick={() =>
                      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
                        ? setSent(true)
                        : setEmailErr("Enter a valid email address.")
                    }
                  >
                    Send reset link
                  </Btn>
                </>
              )}
              <button
                className="block text-[12px] underline"
                onClick={() => {
                  setMode("in");
                  setSent(false);
                }}
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {mode === "up" && (
                <Field label="Full name" ph="Maria L. Santos" />
              )}
              <Field label="DepEd email" ph="name@deped.gov.ph" />
              <div>
                <Field
                  label="Password"
                  ph="••••••••••"
                  type="password"
                  value={pw}
                  onChange={(v) => {
                    setPw(v);
                    setPwErr("");
                  }}
                />
                {mode === "in" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setSent(false);
                    }}
                    className="mt-1.5 text-[12px] underline text-chalk-2"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              {mode === "up" && (
                <div>
                  <Field
                    label="Confirm password"
                    ph="••••••••••"
                    type="password"
                    value={pw2}
                    onChange={(v) => {
                      setPw2(v);
                      setPwErr("");
                    }}
                    error={pwErr}
                  />
                  {!pwErr && pw2 && pw === pw2 && (
                    <p className="mt-1 text-[11px] text-ok">Passwords match.</p>
                  )}
                </div>
              )}
              <label className="block">
                <span className="lbl">Sign in as (demo roles)</span>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {(Object.keys(ROLES) as Role[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`border px-2 py-1.5 text-[12px] capitalize ${role === r ? "border-chalk bg-chalk text-white" : "border-rule bg-white"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-mute">
                  {ROLES[role].note}
                </p>
              </label>
              <label className="flex gap-2 text-[11px] text-mute leading-snug">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 accent-[#12402d]"
                />
                I have read the Privacy Notice: only data necessary for grade
                recording is collected and retained.
              </label>
              <Btn disabled={!agree} onClick={submit}>
                {mode === "in"
                  ? "Sign in securely"
                  : "Submit for admin approval"}
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  ph,
  type = "text",
  value,
  onChange,
  error,
}: {
  label: string;
  ph: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  const pw = type === "password";
  return (
    <label className="block">
      <span className="lbl">{label}</span>
      <div className="relative mt-1">
        <input
          type={pw && show ? "text" : type}
          placeholder={ph}
          {...(onChange
            ? { value, onChange: (e) => onChange(e.target.value) }
            : {})}
          className={`block w-full border bg-white px-2.5 py-2 text-[13px] ${pw ? "pr-16" : ""} ${error ? "border-bad" : "border-rule"}`}
        />
        {pw && (
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            onClick={() => setShow(!show)}
            className="absolute inset-y-0 right-0 px-3 text-[11px] font-semibold uppercase tracking-wider text-chalk-2 hover:text-signal"
          >
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error && (
        <span className="mt-1 block text-[11px] text-bad">{error}</span>
      )}
    </label>
  );
}

function Dashboard({
  me,
  pending,
  setView,
  setAid,
  setQ,
  saved,
  online,
  students,
  cfgs,
  mine,
  msgs,
}: any) {
  const stat = (a: (typeof ASSIGNMENTS)[number]) => {
    const r = saved[`${a.id}|2`];
    const cf = cfgs[`${a.id}|2`] ?? DEFAULT_CFG;
    return r
      ? students.filter((s: Student) => compute(r[s.id], cf).complete).length
      : 0;
  };
  return (
    <>
      <Head
        kicker={`Good morning · ${me.title}`}
        title={me.name.split(" ")[0] + ", here is your ledger."}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-rule bg-panel divide-x divide-rule mb-6">
        {[
          [
            "Assigned classes",
            String(mine.length),
            mine
              .map((a: any) => a.subject)
              .filter((v: string, i: number, l: string[]) => l.indexOf(v) === i)
              .join(" · "),
          ],
          [
            "Learners",
            String(students.length * mine.length),
            "authorized only",
          ],
          ["Grading period", "Q2", "Oct 6 – Dec 19"],
          [
            "Pending sync",
            String(pending),
            online ? "ready to send" : "waiting for network",
          ],
        ].map(([l, v, s], i) => (
          <div key={l} className="p-4">
            <div className="lbl">{l}</div>
            <div
              className={`num text-[34px] leading-none mt-2 ${i === 3 && pending ? "text-signal" : ""}`}
            >
              {v}
            </div>
            <div className="text-[11px] text-mute mt-1.5">{s}</div>
          </div>
        ))}
      </div>
      <Panel title="My assignments · Quarter 2">
        <table className="w-full text-left">
          <thead className="lbl">
            <tr className="border-b border-rule">
              {["Class", "Subject", "Learners", "Recording status", ""].map(
                (h) => (
                  <th key={h} className="px-4 py-2 font-semibold">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {mine.map((a: any) => {
              const d = stat(a);
              return (
                <tr
                  key={a.id}
                  className="border-b border-rule/70 hover:bg-tint/40"
                >
                  <td className="px-4 py-3 font-semibold">
                    {a.cls} – {a.section}
                  </td>
                  <td className="px-4">{a.subject}</td>
                  <td className="num px-4">{students.length}</td>
                  <td className="px-4 w-[240px]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-rule">
                        <div
                          className="h-full bg-chalk-2"
                          style={{
                            width: `${(d / Math.max(students.length, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="num text-[11px]">
                        {d}/{students.length}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 text-right">
                    <Btn
                      kind="line"
                      onClick={() => {
                        setAid(a.id);
                        setQ("2");
                        setView("encode");
                      }}
                    >
                      Open →
                    </Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Attention needed">
          <ul className="divide-y divide-rule/70">
            <li className="flex gap-3 p-4">
              <Chip kind="warn">Missing</Chip>
              <span>
                {students.length - stat(mine[0])} learners in {mine[0]?.subject}{" "}
                {mine[0]?.section} still lack complete Q2 scores.
              </span>
            </li>
            <li className="flex gap-3 p-4">
              <Chip kind={msgs ? "warn" : "ok"}>Adviser</Chip>
              <span>
                {msgs ? (
                  <>
                    {msgs} open request(s) from advisers.{" "}
                    <button
                      className="underline"
                      onClick={() => setView("collab")}
                    >
                      Open collaboration
                    </button>
                  </>
                ) : (
                  "No open adviser requests."
                )}
              </span>
            </li>
            <li className="flex gap-3 p-4">
              <Chip kind={pending ? "warn" : "ok"}>Sync</Chip>
              <span>
                {pending
                  ? `${pending} record(s) not yet in the central database.`
                  : "Everything is synchronized."}
              </span>
            </li>
            <li className="flex gap-3 p-4">
              <Chip kind="mute">Notice</Chip>
              <span>Q2 grade submission window closes Dec 19.</span>
            </li>
          </ul>
        </Panel>
        <Panel title="Scope of access">
          <p className="p-4 leading-relaxed text-mute">
            You can edit grades only for the subjects assigned to you.{" "}
            {me.title.includes("Adviser")
              ? "As class adviser you also manage the 6-Rizal roster and can view, but not change, other teachers’ grades."
              : "The class roster is managed by the class adviser; you have read-only access to it."}
          </p>
        </Panel>
      </div>
    </>
  );
}

function Encode({
  aid,
  setAid,
  q,
  setQ,
  sy,
  setSy,
  asg,
  rec,
  errors,
  dirty,
  setCell,
  save,
  status,
  key_,
  online,
  students,
  cfg,
  addItem,
  removeItem,
  setMax,
  mine,
  canEdit,
}: any) {
  const [ctx, setCtx] = useState(true);
  const [find, setFind] = useState("");
  const rows = students.filter(
    (s: Student) =>
      s.name.toLowerCase().includes(find.toLowerCase()) || s.id.includes(find),
  );
  return (
    <>
      <Head
        kicker="Grade encoding"
        title={`${asg.subject} · ${asg.cls}-${asg.section}`}
      >
        <div className="flex gap-2">
          <Btn kind="line" onClick={() => setCtx(!ctx)}>
            {ctx ? "Hide" : "Change"} context
          </Btn>
          <Btn kind="signal" disabled={!canEdit} onClick={save}>
            {online ? "Save grades" : "Save offline"}
          </Btn>
        </div>
      </Head>
      {ctx && (
        <Panel className="mb-5 p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Class · Section · Subject"
              value={aid}
              onChange={setAid}
              options={mine.map((a: any) => [
                a.id,
                `${a.cls}-${a.section} · ${a.subject}`,
              ])}
            />
            <Select
              label="School year"
              value={sy}
              onChange={setSy}
              options={[
                ["2026–2027", "2026–2027"],
                ["2025–2026", "2025–2026 (locked)"],
              ]}
            />
            <Select
              label="Grading period"
              value={q}
              onChange={setQ}
              options={[
                ["1", "Quarter 1"],
                ["2", "Quarter 2"],
                ["3", "Quarter 3"],
                ["4", "Quarter 4"],
              ]}
            />
            <label className="block">
              <span className="lbl">Find learner</span>
              <input
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="Name or LRN"
                className="mt-1 block w-full border border-rule bg-white px-2 py-1.5 text-[12px]"
              />
            </label>
          </div>
        </Panel>
      )}
      {!canEdit && (
        <div className="mb-4 border-l-4 border-bad bg-red-50 p-3 text-[12px]">
          Read-only: you are not assigned to this subject.
        </div>
      )}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="lbl border-b border-rule">
                <th rowSpan={2} className="px-3 py-2 align-bottom">
                  Learner
                </th>
                {COMPONENTS.map((c) => (
                  <th
                    key={c.key}
                    colSpan={cfg[c.key].length + 1}
                    className="border-l border-rule px-2 py-2 text-center"
                  >
                    {c.label} · {c.weight * 100}%
                    {c.key !== "QA" && canEdit && (
                      <button
                        onClick={() => addItem(c.key)}
                        className="ml-2 border border-chalk bg-chalk px-1.5 py-0.5 normal-case tracking-normal text-white hover:bg-chalk-2"
                      >
                        + Add {c.key === "WW" ? "written work" : "task"}
                      </button>
                    )}
                  </th>
                ))}
                <th
                  colSpan={3}
                  className="border-l border-rule px-2 py-2 text-center bg-tint"
                >
                  Computed
                </th>
              </tr>
              <tr className="lbl border-b border-ink/40 text-[10px]">
                {COMPONENTS.map((c) => (
                  <Fragment key={c.key}>
                    {cfg[c.key].map((m: number, i: number) => (
                      <th
                        key={i}
                        className={`px-1 py-1.5 text-center ${i === 0 ? "border-l border-rule" : ""}`}
                      >
                        <div className="num flex items-center justify-center gap-0.5">
                          {c.key}
                          {i + 1}
                          {c.key !== "QA" && canEdit && (
                            <button
                              title={`Remove ${c.key}${i + 1}`}
                              aria-label={`Remove ${c.key}${i + 1}`}
                              onClick={() => removeItem(c.key, i)}
                              className="text-bad hover:bg-red-100 px-0.5 text-[12px] leading-none"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <div className="num normal-case tracking-normal font-normal">
                          /
                          <input
                            readOnly={!canEdit}
                            aria-label={`${c.key}${i + 1} maximum`}
                            value={m || ""}
                            onChange={(e) => setMax(c.key, i, e.target.value)}
                            className="w-7 border-b border-mute/50 bg-transparent text-center text-[11px]"
                          />
                        </div>
                      </th>
                    ))}
                    <th className="num px-1 text-center">%</th>
                  </Fragment>
                ))}
                <th className="border-l border-rule bg-tint px-2 text-center">
                  Wtd
                </th>
                <th className="bg-tint px-2 text-center">Final</th>
                <th className="bg-tint px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s: Student) => {
                const calc = compute(rec[s.id], cfg);
                const err = errors(s.id);
                const st: Status | undefined = status[`${key_}|${s.id}`];
                let ci = 0;
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-rule/70 ${dirty(s.id) ? "bg-signal-bg/40" : ""}`}
                  >
                    <td className="px-3 py-1.5">
                      <div className="font-semibold">{s.name}</div>
                      <div className="num text-[10px] text-mute">{s.id}</div>
                    </td>
                    {COMPONENTS.map((c, k) => (
                      <Fragment key={c.key}>
                        {cfg[c.key].map((m: number, i: number) => {
                          const idx = ci++;
                          return (
                            <td
                              key={idx}
                              className={`px-1 ${i === 0 ? "border-l border-rule" : ""}`}
                            >
                              <input
                                disabled={!canEdit}
                                aria-label={`${s.name} ${c.key}${i + 1}`}
                                value={rec[s.id][idx]}
                                onChange={(e) =>
                                  setCell(s.id, idx, e.target.value)
                                }
                                inputMode="decimal"
                                className={`num w-11 border px-1 py-1 text-center text-[12px] ${err[idx] ? "border-bad bg-red-50 text-bad" : !canEdit ? "border-transparent bg-transparent" : rec[s.id][idx] === "" ? "border-dashed border-rule bg-white" : "border-rule bg-white"}`}
                              />
                              {err[idx] && (
                                <div className="text-[9px] text-bad text-center">
                                  max {m}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="num px-1 text-center text-mute">
                          {calc.ps[k] == null ? "—" : calc.ps[k]!.toFixed(1)}
                        </td>
                      </Fragment>
                    ))}
                    <td className="num border-l border-rule bg-tint/60 px-2 text-center">
                      {calc.ws == null ? "—" : calc.ws.toFixed(2)}
                    </td>
                    <td
                      className={`num bg-tint/60 px-2 text-center text-[15px] font-medium ${calc.final != null && calc.final < 75 ? "text-bad" : ""}`}
                    >
                      {calc.final ?? "—"}
                    </td>
                    <td className="bg-tint/60 px-2">
                      {dirty(s.id) ? (
                        <Chip kind="warn">Edited</Chip>
                      ) : st === "pending" ? (
                        <Chip kind="warn">Pending</Chip>
                      ) : st === "failed" ? (
                        <Chip kind="bad">Failed</Chip>
                      ) : st === "synced" ? (
                        <Chip kind="ok">Saved</Chip>
                      ) : (
                        <Chip kind="mute">Missing</Chip>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="p-6 text-mute">
            No learners on this roster. Add learners under Students.
          </p>
        )}
        <div className="flex flex-wrap justify-between gap-2 border-t border-rule px-4 py-2.5 text-[11px] text-mute">
          <span>
            Use + / × to add or remove Written Work and Performance Task items
            for this class and quarter; click a maximum to change it. Every
            structure change is audited and recomputes grades.
          </span>
          <span className="num">
            {total(cfg)} items · {cfg.WW.length} WW · {cfg.PT.length} PT · 1 QA
          </span>
        </div>
      </Panel>
    </>
  );
}

function Students({
  students,
  addStudent,
  removeStudent,
  renameStudent,
  asg,
  canManage,
}: any) {
  const [f, setF] = useState("");
  const [name, setName] = useState("");
  const [lrn, setLrn] = useState("");
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const list = students.filter(
    (s: Student) =>
      s.name.toLowerCase().includes(f.toLowerCase()) || s.id.includes(f),
  );
  return (
    <>
      <Head kicker="Student management" title={`${asg.cls} · ${asg.section}`} />
      {!canManage && (
        <div className="mb-4 border-l-4 border-signal bg-signal-bg p-3 text-[12px]">
          Read-only: only the class adviser (Mr. Bautista, 6-Rizal) can add,
          edit or remove learners. Ask through Collaboration if a record needs
          correcting.
        </div>
      )}
      {canManage && (
        <Panel title="Add learner" className="mb-5">
          <div className="flex flex-wrap items-end gap-3 p-4">
            <label className="block">
              <span className="lbl">Name (Last, First M.)</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ramos, Kyla Marie"
                className="mt-1 block w-64 border border-rule bg-white px-2.5 py-1.5"
              />
            </label>
            <label className="block">
              <span className="lbl">LRN</span>
              <input
                value={lrn}
                onChange={(e) => setLrn(e.target.value)}
                placeholder="2026-10-0230"
                className="num mt-1 block w-44 border border-rule bg-white px-2.5 py-1.5"
              />
            </label>
            <Btn
              onClick={() => {
                if (addStudent(name, lrn)) {
                  setName("");
                  setLrn("");
                }
              }}
            >
              + Add learner
            </Btn>
            <p className="basis-full text-[11px] text-mute">
              Only name and LRN are collected. Duplicate LRNs are rejected.
            </p>
          </div>
        </Panel>
      )}
      <input
        value={f}
        onChange={(e) => setF(e.target.value)}
        placeholder="Search by name or LRN…"
        className="mb-4 w-full max-w-sm border border-rule bg-white px-3 py-2"
      />
      <Panel title={`${list.length} learner(s)`}>
        <table className="w-full text-left">
          <thead className="lbl">
            <tr className="border-b border-rule">
              <th className="px-4 py-2">Learner</th>
              <th>LRN</th>
              <th>Section</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((s: Student) => (
              <tr key={s.id} className="border-b border-rule/70">
                <td className="px-4 py-2 font-semibold">
                  {edit === s.id ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          renameStudent(s.id, draft);
                          setEdit(null);
                        }
                      }}
                      className="w-64 border border-chalk bg-white px-2 py-1 font-normal"
                    />
                  ) : (
                    s.name
                  )}
                </td>
                <td className="num">{s.id}</td>
                <td>{asg.section}</td>
                <td className="px-4 text-right whitespace-nowrap text-[12px]">
                  {!canManage ? (
                    <span className="text-mute">—</span>
                  ) : edit === s.id ? (
                    <>
                      <button
                        className="underline mr-3"
                        onClick={() => {
                          renameStudent(s.id, draft);
                          setEdit(null);
                        }}
                      >
                        Save
                      </button>
                      <button
                        className="underline"
                        onClick={() => setEdit(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="underline mr-3"
                        onClick={() => {
                          setEdit(s.id);
                          setDraft(s.name);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="underline text-bad"
                        onClick={() => removeStudent(s)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <p className="p-6 text-mute">No authorized learner matches "{f}".</p>
        )}
        <p className="border-t border-rule px-4 py-2.5 text-[11px] text-mute">
          Only fields needed for grade recording are shown. Contact details,
          addresses and guardian data are not displayed.
        </p>
      </Panel>
    </>
  );
}

function Reports({ asg, q, saved, role, students, cfg }: any) {
  const [type, setType] = useState("class");
  const [sid, setSid] = useState(students[0]?.id ?? "");
  const rows = (
    type === "student"
      ? students.filter((s: Student) => s.id === sid)
      : students
  ).map((s: Student) => ({ s, c: compute(saved[s.id], cfg) }));
  const done = rows.filter((r: any) => r.c.final != null);
  const avg = done.length
    ? done.reduce((a: number, r: any) => a + r.c.final!, 0) / done.length
    : 0;
  return (
    <>
      <Head kicker="Grade reports" title="Generate report">
        <div className="noprint flex gap-2">
          <Btn kind="line" onClick={() => window.print()}>
            Print / PDF
          </Btn>
        </div>
      </Head>
      <div className="noprint grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <Select
          label="Report type"
          value={type}
          onChange={setType}
          options={[
            ["student", "Individual student"],
            ["class", "Class / subject"],
            ["period", "Grading period summary"],
          ]}
        />
        {type === "student" && (
          <Select
            label="Learner"
            value={sid}
            onChange={setSid}
            options={students.map((s: Student) => [s.id, s.name])}
          />
        )}
        {role === "adviser" && (
          <p className="text-[11px] text-mute self-end">
            Adviser: report cards for 6-Rizal students only.
          </p>
        )}
      </div>
      <Panel className="p-6">
        <div className="text-center border-b-2 border-ink pb-4 mb-4">
          <div className="lbl">
            Republic of the Philippines · Department of Education
          </div>
          <div className="font-serif text-[22px] mt-1">
            Report on Learning Progress · Quarter {q}
          </div>
          <div className="text-mute">
            {asg.subject} · {asg.cls}-{asg.section} · SY 2026–2027
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="lbl">
            <tr className="border-b border-rule">
              <th className="py-2">Learner</th>
              <th className="text-center">WW %</th>
              <th className="text-center">PT %</th>
              <th className="text-center">QA %</th>
              <th className="text-center">Grade</th>
              <th>Descriptor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, c }: any) => (
              <tr key={s.id} className="border-b border-rule/70">
                <td className="py-2 font-semibold">{s.name}</td>
                {c.ps.map((p: number | null, i: number) => (
                  <td key={i} className="num text-center">
                    {p == null ? "—" : p.toFixed(1)}
                  </td>
                ))}
                <td className="num text-center text-[15px]">
                  {c.final ?? "—"}
                </td>
                <td>
                  {c.final ? (
                    descriptor(c.final)
                  ) : (
                    <span className="text-signal">Incomplete</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex justify-between text-[11px] text-mute">
          <span>
            Generated {stamp()} · confidential, for authorized use only
          </span>
          <span className="num">
            Class average {avg ? avg.toFixed(1) : "—"} · {done.length}/
            {rows.length} complete
          </span>
        </div>
      </Panel>
    </>
  );
}

function printCard(s: Student, c: any, asg: any) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  const cell = (p: number | null) => (p == null ? "—" : p.toFixed(1));
  w.document
    .write(`<html><head><title>Report card · ${s.name}</title><style>body{font-family:Georgia,serif;padding:40px;color:#111}h1{font-size:20px;margin:4px 0}.c{text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:20px}small{letter-spacing:.1em;text-transform:uppercase;font-size:10px}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #999;padding:8px;text-align:center}th{font-size:11px;text-transform:uppercase}.sig{margin-top:60px;display:flex;justify-content:space-between;font-size:12px}.sig div{border-top:1px solid #111;width:40%;text-align:center;padding-top:4px}</style></head><body>
<div class="c"><small>Republic of the Philippines · Department of Education</small><h1>Report on Learning Progress and Achievement</h1><div>Grade ${asg.cls.replace(/\D/g, "") || asg.cls} · Section ${asg.section} · SY 2026–2027</div></div>
<p><b>Learner:</b> ${s.name}<br/><b>LRN:</b> ${s.id}</p>
<table><tr><th>Learning area</th><th>WW %</th><th>PT %</th><th>QA %</th><th>Quarterly grade</th><th>Descriptor</th></tr>
<tr><td>Mathematics 6</td>${c.ps.map((p: number | null) => `<td>${cell(p)}</td>`).join("")}<td><b>${c.final ?? "—"}</b></td><td>${c.final ? descriptor(c.final) : "—"}</td></tr></table>
<div class="sig"><div>Class Adviser</div><div>Parent / Guardian</div></div>
<script>window.onload=()=>{window.print()}</script></body></html>`);
  w.document.close();
}

function Advisory({
  students,
  setView,
  addStudent,
  removeStudent,
  renameStudent,
  asg,
  canManage,
}: any) {
  const rows = students.map((s: Student) => ({
    s,
    c: compute(SEED[s.id], DEFAULT_CFG),
  }));
  return (
    <>
      <Head kicker="Advisory dashboard" title={`${asg.cls} · ${asg.section}`}>
        <Btn kind="signal" onClick={() => setView("collab")}>
          Collaborate with subject teachers →
        </Btn>
      </Head>
      <div className="mb-4 border-l-4 border-signal bg-signal-bg p-3 text-[12px]">
        Read-only view of other subject teachers' grades. To act on a gap, send
        a request through Collaboration; editing requires a separate subject
        assignment.
      </div>
      <Panel>
        <table className="w-full text-left">
          <thead className="lbl">
            <tr className="border-b border-rule">
              <th className="px-4 py-2">Student</th>
              <th>Math 6</th>
              <th>Report card</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, c }: any) => (
              <tr key={s.id} className="border-b border-rule/70">
                <td className="px-4 py-2.5 font-semibold">{s.name}</td>
                <td className="num">{c.final ?? "—"}</td>
                <td className="py-1.5">
                  {c.complete ? (
                    <span className="flex items-center gap-2">
                      <Chip kind="ok">Ready</Chip>
                      <Btn kind="line" onClick={() => printCard(s, c, asg)}>
                        Print report card
                      </Btn>
                    </span>
                  ) : (
                    <Chip kind="warn">Waiting on grades</Chip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <div className="mt-8">
        <Students
          {...{
            students,
            addStudent,
            removeStudent,
            renameStudent,
            asg,
            canManage,
          }}
        />
      </div>
    </>
  );
}

const SUBJECT_TEACHERS = [
  {
    name: "Ma. Corazon Villanueva",
    subject: "Mathematics 6",
    live: true,
    done: 0,
  },
  { name: "Josefina P. Reyes", subject: "Science 6", live: false, done: 8 },
  { name: "Eduardo S. Manalo", subject: "English 6", live: false, done: 5 },
];

function Collab({
  role,
  me,
  msgs,
  setMsgs,
  students,
  toast,
  saved,
  cfgs,
}: any) {
  const isAdviser = role === "adviser";
  const [to, setTo] = useState(SUBJECT_TEACHERS[0].name);
  const [learner, setLearner] = useState("Whole class");
  const [kind, setKind] = useState<Msg["kind"]>("Concern");
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Record<number, string>>({});
  const mine: Msg[] = msgs.filter((m: Msg) =>
    isAdviser ? m.from === me.name : m.to === me.name,
  );
  const mathDone = saved["a1|2"]
    ? students.filter(
        (s: Student) =>
          compute(saved["a1|2"][s.id], cfgs["a1|2"] ?? DEFAULT_CFG).complete,
      ).length
    : 0;
  const send = (o?: Partial<Msg>) => {
    const body = o?.text ?? text;
    if (!body.trim()) return toast("bad", "Validation: write a message first.");
    const t = SUBJECT_TEACHERS.find((x) => x.name === (o?.to ?? to))!;
    setMsgs((m: Msg[]) => [
      {
        id: Date.now(),
        from: me.name,
        fromRole: role,
        to: t.name,
        subject: t.subject,
        learner,
        kind,
        text: body.trim(),
        when: stamp(),
        resolved: false,
        replies: [],
        ...o,
      },
      ...m,
    ]);
    if (!o) setText("");
    toast(
      "ok",
      `Sent to ${t.name.split(" ").slice(-1)[0]}. Only that teacher and you can read it.`,
    );
  };
  const update = (id: number, fn: (m: Msg) => Msg) =>
    setMsgs((l: Msg[]) => l.map((m) => (m.id === id ? fn(m) : m)));
  const doReply = (id: number) => {
    const t = (reply[id] ?? "").trim();
    if (!t) return toast("bad", "Validation: write a reply first.");
    update(id, (m) => ({
      ...m,
      replies: [...m.replies, { who: me.name, text: t, when: stamp() }],
    }));
    setReply((r) => ({ ...r, [id]: "" }));
  };
  return (
    <>
      <Head
        kicker="Adviser ⇄ subject-teacher collaboration"
        title={isAdviser ? "Advisory coordination" : "Requests from advisers"}
      />
      <div className="mb-5 border-l-4 border-chalk bg-tint p-3 text-[12px]">
        Threads are visible only to the sender and the addressed teacher.
        Learner names appear in threads, never in notifications. Collaboration
        does not grant grade-editing rights.
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {isAdviser && (
            <Panel title="New request">
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                <Select
                  label="Subject teacher"
                  value={to}
                  onChange={setTo}
                  options={SUBJECT_TEACHERS.map((t) => [
                    t.name,
                    `${t.name.split(" ").slice(-1)[0]} · ${t.subject}`,
                  ])}
                />
                <Select
                  label="About learner"
                  value={learner}
                  onChange={setLearner}
                  options={[
                    ["Whole class", "Whole class"],
                    ...students.map(
                      (s: Student) => [s.name, s.name] as [string, string],
                    ),
                  ]}
                />
                <Select
                  label="Type"
                  value={kind}
                  onChange={(v) => setKind(v as Msg["kind"])}
                  options={[
                    ["Concern", "Concern"],
                    ["Missing grades", "Missing grades"],
                    ["Info", "Info"],
                  ]}
                />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="Describe what you need from the subject teacher…"
                  className="sm:col-span-3 border border-rule bg-white p-2.5"
                />
                <div className="sm:col-span-3">
                  <Btn onClick={() => send()}>Send request</Btn>
                </div>
              </div>
            </Panel>
          )}
          {!mine.length && (
            <Panel>
              <p className="p-6 text-mute">
                {isAdviser
                  ? "No requests sent yet."
                  : "No requests addressed to you."}
              </p>
            </Panel>
          )}
          {mine.map((m) => (
            <Panel key={m.id} className={m.resolved ? "opacity-70" : ""}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Chip kind={m.kind === "Info" ? "mute" : "warn"}>
                    {m.kind}
                  </Chip>
                  <span className="font-semibold">{m.learner}</span>
                  <span className="text-mute">· {m.subject}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="num text-[11px] text-mute">{m.when}</span>
                  {m.resolved ? (
                    <Chip kind="ok">Resolved</Chip>
                  ) : (
                    <button
                      className="text-[12px] underline"
                      onClick={() =>
                        update(m.id, (x) => ({ ...x, resolved: true }))
                      }
                    >
                      Mark resolved
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <p className="leading-relaxed">
                  <span className="font-semibold">{m.from.split(" ")[0]}:</span>{" "}
                  {m.text}
                </p>
                {m.replies.map((r, i) => (
                  <p
                    key={i}
                    className="ml-5 border-l-2 border-chalk-2 pl-3 leading-relaxed"
                  >
                    <span className="font-semibold">{r.who.split(" ")[0]}</span>{" "}
                    <span className="num text-[10px] text-mute">{r.when}</span>
                    <br />
                    {r.text}
                  </p>
                ))}
                {!m.resolved && (
                  <div className="flex gap-2">
                    <input
                      value={reply[m.id] ?? ""}
                      onChange={(e) =>
                        setReply((r) => ({ ...r, [m.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && doReply(m.id)}
                      placeholder="Reply…"
                      className="flex-1 border border-rule bg-white px-2.5 py-1.5"
                    />
                    <Btn kind="line" onClick={() => doReply(m.id)}>
                      Reply
                    </Btn>
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </div>
        <div className="space-y-4">
          {isAdviser ? (
            <Panel title="6-Rizal · subject completion (Q2)">
              <ul className="divide-y divide-rule/70">
                {SUBJECT_TEACHERS.map((t) => {
                  const d = t.live ? mathDone : t.done;
                  return (
                    <li key={t.name} className="p-3.5">
                      <div className="flex justify-between">
                        <span className="font-semibold">{t.subject}</span>
                        <span className="num text-[11px]">
                          {d}/{students.length}
                        </span>
                      </div>
                      <div className="text-[11px] text-mute">{t.name}</div>
                      <div className="my-2 h-1.5 bg-rule">
                        <div
                          className="h-full bg-chalk-2"
                          style={{
                            width: `${(d / Math.max(students.length, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      {d < students.length && (
                        <button
                          className="text-[12px] underline"
                          onClick={() =>
                            send({
                              to: t.name,
                              learner: "Whole class",
                              kind: "Missing grades",
                              text: `${students.length - d} learner(s) in 6-Rizal still lack ${t.subject} Q2 grades. Could you complete them before Dec 19?`,
                            })
                          }
                        >
                          Nudge teacher
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="border-t border-rule px-4 py-2.5 text-[11px] text-mute">
                Counts only; individual scores stay in the subject teacher's
                ledger.
              </p>
            </Panel>
          ) : (
            <Panel title="How this works">
              <p className="p-4 leading-relaxed text-mute">
                Advisers can ask about learner concerns or missing grades. You
                reply here and mark the thread resolved. Advisers cannot change
                your grades.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Sync({ status, runSync, online, audit, students }: any) {
  const q = Object.entries(status).filter(([, s]) => s !== "synced") as [
    string,
    Status,
  ][];
  const name = (k: string) =>
    students.find((s: Student) => k.endsWith(s.id))?.name ?? k;
  return (
    <>
      <Head kicker="Offline & synchronization" title="Sync queue">
        <Btn kind="signal" disabled={!online || !q.length} onClick={runSync}>
          Sync now
        </Btn>
      </Head>
      <Panel title={`Pending records · ${q.length}`} className="mb-6">
        {q.length ? (
          <ul className="divide-y divide-rule/70">
            {q.map(([k, s]) => (
              <li key={k} className="flex items-center justify-between p-3.5">
                <div>
                  <div className="font-semibold">{name(k)}</div>
                  <div className="num text-[11px] text-mute">
                    Math · Q{k.split("|")[1]} · stored on this device
                  </div>
                </div>
                {s === "failed" ? (
                  <Chip kind="bad">Failed · not saved centrally</Chip>
                ) : (
                  <Chip kind="warn">Pending sync</Chip>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-mute">
            All records are safely stored in the central database.
          </p>
        )}
      </Panel>
      <AuditTable audit={audit} />
    </>
  );
}

function AuditTable({ audit }: { audit: Audit[] }) {
  return (
    <Panel title="Audit log · grade actions">
      <table className="w-full text-left">
        <thead className="lbl">
          <tr className="border-b border-rule">
            <th className="px-4 py-2">When</th>
            <th>User</th>
            <th>Action</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {audit.map((a, i) => (
            <tr key={i} className="border-b border-rule/70">
              <td className="num px-4 py-2 text-[11px]">{a.when}</td>
              <td>{a.who}</td>
              <td>
                <Chip kind={a.action === "Updated" ? "warn" : "ok"}>
                  {a.action}
                </Chip>
              </td>
              <td className="text-mute">{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function Admin({
  toast,
}: {
  toast: (k: "ok" | "warn" | "bad", t: string) => void;
}) {
  const [list, setList] = useState(TEACHERS);
  const [name, setName] = useState("");
  const add = () => {
    if (!name.trim()) return toast("bad", "Validation: full name is required.");
    if (list.some((t) => t.name.toLowerCase() === name.trim().toLowerCase()))
      return toast(
        "bad",
        "Duplicate record: a teacher with this name already exists.",
      );
    setList([
      ...list,
      {
        name: name.trim(),
        role: "Subject Teacher",
        load: "Unassigned",
        status: "Pending",
      },
    ]);
    setName("");
    toast("ok", "Teacher account created. Awaiting assignment.");
  };
  const cycle = (n: string) =>
    setList(
      list.map((t) =>
        t.name === n
          ? { ...t, status: t.status === "Active" ? "Locked" : "Active" }
          : t,
      ),
    );
  return (
    <>
      <Head kicker="Administrator" title="Teacher accounts" />
      <div className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New teacher full name"
          className="w-72 border border-rule bg-white px-3 py-2"
        />
        <Btn onClick={add}>Add account</Btn>
      </div>
      <Panel>
        <table className="w-full text-left">
          <thead className="lbl">
            <tr className="border-b border-rule">
              <th className="px-4 py-2">Teacher</th>
              <th>Role</th>
              <th>Load</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.name} className="border-b border-rule/70">
                <td className="px-4 py-2.5 font-semibold">{t.name}</td>
                <td>{t.role}</td>
                <td className="num">{t.load}</td>
                <td>
                  <Chip
                    kind={
                      t.status === "Active"
                        ? "ok"
                        : t.status === "Locked"
                          ? "bad"
                          : "warn"
                    }
                  >
                    {t.status}
                  </Chip>
                </td>
                <td className="pr-4 text-right">
                  <button
                    onClick={() => cycle(t.name)}
                    className="underline text-[12px]"
                  >
                    {t.status === "Active" ? "Lock" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function AssignAdmin() {
  return (
    <>
      <Head kicker="Administrator" title="Class & subject assignments" />
      <Panel>
        <table className="w-full text-left">
          <thead className="lbl">
            <tr className="border-b border-rule">
              <th className="px-4 py-2">Teacher</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Grade edit</th>
              <th>Advisory</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Villanueva, M.", "6-Rizal", "Mathematics 6", true, false],
              ["Villanueva, M.", "6-Bonifacio", "Mathematics 6", true, false],
              ["Bautista, R.", "6-Rizal", "Filipino 6", true, true],
              ["Reyes, J.", "6-Rizal", "Science 6", true, false],
              ["Tolentino, G.", "5-Mabini", "— (adviser only)", false, true],
            ].map((r, i) => (
              <tr key={i} className="border-b border-rule/70">
                <td className="px-4 py-2.5 font-semibold">{r[0]}</td>
                <td>{r[1]}</td>
                <td>{r[2]}</td>
                <td>
                  {r[3] ? (
                    <Chip kind="ok">Allowed</Chip>
                  ) : (
                    <Chip kind="mute">Read-only</Chip>
                  )}
                </td>
                <td>{r[4] ? <Chip kind="ok">Adviser</Chip> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function Periods({ sy }: { sy: string }) {
  return (
    <>
      <Head kicker="Administrator" title={`School year ${sy}`} />
      <div className="grid lg:grid-cols-4 gap-4">
        {[
          ["Q1", "Aug 4 – Oct 3", "Closed", "mute"],
          ["Q2", "Oct 6 – Dec 19", "Open", "ok"],
          ["Q3", "Jan 5 – Mar 13", "Scheduled", "warn"],
          ["Q4", "Mar 16 – May 29", "Scheduled", "warn"],
        ].map(([q, d, s, k]) => (
          <Panel key={q} className="p-4">
            <div className="num text-[32px]">{q}</div>
            <div className="text-mute mb-3">{d}</div>
            <Chip kind={k as "ok"}>{s}</Chip>
          </Panel>
        ))}
      </div>
    </>
  );
}

function Privacy({ me }: { me: { name: string; title: string } }) {
  const [tab, setTab] = useState<"account" | "policy">("account");
  const [displayName, setDisplayName] = useState(me.name);
  const [email, setEmail] = useState("mcorazon.villanueva@depedschool.edu.ph");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [notifGrade, setNotifGrade] = useState(true);
  const [notifCollab, setNotifCollab] = useState(true);
  const [notifSync, setNotifSync] = useState(false);
  const [saved2fa, setSaved2fa] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  function saveAccount() {
    setSaveMsg("Account settings saved.");
    setTimeout(() => setSaveMsg(""), 2800);
  }
  function changePw() {
    if (!currentPw || !newPw) {
      setSaveMsg("Enter both current and new password.");
      setTimeout(() => setSaveMsg(""), 2800);
      return;
    }
    setCurrentPw("");
    setNewPw("");
    setSaveMsg("Password changed successfully.");
    setTimeout(() => setSaveMsg(""), 2800);
  }

  const policyItems = [
    [
      "Authenticated, role-based access",
      "Every request is verified against your assigned classes and subjects. You may only view or modify records within your authorised scope.",
    ],
    [
      "Data minimisation",
      "Only information required for grade recording and official DepEd reporting is collected. No personal data is gathered beyond what is necessary for the declared purpose.",
    ],
    [
      "Secure storage & transmission",
      "All data in transit is encrypted. Offline records are held in protected device storage and deleted from the device after a successful sync to the central database.",
    ],
    [
      "Session management",
      "Sessions automatically expire after a period of inactivity. Signing out immediately clears all local session tokens and cached data.",
    ],
    [
      "Audit records",
      "Every grade creation, modification, and roster change is logged with the responsible user, timestamp, and a description of the action.",
    ],
    [
      "Retention & disposal",
      "Personal data is retained only for as long as required by the declared purpose or applicable law (including DepEd Order No. 8, s. 2015), then securely and irreversibly deleted.",
    ],
    [
      "Your rights under RA 10173",
      "As a data subject you have the right to be informed, to access your personal data, to correct inaccuracies, to object to processing, and to lodge a complaint with the National Privacy Commission.",
    ],
    [
      "Data Protection Officer",
      "Concerns or requests regarding personal data may be directed to the school's designated DPO through the Office of the Principal.",
    ],
  ];

  return (
    <>
      <Head
        kicker="Account · RA 10173 Data Privacy Act"
        title="Settings & Privacy"
      />

      <div className="flex gap-1 mb-6 border-b border-rule">
        {(["account", "policy"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-[13px] font-semibold -mb-px border-b-2 transition-colors ${tab === t ? "border-signal text-signal" : "border-transparent text-mute hover:text-ink"}`}
          >
            {t === "account" ? "Account settings" : "Privacy policy"}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Profile */}
          <Panel title="Profile">
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-signal flex items-center justify-center text-white font-bold text-xl select-none">
                  {me.name
                    .split(" ")
                    .filter(Boolean)
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="font-semibold">{me.name}</div>
                  <div className="text-[12px] text-mute">{me.title}</div>
                </div>
              </div>
              <div>
                <label className="lbl block mb-1">Display name</label>
                <input
                  className="w-full border border-rule bg-white px-3 py-2 text-[13px] rounded focus:outline-none focus:border-signal"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div>
                <label className="lbl block mb-1">Institutional email</label>
                <input
                  className="w-full border border-rule bg-white px-3 py-2 text-[13px] rounded focus:outline-none focus:border-signal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Btn kind="signal" onClick={saveAccount}>
                Save profile
              </Btn>
            </div>
          </Panel>

          {/* Password */}
          <Panel title="Change password">
            <div className="p-4 space-y-4">
              <div>
                <label className="lbl block mb-1">Current password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    className="w-full border border-rule bg-white px-3 py-2 pr-10 text-[13px] rounded focus:outline-none focus:border-signal"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-[11px] select-none"
                  >
                    {showCurrent ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className="lbl block mb-1">New password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    className="w-full border border-rule bg-white px-3 py-2 pr-10 text-[13px] rounded focus:outline-none focus:border-signal"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-[11px] select-none"
                  >
                    {showNew ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <Btn kind="signal" onClick={changePw}>
                Update password
              </Btn>
            </div>
          </Panel>

          {/* Notifications */}
          <Panel title="Notification preferences">
            <div className="p-4 space-y-3">
              {(
                [
                  ["Grade sync alerts", notifSync, setNotifSync],
                  ["Collaboration messages", notifCollab, setNotifCollab],
                  ["Grade encoding reminders", notifGrade, setNotifGrade],
                ] as [string, boolean, (v: boolean) => void][]
              ).map(([label, val, set]) => (
                <label
                  key={label}
                  className="flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <span className="text-[13px]">{label}</span>
                  <button
                    type="button"
                    onClick={() => set(!val)}
                    aria-label={`Toggle ${label}`}
                    aria-pressed={val}
                    className={`relative w-10 h-5 rounded-full transition-colors ${val ? "bg-signal" : "bg-rule"}`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </Panel>

          {/* Security */}
          <Panel title="Security">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold">
                    Two-factor authentication
                  </div>
                  <div className="text-[11px] text-mute mt-0.5">
                    {saved2fa
                      ? "Enabled via authenticator app"
                      : "Not yet configured"}
                  </div>
                </div>
                <Btn
                  kind={saved2fa ? "line" : "signal"}
                  onClick={() => setSaved2fa((v) => !v)}
                >
                  {saved2fa ? "Disable" : "Enable"}
                </Btn>
              </div>
              <hr className="border-rule" />
              <div>
                <div className="text-[13px] font-semibold">Active sessions</div>
                <div className="mt-2 space-y-1.5">
                  {[
                    ["This device", "Chrome · now", true],
                    ["Tablet", "Firefox · 2 days ago", false],
                  ].map(([d, t, active]) => (
                    <div
                      key={String(d)}
                      className="flex items-center justify-between text-[12px]"
                    >
                      <div>
                        <span
                          className={active ? "text-signal font-semibold" : ""}
                        >
                          {d}
                        </span>
                        <span className="text-mute ml-2">{t}</span>
                      </div>
                      {!active && (
                        <button className="text-bad underline text-[11px]">
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          {saveMsg && (
            <div className="lg:col-span-2 border-l-4 border-signal bg-signal-bg p-3 text-[12px]">
              {saveMsg}
            </div>
          )}
        </div>
      )}

      {tab === "policy" && (
        <>
          <div className="mb-4 border-l-4 border-signal bg-signal-bg p-3 text-[12px]">
            Pedagoclick complies with the{" "}
            <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>{" "}
            and its Implementing Rules and Regulations. This policy applies to
            all users of the system.
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            {policyItems.map(([t, d], i) => (
              <Panel key={String(t)} className="p-4 flex gap-4">
                <span className="num text-[22px] text-signal shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="font-semibold font-serif text-[15px]">
                    {t}
                  </div>
                  <p className="text-mute mt-1 leading-relaxed">{d}</p>
                </div>
              </Panel>
            ))}
          </div>
          <div className="mt-6 p-4 border border-rule rounded text-[11px] text-mute leading-relaxed">
            <strong className="text-ink">Effectivity.</strong> This Privacy
            Policy is effective upon deployment of Pedagoclick and shall be
            reviewed annually or whenever there is a material change in data
            processing activities. Last reviewed:{" "}
            <span className="num">September 2026</span>.
          </div>
        </>
      )}
    </>
  );
}