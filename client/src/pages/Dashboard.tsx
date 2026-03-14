import { usePlanning } from "@/contexts/PlanningContext";
import {
  JOURS_COURT, COULEURS_POSTE, Poste,
  calculerHeuresEmploye, validerContrat, compterJoursTravailles, compterJoursRepos,
  getBrique, formatDate, addDays, getNumeroSemaine,
} from "@/lib/data";
import { AlertTriangle, CheckCircle, Users, Clock, TrendingUp, CalendarCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const POSTES: Poste[] = ["F&L", "SEC", "FRAIS", "CAISSE"];

export default function Dashboard() {
  const { employes, planningActuel, stats, semaineCourante, plannings } = usePlanning();

  const semaine = getNumeroSemaine(semaineCourante);
  const annee = semaineCourante.getFullYear();

  const actifs = employes.filter((e) => e.actif);

  // Données pour le graphique de couverture
  const couvertureData = stats.couvertureParJour.map((d, i) => ({
    jour: d.jour,
    date: formatDate(addDays(semaineCourante, i)).slice(0, 5),
    total: d.total,
    "F&L": d.parPoste["F&L"],
    SEC: d.parPoste["SEC"],
    FRAIS: d.parPoste["FRAIS"],
    CAISSE: d.parPoste["CAISSE"],
  }));

  return (
    <div className="p-6 space-y-6">
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} style={{ color: "var(--navy)" }} />
            <span className="kpi-label">Équipe active</span>
          </div>
          <div className="kpi-value">{stats.totalEmployesActifs}</div>
          <div className="text-xs text-muted-foreground">employés planifiés</div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} style={{ color: "var(--navy)" }} />
            <span className="kpi-label">Heures planifiées</span>
          </div>
          <div className="kpi-value">{stats.totalHeuresPlanifiees.toFixed(1)}h</div>
          <div className="text-xs text-muted-foreground">semaine {semaine}</div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} style={{ color: stats.conformiteContrats >= 80 ? "#28A745" : "#E07B39" }} />
            <span className="kpi-label">Conformité</span>
          </div>
          <div className="kpi-value" style={{ color: stats.conformiteContrats >= 80 ? "#155724" : "#7D3C00" }}>
            {stats.conformiteContrats}%
          </div>
          <div className="text-xs text-muted-foreground">contrats respectés</div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            {stats.nombreAlertes > 0
              ? <AlertTriangle size={16} style={{ color: "#E07B39" }} />
              : <CheckCircle size={16} style={{ color: "#28A745" }} />
            }
            <span className="kpi-label">Alertes</span>
          </div>
          <div className="kpi-value" style={{ color: stats.nombreAlertes > 0 ? "#7D3C00" : "#155724" }}>
            {stats.nombreAlertes}
          </div>
          <div className="text-xs text-muted-foreground">
            {stats.nombreAlertes === 0 ? "Tout est OK ✓" : "à corriger"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Couverture par jour ── */}
        <div className="lg:col-span-2 bg-white border rounded p-4" style={{ borderColor: "var(--border)" }}>
          <h2
            className="text-sm font-bold uppercase tracking-wider mb-4"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Couverture par jour — Semaine {semaine}
          </h2>
          {stats.totalHeuresPlanifiees > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={couvertureData} barSize={18} barGap={2}>
                <XAxis
                  dataKey="jour"
                  tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={20}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", border: "1px solid var(--border)" }}
                  formatter={(val, name) => [`${val} pers.`, name]}
                />
                <Bar dataKey="F&L" stackId="a" fill="#28A745" />
                <Bar dataKey="SEC" stackId="a" fill="#1ABC9C" />
                <Bar dataKey="FRAIS" stackId="a" fill="#2980B9" />
                <Bar dataKey="CAISSE" stackId="a" fill="#FFC107" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Aucun planning rempli pour cette semaine
            </div>
          )}
          {/* Légende */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {POSTES.map((p) => {
              const c = COULEURS_POSTE[p];
              return (
                <div key={p} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: c.border }} />
                  <span className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: c.text }}>
                    {p}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Alertes ── */}
        <div className="bg-white border rounded p-4" style={{ borderColor: "var(--border)" }}>
          <h2
            className="text-sm font-bold uppercase tracking-wider mb-4"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Alertes & Anomalies
          </h2>
          {stats.alertes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <CheckCircle size={32} style={{ color: "#28A745" }} />
              <span className="text-sm text-muted-foreground">Aucune alerte</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {stats.alertes.map((a, i) => (
                <div
                  key={i}
                  className="px-3 py-2 rounded text-xs"
                  style={{
                    background: a.type === "REPOS" ? "#FFE5CC" : "#FFF3CD",
                    color: a.type === "REPOS" ? "#7D3C00" : "#856404",
                    border: `1px solid ${a.type === "REPOS" ? "#E07B39" : "#FFC107"}`,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  <div className="font-semibold">{a.nom}</div>
                  <div className="opacity-80">{a.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Récapitulatif employés ── */}
      <div className="bg-white border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)", background: "oklch(0.97 0.002 250)" }}
        >
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Récapitulatif Employés — Semaine {semaine}
          </h2>
          <span
            className="text-xs"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}
          >
            {actifs.length} actifs
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "oklch(0.95 0.003 250)" }}>
                <th className="text-left px-4 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Employé
                </th>
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Contrat
                </th>
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Poste
                </th>
                {JOURS_COURT.map((j) => (
                  <th key={j} className="text-center px-2 py-2 font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)", minWidth: 36 }}>
                    {j}
                  </th>
                ))}
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Total
                </th>
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {actifs.map((emp, idx) => {
                const heures = planningActuel
                  ? calculerHeuresEmploye(emp.id, planningActuel.cellules)
                  : 0;
                const validation = validerContrat(emp, heures);
                const joursRepos = planningActuel
                  ? compterJoursRepos(emp.id, planningActuel.cellules)
                  : 0;
                const c = COULEURS_POSTE[emp.postePrincipal];

                return (
                  <tr
                    key={emp.id}
                    style={{ background: idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}
                  >
                    <td className="px-4 py-2 font-semibold" style={{ color: "var(--navy)" }}>
                      {emp.nom}
                      {emp.contrainte && (
                        <div className="text-xs font-normal opacity-60">{emp.contrainte}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}>
                      {emp.typeContrat} {emp.heuresHebdo}h
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-semibold"
                        style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {emp.postePrincipal}
                      </span>
                    </td>
                    {JOURS_COURT.map((_, jourIdx) => {
                      const cellule = planningActuel?.cellules.find(
                        (c) => c.employeId === emp.id && c.jour === jourIdx
                      );
                      const b = cellule ? getBrique(cellule.brique) : null;
                      const isRepos = !b || b.code === "REPOS";
                      const isAbsence = b && b.type === "ABSENCE" && b.code !== "REPOS";
                      const posteCellule = cellule?.poste;
                      const couleur = posteCellule
                        ? COULEURS_POSTE[posteCellule]
                        : isAbsence
                        ? { bg: "#FFE5CC", text: "#7D3C00", border: "#E07B39" }
                        : { bg: "#F0F0F0", text: "#6C757D", border: "#ADB5BD" };

                      return (
                        <td key={jourIdx} className="px-1 py-1 text-center">
                          <div
                            className="rounded text-center py-0.5 px-1"
                            style={{
                              backgroundColor: couleur.bg,
                              color: couleur.text,
                              fontSize: 9,
                              fontFamily: "'IBM Plex Mono', monospace",
                              minWidth: 28,
                            }}
                          >
                            {isRepos ? "—" : isAbsence ? b!.code.slice(0, 3) : b ? `${b.duree}h` : "—"}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)" }}>
                      {heures > 0 ? `${heures}h` : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {heures === 0 ? (
                        <span className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace" }}>À remplir</span>
                      ) : validation.ok ? (
                        <span className="text-xs font-semibold" style={{ color: "#155724", fontFamily: "'IBM Plex Mono', monospace" }}>✓ OK</span>
                      ) : (
                        <span className="text-xs font-semibold" style={{ color: "#7D3C00", fontFamily: "'IBM Plex Mono', monospace" }}>⚠ {heures}h/{emp.heuresHebdo}h</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
