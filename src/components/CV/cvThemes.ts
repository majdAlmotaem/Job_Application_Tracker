export interface AccentColor {
  key: string;
  label: string;
  class: string;
}

export const ACCENT_COLORS: AccentColor[] = [
  { key: "slate", label: "Schiefergrau", class: "bg-slate-500" },
  { key: "blue", label: "Königsblau", class: "bg-blue-600" },
  { key: "emerald", label: "Smaragdgrün", class: "bg-emerald-600" },
  { key: "indigo", label: "Königsindigo", class: "bg-indigo-600" },
  { key: "violet", label: "Violett", class: "bg-violet-600" },
  { key: "amber", label: "Ambergold", class: "bg-amber-500" },
];

export interface FontOption {
  value: string;
  label: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { value: "sans", label: "Sans-Serif (Modern & Clean)" },
  { value: "serif", label: "Serif (Klassisch & Elegant)" },
  { value: "mono", label: "Monospace (Technisch & Minimalistisch)" },
];
