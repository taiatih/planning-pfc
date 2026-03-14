// PFC Planning Manager — Vue 3 Semaines Glissantes
// Semaine N-1 (passée) / N (courante) / N+1 (à venir) en lecture seule
// Permet d'anticiper les chevauchements de congés et la couverture
// ============================================================

import { useMemo } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import {
  JOURS_COURT, COULEURS_POSTE, COULEURS_ABSENCE, Poste,
  getBrique, formatDate, addDays, getNumeroSemaine,
  calculerHeuresEmploye, validerContrat,
  chargerPlannings, getLundiDeSemaine, genererPlanningVide,
} from "@/lib/data";
import { CalendarDays, AlertTriangle, CheckCircle } from "lucide-react";

const POSTES: Poste[] = ["F&L", "SEC", "FRAIS", "CAISSE"];

export default function VueSemaines() {
  const { employes, semaineCourante, plannings } = usePlanning();
  const actifs = employes.filter((e) => e.actif);

  // Calculer les 3 semaines
  const semaines = useMemo(() => {
    return [-1, 0, 1].map((offset) => {
      const lundi = addDays(semaineCourante, offset * 7);
      const semaine = getNumeroSemaine(lundi);
      const annee = lundi.getFullYear();
      const planning = plannings.find((p) => p.semaine === semaine && p.annee === annee) || null;
      return { lundi, semaine, annee, planning, offset };
    });
  }, [semaineCourante, plannings]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays size={20} style={{ color: "var(--navy)" }} />
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Vue 3 semaines glissantes
          </h1>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Anticipez les chevauchements de congés et la couverture globale
          </p>
        </div>
      </div>

      {semaines.map(({ lundi, semaine, annee, planning, offset }) => {
        const dimanche = addDays(lundi, 6);
        const label = offset === -1 ? "Semaine précédente" : offset === 0 ? "Semaine courante" : "Semaine suivante";
        const isCurrentWeek = offset === 0;
        const isPast = offset === -1;

        // Calculer la couverture par jour pour cette semaine
        const couvertureParJour = JOURS_COURT.map((jour, jourIdx) => {
          const parPoste: Record<Poste, number> = { "F&L": 0, SEC: 0, FRAIS: 0, CAISSE: 0 };
          let total = 0;
          let absences = 0;
          if (planning) {
            planning.cellules
              .filter((c) => c.jour === jourIdx)
              .forEach((c) => {
                const b = getBrique(c.brique);
                if (b && b.type === "TRAVAIL" && c.poste) {
                  parPoste[c.poste]++;
                  total++;
                } else if (b && b.type === "ABSENCE" && b.code !== "REPOS") {
                  absences++;
                }
              });
          }
          return { jour, jourIdx, total, parPoste, absences };
        });

        // Alertes contrats
        const alertesContrats = planning
          ? actifs.filter((emp) => {
              const heures = calculerHeuresEmploye(emp.id, planning.cellules);
              const aTravaille = planning.cellules.some((c) => {
                if (c.employeId !== emp.id) return false;
                const b = getBrique(c.brique);
                return b && b.type === "TRAVAIL";
              });
              if (!aTravaille) return false;
              return !validerContrat(emp, heures).ok;
            })
          : [];

        return (
          <div
            key={`${annee}-S${semaine}`}
            className="bg-white border rounded overflow-hidden"
            style={{
              borderColor: isCurrentWeek ? "var(--navy)" : "var(--border)",
              borderWidth: isCurrentWeek ? 2 : 1,
            }}
          >
            {/* En-tête semaine */}
            <div
              className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2"
              style={{
                borderColor: isCurrentWeek ? "var(--navy)" : "var(--border)",
                background: isCurrentWeek
                  ? "var(--navy)"
                  : isPast
                  ? "oklch(0.93 0.003 250)"
                  : "oklch(0.97 0.002 250)",
              }}
            >
              <div className="flex items-center gap-3">
                <div>
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{
                      fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                      color: isCurrentWeek ? "oklch(0.7 0.02 250)" : "var(--muted-foreground)",
                    }}
                  >
                    {label}
                  </span>
                  <div
                    className="font-bold text-base"
                    style={{
                      fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                      color: isCurrentWeek ? "white" : "var(--navy)",
                    }}
                  >
                    SEMAINE {semaine} — {annee}
                  </div>
                  <div
                    className="text-xs"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: isCurrentWeek ? "oklch(0.75 0.02 250)" : "var(--muted-foreground)",
                    }}
                  >
                    {formatDate(lundi)} → {formatDate(dimanche)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {planning ? (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold"
                    style={{
                      background: planning.statut === "PUBLIE" ? "#D4EDDA" : planning.statut === "AVENANT" ? "#D0E8F5" : "#FFF3CD",
                      color: planning.statut === "PUBLIE" ? "#155724" : planning.statut === "AVENANT" ? "#0A3D62" : "#856404",
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {planning.statut}
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold"
                    style={{ background: "#F0F0F0", color: "#6C757D", fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    NON CRÉÉ
                  </span>
                )}
                {alertesContrats.length > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle size={13} style={{ color: isCurrentWeek ? "#FFC107" : "#856404" }} />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: isCurrentWeek ? "#FFC107" : "#856404", fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {alertesContrats.length} alerte{alertesContrats.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {planning && alertesContrats.length === 0 && (
                  <div className="flex items-center gap-1">
                    <CheckCircle size={13} style={{ color: isCurrentWeek ? "#6FCF97" : "#28A745" }} />
                    <span
                      className="text-xs"
                      style={{ color: isCurrentWeek ? "#6FCF97" : "#28A745", fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      OK
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Couverture par jour */}
            <div className="grid grid-cols-7 divide-x" style={{ borderColor: "var(--border)" }}>
              {couvertureParJour.map(({ jour, jourIdx, total, parPoste, absences }) => {
                const dateJour = addDays(lundi, jourIdx);
                const isWeekend = jourIdx >= 5;
                return (
                  <div
                    key={jour}
                    className="p-2 text-center"
                    style={{ background: isWeekend ? "oklch(0.96 0.003 250)" : "transparent" }}
                  >
                    <div
                      className="text-xs font-bold mb-0.5"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)" }}
                    >
                      {jour}
                    </div>
                    <div
                      className="text-xs mb-2"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)", fontSize: 9 }}
                    >
                      {dateJour.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </div>
                    {/* Effectif total */}
                    <div
                      className="text-lg font-bold mb-1"
                      style={{
                        fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                        color: total === 0 ? "var(--muted-foreground)" : "var(--navy)",
                      }}
                    >
                      {total > 0 ? total : "—"}
                    </div>
                    {/* Répartition par poste */}
                    <div className="space-y-0.5">
                      {POSTES.map((p) => {
                        const count = parPoste[p];
                        if (count === 0) return null;
                        const c = COULEURS_POSTE[p];
                        return (
                          <div
                            key={p}
                            className="flex items-center justify-between px-1 rounded"
                            style={{ background: c.bg }}
                          >
                            <span style={{ fontSize: 8, color: c.text, fontFamily: "'IBM Plex Mono', monospace" }}>{p}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: c.text, fontFamily: "'IBM Plex Mono', monospace" }}>{count}</span>
                          </div>
                        );
                      })}
                      {absences > 0 && (
                        <div
                          className="flex items-center justify-between px-1 rounded"
                          style={{ background: "#FFE5CC" }}
                        >
                          <span style={{ fontSize: 8, color: "#7D3C00", fontFamily: "'IBM Plex Mono', monospace" }}>ABS</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#7D3C00", fontFamily: "'IBM Plex Mono', monospace" }}>{absences}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Résumé employés avec absences */}
            {planning && (
              <div
                className="border-t px-4 py-2 flex flex-wrap gap-1.5"
                style={{ borderColor: "var(--border)", background: "oklch(0.985 0.001 250)" }}
              >
                {actifs.map((emp) => {
                  // Trouver les absences de cet employé
                  const absences = planning.cellules.filter((c) => {
                    if (c.employeId !== emp.id) return false;
                    const b = getBrique(c.brique);
                    return b && b.type === "ABSENCE" && b.code !== "REPOS";
                  });
                  const heures = calculerHeuresEmploye(emp.id, planning.cellules);
                  const aTravaille = planning.cellules.some((c) => {
                    if (c.employeId !== emp.id) return false;
                    const b = getBrique(c.brique);
                    return b && b.type === "TRAVAIL";
                  });

                  if (absences.length === 0 && !aTravaille) return null;

                  const c = COULEURS_POSTE[emp.postePrincipal];
                  const validation = aTravaille ? validerContrat(emp, heures) : null;

                  return (
                    <div
                      key={emp.id}
                      className="flex items-center gap-1 px-2 py-0.5 rounded"
                      style={{
                        background: absences.length > 0 ? "#FFE5CC" : c.bg,
                        border: `1px solid ${absences.length > 0 ? "#E07B39" : c.border}`,
                      }}
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: absences.length > 0 ? "#7D3C00" : c.text,
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10,
                        }}
                      >
                        {emp.nom}
                      </span>
                      {absences.length > 0 && (
                        <span className="text-xs" style={{ color: "#7D3C00", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9 }}>
                          ({absences.map((a) => a.brique).join(", ")})
                        </span>
                      )}
                      {aTravaille && validation && !validation.ok && (
                        <AlertTriangle size={10} style={{ color: "#856404" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
