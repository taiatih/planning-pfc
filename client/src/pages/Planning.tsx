import { usePlanning } from "@/contexts/PlanningContext";
import {
  JOURS_LONG, JOURS_COURT, formatDateCourt, addDays,
  calculerHeuresEmploye, validerContrat, COULEURS_POSTE,
  getBrique, Poste,
} from "@/lib/data";
import PlanningCell from "@/components/PlanningCell";
import { Info } from "lucide-react";

const POSTES_LEGENDE: { poste: Poste; label: string }[] = [
  { poste: "F&L", label: "Fruits & Légumes" },
  { poste: "SEC", label: "Rayon Sec" },
  { poste: "FRAIS", label: "Rayon Frais" },
  { poste: "CAISSE", label: "Caisse" },
];

export default function Planning() {
  const { employes, planningActuel, semaineCourante, stats } = usePlanning();
  const actifs = employes.filter((e) => e.actif);

  return (
    <div className="flex flex-col h-full">
      {/* ── Barre de légende ── */}
      <div
        className="flex items-center gap-4 px-4 py-2 border-b bg-white flex-shrink-0 flex-wrap"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="text-xs font-bold uppercase tracking-wider flex-shrink-0"
          style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
        >
          Légende
        </span>
        {POSTES_LEGENDE.map(({ poste, label }) => {
          const c = COULEURS_POSTE[poste];
          return (
            <div key={poste} className="flex items-center gap-1.5 flex-shrink-0">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: c.bg, border: `2px solid ${c.border}` }}
              />
              <span className="text-xs font-semibold" style={{ color: c.text, fontFamily: "'IBM Plex Mono', monospace" }}>
                {poste}
              </span>
              <span className="text-xs hidden lg:inline" style={{ color: "var(--muted-foreground)" }}>
                — {label}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#F0F0F0", border: "1px solid #ADB5BD" }} />
          <span className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#6C757D" }}>REPOS</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#FFE5CC", border: "1px solid #E07B39" }} />
          <span className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#7D3C00" }}>ABSENCE</span>
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Info size={12} />
          <span className="hidden md:inline">Cliquez sur une cellule pour modifier</span>
        </div>
      </div>

      {/* ── Tableau principal ── */}
      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-x-auto">
          <table className="planning-table" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th className="text-left" style={{ minWidth: 140, width: 140 }}>Employé</th>
                <th style={{ minWidth: 60, width: 60 }}>Contrat</th>
                {JOURS_LONG.map((jour, i) => (
                  <th key={jour} style={{ minWidth: 110 }}>
                    <div>{JOURS_COURT[i]}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 400, opacity: 0.75 }}>
                      {formatDateCourt(addDays(semaineCourante, i))}
                    </div>
                  </th>
                ))}
                <th style={{ minWidth: 60 }}>Total</th>
                <th style={{ minWidth: 70 }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {actifs.map((emp, idx) => {
                const heures = planningActuel
                  ? calculerHeuresEmploye(emp.id, planningActuel.cellules)
                  : 0;
                const validation = validerContrat(emp, heures);
                const c = COULEURS_POSTE[emp.postePrincipal];

                return (
                  <tr key={emp.id} style={{ background: idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}>
                    {/* Nom */}
                    <td className="px-3 py-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c.border }}
                        />
                        <div>
                          <div className="font-semibold text-xs" style={{ color: "var(--navy)" }}>
                            {emp.nom}
                          </div>
                          {emp.contrainte && (
                            <div className="text-xs opacity-50" style={{ fontSize: 10 }}>{emp.contrainte}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contrat */}
                    <td className="text-center">
                      <div
                        className="text-xs"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}
                      >
                        {emp.heuresHebdo}h
                      </div>
                      <div
                        className="text-xs opacity-60"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9 }}
                      >
                        {emp.typeContrat}
                      </div>
                    </td>

                    {/* Cellules de planning */}
                    {Array.from({ length: 7 }, (_, jourIdx) => {
                      const cellule = planningActuel?.cellules.find(
                        (cel) => cel.employeId === emp.id && cel.jour === jourIdx
                      );
                      return (
                        <td key={jourIdx} style={{ padding: 0 }}>
                          <PlanningCell
                            employeId={emp.id}
                            jour={jourIdx}
                            brique={cellule?.brique || "REPOS"}
                            poste={cellule?.poste}
                            employe={emp}
                          />
                        </td>
                      );
                    })}

                    {/* Total heures */}
                    <td className="text-center">
                      <div
                        className="font-bold text-xs"
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: heures === 0
                            ? "var(--muted-foreground)"
                            : validation.ok
                            ? "#155724"
                            : "#7D3C00",
                        }}
                      >
                        {heures > 0 ? `${heures}h` : "—"}
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="text-center px-2">
                      {heures === 0 ? (
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                          —
                        </span>
                      ) : validation.ok ? (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "#155724", fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                          ✓ OK
                        </span>
                      ) : (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "#7D3C00", fontFamily: "'IBM Plex Mono', monospace" }}
                          title={validation.message}
                        >
                          ⚠ {heures}h
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer totaux par jour */}
            <tfoot>
              <tr style={{ background: "var(--navy)" }}>
                <td
                  colSpan={2}
                  className="px-3 py-2 text-xs font-bold text-white uppercase tracking-wide"
                  style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}
                >
                  Couverture
                </td>
                {stats.couvertureParJour.map((d, i) => (
                  <td key={i} className="text-center py-2">
                    <div className="text-white font-bold text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {d.total} pers.
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(255,255,255,0.65)", fontSize: 9, lineHeight: 1.4 }}>
                      {(["F&L", "SEC", "FRAIS", "CAISSE"] as Poste[]).map((p) =>
                        d.parPoste[p] > 0 ? (
                          <span key={p} style={{ marginRight: 2 }}>
                            {p.replace("&", "")}:{d.parPoste[p]}
                          </span>
                        ) : null
                      )}
                    </div>
                  </td>
                ))}
                <td className="text-center py-2">
                  <div className="text-white font-bold text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {stats.totalHeuresPlanifiees}h
                  </div>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
