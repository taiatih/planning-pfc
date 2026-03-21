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
import { usePlanning } from "@/contexts/PlanningContext";
import { getNumeroSemaine, formatDate, addDays, JOURS_COURT, formatDateCourt } from "@/lib/data";
import { cn } from "@/lib/utils";

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
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
            <Link key={path} href={path} className={cn("nav-item", location === path && "active")}>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}
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
