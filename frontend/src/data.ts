export type Role = "teacher" | "adviser" | "admin";

export const ROLES: Record<
  Role,
  { name: string; title: string; note: string }
> = {
  teacher: {
    name: "Ma. Corazon Villanueva",
    title: "Subject Teacher",
    note: "Encode grades for assigned classes and subjects only.",
  },
  adviser: {
    name: "Ramon D. Bautista",
    title: "Teacher + Class Adviser (6-Rizal)",
    note: "Advisory dashboard and report cards. Grade editing limited to own subject.",
  },
  admin: {
    name: "Lourdes Aquino",
    title: "Teacher-Support Administrator",
    note: "Manages accounts, assignments, school years and grading periods.",
  },
};

export const ASSIGNMENTS = [
  {
    id: "a1",
    cls: "Grade 6",
    section: "Rizal",
    subject: "Mathematics 6",
    students: 8,
    owner: "teacher" as Role,
  },
  {
    id: "a2",
    cls: "Grade 6",
    section: "Bonifacio",
    subject: "Mathematics 6",
    students: 8,
    owner: "teacher" as Role,
  },
  {
    id: "a3",
    cls: "Grade 5",
    section: "Mabini",
    subject: "Mathematics 5",
    students: 8,
    owner: "teacher" as Role,
  },
  {
    id: "a4",
    cls: "Grade 6",
    section: "Rizal",
    subject: "Filipino 6",
    students: 8,
    owner: "adviser" as Role,
  },
];

export type Student = { id: string; name: string };
export const STUDENTS: Student[] = [
  { id: "2026-10-0142", name: "Aguilar, Jasmine Rose" },
  { id: "2026-10-0157", name: "Bernardo, Miguel Angelo" },
  { id: "2026-10-0163", name: "Castillo, Andrea Nicole" },
  { id: "2026-10-0171", name: "Dela Cruz, John Paolo" },
  { id: "2026-10-0188", name: "Espino, Trisha Mae" },
  { id: "2026-10-0194", name: "Fernandez, Carlo Emmanuel" },
  { id: "2026-10-0205", name: "Garcia, Bianca Louise" },
  { id: "2026-10-0219", name: "Hernandez, Lance Gabriel" },
];

export type Cfg = { WW: number[]; PT: number[]; QA: number[] };
export const DEFAULT_CFG: Cfg = { WW: [20, 15, 25], PT: [30, 20], QA: [50] };
export const COMPONENTS = [
  { key: "WW", label: "Written Work", weight: 0.3 },
  { key: "PT", label: "Performance Tasks", weight: 0.5 },
  { key: "QA", label: "Quarterly Assessment", weight: 0.2 },
] as const;
export type CKey = "WW" | "PT" | "QA";
export const maxes = (cfg: Cfg) => [...cfg.WW, ...cfg.PT, ...cfg.QA];
export const total = (cfg: Cfg) => maxes(cfg).length;
export const padRow = (row: string[] | undefined, cfg: Cfg) =>
  Array.from({ length: total(cfg) }, (_, i) => row?.[i] ?? "");

export const SEED: Record<string, string[]> = {
  "2026-10-0142": ["18", "14", "22", "27", "18", "44"],
  "2026-10-0157": ["15", "11", "19", "24", "15", "36"],
  "2026-10-0163": ["20", "15", "24", "29", "19", "47"],
  "2026-10-0171": ["12", "9", "16", "21", "13", "30"],
  "2026-10-0188": ["17", "13", "20", "", "", ""],
  "2026-10-0194": ["14", "12", "18", "23", "16", "33"],
  "2026-10-0205": ["19", "14", "23", "26", "17", "41"],
  "2026-10-0219": ["", "", "", "", "", ""],
};

export function transmute(ig: number) {
  const g = ig >= 60 ? 75 + ((ig - 60) * 25) / 40 : 60 + (ig * 15) / 60;
  return Math.round(g);
}

export type Calc = {
  ps: (number | null)[];
  ws: number | null;
  final: number | null;
  complete: boolean;
};

export function compute(scores: string[] | undefined, cfg: Cfg): Calc {
  const row = padRow(scores, cfg);
  let idx = 0;
  const ps: (number | null)[] = [];
  let ws = 0;
  let complete = true;
  for (const c of COMPONENTS) {
    let got = 0;
    let max = 0;
    let filled = true;
    for (const m of cfg[c.key]) {
      const v = row[idx++];
      if (v === "") filled = false;
      else got += Number(v);
      max += m;
    }
    if (!filled) {
      complete = false;
      ps.push(null);
    } else {
      const p = (got / max) * 100;
      ps.push(p);
      ws += p * c.weight;
    }
  }
  return {
    ps,
    ws: complete ? ws : null,
    final: complete ? transmute(ws) : null,
    complete,
  };
}

export function descriptor(g: number) {
  if (g >= 90) return "Outstanding";
  if (g >= 85) return "Very Satisfactory";
  if (g >= 80) return "Satisfactory";
  if (g >= 75) return "Fairly Satisfactory";
  return "Did Not Meet";
}

export const TEACHERS = [
  {
    name: "Ma. Corazon Villanueva",
    role: "Subject Teacher",
    load: "3 classes",
    status: "Active",
  },
  {
    name: "Ramon D. Bautista",
    role: "Adviser · 6-Rizal",
    load: "2 classes",
    status: "Active",
  },
  {
    name: "Josefina P. Reyes",
    role: "Subject Teacher",
    load: "4 classes",
    status: "Active",
  },
  {
    name: "Eduardo S. Manalo",
    role: "Subject Teacher",
    load: "2 classes",
    status: "Locked",
  },
  {
    name: "Grace Anne Tolentino",
    role: "Adviser · 5-Mabini",
    load: "3 classes",
    status: "Pending",
  },
];
