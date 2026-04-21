import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  FilePen,
  AlertTriangle,
  BarChart3,
  SlidersHorizontal,
  CalendarRange,
  CalendarCheck2,
  GanttChartSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import { getNumeroSemaine, formatDate, addDays, JOURS_COURT, formatDateCourt, getBrique, chargerEmployes } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Calcule le nombre d'employés en poste à l'heure actuelle */
function calculerPresentsActuels(): number {
  const now = new Date();
  const jourIdx = (now.getDay() + 6) % 7; // 0=Lun … 6=Dim
  const hNow = now.getHours() * 60 + now.getMinutes();

  // Récupérer le planning de la semaine courante depuis localStorage
  const lundi = (() => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const semaine = (() => {
    const d = new Date(Date.UTC(lundi.getFullYear(), lundi.getMonth(), lundi.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  })();
  const annee = lundi.getFullYear();

  const raw = localStorage.getItem(`pfc_planning_${annee}_${semaine}`);
  if (!raw) return 0;
  try {
    const planning = JSON.parse(raw);
    const cellules: Array<{ employeId: string; jour: number; briqueCodes: string[] }> = planning.cellules || [];
    const employes = chargerEmployes();
    let count = 0;
    for (const cellule of cellules) {
      if (cellule.jour !== jourIdx) continue;
      for (const code of cellule.briqueCodes) {
        const brique = getBrique(code);
        if (!brique || brique.type !== "TRAVAIL") continue;
        const toMin = (h: string) => { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm; };
        const debut1 = toMin(brique.heureDebut);
        const fin1 = toMin(brique.heureFin);
        const debut2 = brique.heureDebut2 ? toMin(brique.heureDebut2) : null;
        const fin2 = brique.heureFin2 ? toMin(brique.heureFin2) : null;
        const present = (hNow >= debut1 && hNow < fin1) || (debut2 !== null && fin2 !== null && hNow >= debut2 && hNow < fin2);
        if (present) { count++; break; }
      }
    }
    return count;
  } catch { return 0; }
}

const NAV_ITEMS = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/planning", icon: CalendarDays, label: "Planning" },
  { path: "/gantt", icon: GanttChartSquare, label: "Gantt" },
  { path: "/couverture", icon: BarChart3, label: "Couverture" },
  { path: "/vue-semaines", icon: CalendarRange, label: "3 Semaines" },
  { path: "/rotation-mensuelle", icon: CalendarCheck2, label: "Rotation WE" },
  { path: "/employes", icon: Users, label: "Employés" },
  { path: "/historique", icon: History, label: "Historique" },
  { path: "/seuils", icon: SlidersHorizontal, label: "Seuils" },
  { path: "/parametres", icon: Settings, label: "Paramètres" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const {
    semaineCourante, semaineSuivante, semainePrecedente,
    planningActuel, sauvegarder, publier, creerAvenant,
    stats, isSaving,
  } = usePlanning();

  // Compteur en direct : employés en poste maintenant
  const [presentsActuels, setPresentsActuels] = useState(() => calculerPresentsActuels());
  useEffect(() => {
    const timer = setInterval(() => setPresentsActuels(calculerPresentsActuels()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const semaine = getNumeroSemaine(semaineCourante);
  const annee = semaineCourante.getFullYear();
  const dimanche = addDays(semaineCourante, 6);

  const statutClass = planningActuel?.statut === "PUBLIE"
    ? "badge-publie"
    : planningActuel?.statut === "AVENANT"
    ? "badge-avenant"
    : "badge-brouillon";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── SIDEBAR ── */}
      <aside
        className="flex flex-col w-[220px] min-w-[220px] h-full overflow-hidden"
        style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/91475847/kiXBo3yQ4GCyrivtiTJgXx/pfc-logo-icon-PCCkPgFZ8p9hS3HW5ANut4.webp"
            alt="PFC Logo"
            className="w-9 h-9 rounded object-cover"
          />
          <div>
            <div
              className="font-bold text-sm leading-tight"
              style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "oklch(0.95 0.01 250)" }}
            >
              PFC MARKETS
            </div>
            <div className="text-xs" style={{ color: "oklch(0.6 0.02 250)", fontFamily: "'IBM Plex Mono', monospace" }}>
              Planning Pro
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const isDashboard = path === "/";
            return (
              <Link key={path} href={path} className={cn("nav-item", location === path && "active")}>
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {isDashboard && (
                  <span
                    className="flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: presentsActuels > 0
                        ? "oklch(0.35 0.12 145)"
                        : "oklch(0.28 0.03 250)",
                      color: presentsActuels > 0
                        ? "oklch(0.92 0.08 145)"
                        : "oklch(0.55 0.03 250)",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      minWidth: 20,
                      textAlign: "center",
                      transition: "all 0.4s",
                    }}
                    title={`${presentsActuels} employé${presentsActuels > 1 ? "és" : "é"} en poste maintenant`}
                  >
                    {presentsActuels > 0 && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "oklch(0.75 0.18 145)",
                          boxShadow: "0 0 4px oklch(0.75 0.18 145)",
                          animation: "pulse 2s infinite",
                        }}
                      />
                    )}
                    {presentsActuels}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Alertes */}
        {stats.nombreAlertes > 0 && (
          <div className="mx-3 mb-3 px-3 py-2 rounded" style={{ background: "oklch(0.22 0.06 30)", border: "1px solid oklch(0.45 0.15 30)" }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: "oklch(0.75 0.15 50)" }} />
              <span className="text-xs font-semibold" style={{ color: "oklch(0.85 0.08 50)" }}>
                {stats.nombreAlertes} alerte{stats.nombreAlertes > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Version */}
        <div className="px-4 py-3 border-t border-sidebar-border">
          <div className="text-xs" style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'IBM Plex Mono', monospace" }}>
            v1.0 — PFC Markets SUD
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b bg-white"
          style={{ borderColor: "var(--border)" }}
        >
          {/* Navigation semaine */}
          <div className="flex items-center gap-3">
            <button
              onClick={semainePrecedente}
              className="p-1.5 rounded hover:bg-muted transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <div
                className="font-bold text-base leading-tight"
                style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
              >
                SEMAINE {semaine} — {annee}
              </div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {formatDate(semaineCourante)} → {formatDate(dimanche)}
              </div>
            </div>
            <button
              onClick={semaineSuivante}
              className="p-1.5 rounded hover:bg-muted transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="hidden lg:flex items-center gap-1">
            {JOURS_COURT.map((jour, i) => (
              <div
                key={jour}
                className="text-center px-2 py-1 rounded text-xs font-medium"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: i >= 5 ? "oklch(0.96 0.005 250)" : "transparent",
                  color: i >= 5 ? "var(--navy)" : "var(--muted-foreground)",
                  minWidth: 44,
                }}
              >
                <div className="font-bold">{jour}</div>
                <div style={{ fontSize: 10 }}>{formatDateCourt(addDays(semaineCourante, i))}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {planningActuel && (
              <span className={statutClass}>{planningActuel.statut}</span>
            )}
            <button
              onClick={sauvegarder}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors hover:bg-muted"
              style={{ borderColor: "var(--border)", color: "var(--navy)" }}
            >
              <Save size={14} />
              {isSaving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
            {planningActuel?.statut === "BROUILLON" && (
              <button
                onClick={publier}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded text-white transition-colors"
                style={{ background: "var(--navy)" }}
              >
                <Send size={14} />
                Publier
              </button>
            )}
            {planningActuel?.statut === "PUBLIE" && (
              <button
                onClick={creerAvenant}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors hover:bg-muted"
                style={{ borderColor: "#3B82F6", color: "#004085" }}
              >
                <FilePen size={14} />
                Avenant
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
