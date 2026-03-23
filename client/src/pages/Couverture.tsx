// PFC Planning Manager — Page Couverture Horaire
// Vue heure par heure (tranches 30 min) de qui est en poste
// Alerte rouge si sous le seuil minimum par secteur
// ============================================================

import { useState, useMemo } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import {
  JOURS_LONG, JOURS_COURT, COULEURS_POSTE, Poste,
  calculerCouvertureHoraire, verifierSousEffectif, chargerSeuils,
  addDays, formatDateCourt,
} from "@/lib/data";
import { AlertTriangle, CheckCircle, Users, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const POSTES_FILTRES: { value: Poste | "TOUS"; label: string }[] = [
  { value: "TOUS", label: "Tous les postes" },
  { value: "F&L", label: "Fruits & Légumes" },
  { value: "SEC", label: "Rayon Sec" },
  { value: "FRAIS", label: "Rayon Frais" },
  { value: "CAISSE", label: "Caisse" },
];

const POSTES: Poste[] = ["F&L", "SEC", "FRAIS", "CAISSE"];

// Heures "critiques" à surveiller (midi)
const HEURES_CRITIQUES = ["12:00", "12:30", "13:00", "13:30"];

export default function Couverture() {
  const { planningActuel, employes, semaineCourante } = usePlanning();
  const [jourSelectionne, setJourSelectionne] = useState(0);
  const [expandedTranche, setExpandedTranche] = useState<string | null>(null);
  const [filtrePoste, setFiltrePoste] = useState<Poste | "TOUS">("TOUS");
  const seuils = useMemo(() => chargerSeuils(), []);

  const actifs = employes.filter((e) => e.actif);

  const tranches = useMemo(() => {
    if (!planningActuel) return [];
    return calculerCouvertureHoraire(jourSelectionne, planningActuel.cellules, actifs);
  }, [planningActuel, jourSelectionne, actifs]);

  // Résumé des alertes du jour
  const alertesDuJour = useMemo(() => {
    const all: { heure: string; poste: Poste; actuel: number; minimum: number; label: string }[] = [];
    tranches.forEach((t) => {
      const a = verifierSousEffectif(t, seuils);
      a.forEach((al) => all.push({ heure: t.heure, ...al }));
    });
    // Dédupliquer par label (ne garder que la première occurrence)
    const seen = new Set<string>();
    return all.filter((a) => {
      const key = a.label;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [tranches, seuils]);

  // Stats résumé par poste pour le jour
  const statsJour = useMemo(() => {
    return POSTES.map((poste) => {
      const max = Math.max(...tranches.map((t) => t.parPoste[poste]), 0);
      const min = Math.min(...tranches.filter((t) => t.total > 0).map((t) => t.parPoste[poste]), Infinity);
      return { poste, max, min: min === Infinity ? 0 : min };
    });
  }, [tranches]);

  const dateJour = addDays(semaineCourante, jourSelectionne);

  return (
    <div className="p-6 space-y-5">
      {/* ── Sélecteur de jour ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {JOURS_COURT.map((j, i) => {
          const d = addDays(semaineCourante, i);
          const isSelected = jourSelectionne === i;
          // Compter les alertes de ce jour
          const tranchesJour = planningActuel
            ? calculerCouvertureHoraire(i, planningActuel.cellules, actifs)
            : [];
          const nbAlertes = tranchesJour.reduce((acc, t) => {
            return acc + verifierSousEffectif(t, seuils).length;
          }, 0);
          // Dédupliquer
          const alertesUniques = new Set<string>();
          tranchesJour.forEach((t) => {
            verifierSousEffectif(t, seuils).forEach((a) => alertesUniques.add(a.label));
          });

          return (
            <button
              key={j}
              onClick={() => setJourSelectionne(i)}
              className={cn(
                "relative flex flex-col items-center px-4 py-2.5 rounded border text-xs font-semibold transition-all",
                isSelected
                  ? "text-white border-transparent"
                  : "bg-white hover:bg-muted border-border text-navy"
              )}
              style={isSelected ? { background: "var(--navy)", borderColor: "var(--navy)" } : {}}
            >
              <span style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", fontSize: 13 }}>{j}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, opacity: 0.75 }}>
                {formatDateCourt(d)}
              </span>
              {alertesUniques.size > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
                  style={{ background: "#DC3545", fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {alertesUniques.size}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Barre de filtres par poste ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-xs font-bold uppercase tracking-wider flex-shrink-0"
          style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--muted-foreground)" }}
        >
          Secteur
        </span>
        {POSTES_FILTRES.map(({ value, label }) => {
          const isActive = filtrePoste === value;
          const c = value !== "TOUS" ? COULEURS_POSTE[value as Poste] : null;
          // Compter les alertes du poste pour le jour sélectionné
          const nbAlertes = value !== "TOUS"
            ? tranches.reduce((acc, t) => {
                const a = verifierSousEffectif(t, seuils).filter((al) => al.poste === value);
                return acc + a.length;
              }, 0)
            : tranches.reduce((acc, t) => acc + verifierSousEffectif(t, seuils).length, 0);
          return (
            <button
              key={value}
              onClick={() => setFiltrePoste(value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={{
                background: isActive
                  ? (c ? c.bg : "var(--navy)")
                  : "white",
                color: isActive
                  ? (c ? c.text : "white")
                  : "var(--muted-foreground)",
                border: isActive
                  ? `2px solid ${c ? c.border : "var(--navy)"}`
                  : "2px solid var(--border)",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {value === "TOUS" ? "Tous" : value}
              {nbAlertes > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5"
                  style={{
                    fontSize: 9,
                    background: "#DC3545",
                    color: "white",
                  }}
                >
                  {nbAlertes}
                </span>
              )}
            </button>
          );
        })}
        {filtrePoste !== "TOUS" && (
          <span
            className="text-xs ml-1"
            style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace" }}
          >
            — vue filtrée sur {filtrePoste}
          </span>
        )}
      </div>

      {/* ── Résumé alertes du jour ── */}
      {(() => {
        const alertesFiltrees = filtrePoste === "TOUS"
          ? alertesDuJour
          : alertesDuJour.filter((a) => a.poste === filtrePoste);
        return alertesFiltrees.length > 0 ? (
          <div
            className="rounded border px-4 py-3 flex flex-wrap gap-2 items-center"
            style={{ background: "#FFF3CD", borderColor: "#FFC107" }}
          >
            <AlertTriangle size={16} style={{ color: "#856404" }} />
            <span className="text-xs font-bold" style={{ color: "#856404", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
              {alertesFiltrees.length} sous-effectif{alertesFiltrees.length > 1 ? "s" : ""}
              {filtrePoste !== "TOUS" ? ` sur ${filtrePoste}` : ""}
              {" "}— {JOURS_LONG[jourSelectionne]} {formatDateCourt(dateJour)}
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1 w-full">
              {alertesFiltrees.map((a, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    background: COULEURS_POSTE[a.poste].bg,
                    color: COULEURS_POSTE[a.poste].text,
                    border: `1px solid ${COULEURS_POSTE[a.poste].border}`,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {a.label} — {a.actuel}/{a.minimum} pers.
                </span>
              ))}
            </div>
          </div>
        ) : null;
      })()}
      {alertesDuJour.length === 0 && tranches.some((t) => t.total > 0) && (
        <div
          className="rounded border px-4 py-3 flex items-center gap-2"
          style={{ background: "#D4EDDA", borderColor: "#28A745" }}
        >
          <CheckCircle size={16} style={{ color: "#155724" }} />
          <span className="text-xs font-semibold" style={{ color: "#155724", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
            Couverture conforme aux seuils — {JOURS_LONG[jourSelectionne]} {formatDateCourt(dateJour)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* ── Tableau couverture horaire ── */}
        <div className="xl:col-span-3 bg-white border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)", background: "oklch(0.97 0.002 250)" }}
          >
            <h2
              className="text-sm font-bold uppercase tracking-wider"
              style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
            >
              Couverture heure par heure — {JOURS_LONG[jourSelectionne]} {formatDateCourt(dateJour)}
            </h2>
            <div className="flex items-center gap-3">
              {POSTES.map((p) => {
                const c = COULEURS_POSTE[p];
                return (
                  <div key={p} className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.border }} />
                    <span className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: c.text, fontSize: 10 }}>{p}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {tranches.length === 0 || !tranches.some((t) => t.total > 0) ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Aucun créneau planifié pour ce jour
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: "oklch(0.95 0.003 250)" }}>
                    <th
                      className="text-left px-3 py-2 font-semibold uppercase tracking-wide border-r"
                      style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)", borderColor: "var(--border)", width: 64 }}
                    >
                      Heure
                    </th>
                    {POSTES.map((p) => {
                      const isFiltered = filtrePoste !== "TOUS" && filtrePoste !== p;
                      const isHighlighted = filtrePoste === p;
                      const c = COULEURS_POSTE[p];
                      return (
                        <th
                          key={p}
                          className="text-center px-2 py-2 font-semibold uppercase tracking-wide border-r"
                          style={{
                            fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                            color: isFiltered ? "var(--muted-foreground)" : c.text,
                            borderColor: "var(--border)",
                            minWidth: 80,
                            opacity: isFiltered ? 0.35 : 1,
                            background: isHighlighted ? c.bg : undefined,
                            transition: "all 0.2s",
                          }}
                        >
                          {p}
                          {isHighlighted && (
                            <div
                              className="mt-0.5 h-0.5 rounded-full"
                              style={{ background: c.border }}
                            />
                          )}
                        </th>
                      );
                    })}
                    <th
                      className="text-center px-2 py-2 font-semibold uppercase tracking-wide"
                      style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)", minWidth: 60 }}
                    >
                      Total
                    </th>
                    <th className="px-2 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {tranches.map((tranche, idx) => {
                    const alertes = verifierSousEffectif(tranche, seuils);
                    const isCritique = HEURES_CRITIQUES.includes(tranche.heure);
                    const isSousEffectif = alertes.length > 0;
                    const isExpanded = expandedTranche === tranche.heure;
                    const isHalfHour = tranche.heure.endsWith(":30");

                    return (
                      <>
                        <tr
                          key={tranche.heure}
                          className="cursor-pointer hover:bg-muted/30 transition-colors"
                          style={{
                            background: isSousEffectif
                              ? "#FFF8E1"
                              : isCritique
                              ? "oklch(0.985 0.003 250)"
                              : idx % 2 === 0 ? "white" : "oklch(0.99 0.001 250)",
                            borderTop: !isHalfHour ? "1px solid var(--border)" : undefined,
                          }}
                          onClick={() => setExpandedTranche(isExpanded ? null : tranche.heure)}
                        >
                          <td
                            className="px-3 py-1.5 font-bold border-r"
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              color: isSousEffectif ? "#856404" : isCritique ? "var(--navy)" : "var(--muted-foreground)",
                              borderColor: "var(--border)",
                              fontSize: isHalfHour ? 10 : 11,
                            }}
                          >
                            {tranche.heure}
                            {isCritique && (
                              <span className="ml-1 text-xs" style={{ color: "#856404", fontSize: 8 }}>MIDI</span>
                            )}
                          </td>
                          {POSTES.map((poste) => {
                            const count = tranche.parPoste[poste];
                            const alerte = alertes.find((a) => a.poste === poste);
                            const c = COULEURS_POSTE[poste];
                            const isFiltered = filtrePoste !== "TOUS" && filtrePoste !== poste;
                            return (
                              <td key={poste} className="px-2 py-1.5 text-center border-r" style={{ borderColor: "var(--border)", opacity: isFiltered ? 0.25 : 1, transition: "opacity 0.2s" }}>
                                {count > 0 ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <span
                                      className="inline-flex items-center justify-center w-6 h-5 rounded font-bold"
                                      style={{
                                        background: alerte ? "#FFF3CD" : c.bg,
                                        color: alerte ? "#856404" : c.text,
                                        border: `1px solid ${alerte ? "#FFC107" : c.border}`,
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        fontSize: 11,
                                      }}
                                    >
                                      {count}
                                    </span>
                                    {alerte && (
                                      <AlertTriangle size={10} style={{ color: "#856404" }} />
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: "var(--muted-foreground)", fontSize: 10 }}>—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 text-center">
                            {tranche.total > 0 ? (
                              <span
                                className="inline-flex items-center justify-center w-7 h-5 rounded font-bold"
                                style={{
                                  background: isSousEffectif ? "#FFF3CD" : "oklch(0.92 0.01 250)",
                                  color: isSousEffectif ? "#856404" : "var(--navy)",
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: 11,
                                }}
                              >
                                {tranche.total}
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted-foreground)", fontSize: 10 }}>—</span>
                            )}
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            {tranche.total > 0 && (
                              isExpanded
                                ? <ChevronUp size={12} style={{ color: "var(--muted-foreground)" }} />
                                : <ChevronDown size={12} style={{ color: "var(--muted-foreground)" }} />
                            )}
                          </td>
                        </tr>
                        {/* Détail des présences */}
                        {isExpanded && tranche.presences.length > 0 && (
                          <tr key={`${tranche.heure}-detail`} style={{ background: "oklch(0.97 0.003 250)" }}>
                            <td colSpan={7} className="px-4 py-2 border-t" style={{ borderColor: "var(--border)" }}>
                              <div className="flex flex-wrap gap-1.5">
                                {tranche.presences.map((p) => {
                                  const c = COULEURS_POSTE[p.poste];
                                  return (
                                    <span
                                      key={p.employeId}
                                      className="px-2 py-0.5 rounded text-xs font-semibold"
                                      style={{
                                        background: c.bg,
                                        color: c.text,
                                        border: `1px solid ${c.border}`,
                                        fontFamily: "'IBM Plex Mono', monospace",
                                      }}
                                    >
                                      {p.nom} <span className="opacity-60">({p.poste})</span>
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Panneau résumé par poste ── */}
        <div className="space-y-4">
          <div className="bg-white border rounded p-4" style={{ borderColor: "var(--border)" }}>
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
            >
              Effectif max / min du jour
            </h3>
            <div className="space-y-3">
              {statsJour.map(({ poste, max, min }) => {
                const c = COULEURS_POSTE[poste];
                return (
                  <div key={poste} className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: "'IBM Plex Mono', monospace", minWidth: 52 }}
                    >
                      {poste}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        <span style={{ color: "var(--muted-foreground)" }}>min</span>
                        <span style={{ color: min === 0 ? "#DC3545" : "#155724", fontWeight: 700 }}>{min}</span>
                      </div>
                      <div className="flex justify-between text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        <span style={{ color: "var(--muted-foreground)" }}>max</span>
                        <span style={{ color: "var(--navy)", fontWeight: 700 }}>{max}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Légende */}
          <div className="bg-white border rounded p-4" style={{ borderColor: "var(--border)" }}>
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
            >
              Légende
            </h3>
            <div className="space-y-2 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ background: "#FFF8E1", border: "1px solid #FFC107" }} />
                <span style={{ color: "var(--muted-foreground)" }}>Tranche en sous-effectif</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ background: "oklch(0.985 0.003 250)", border: "1px solid var(--border)" }} />
                <span style={{ color: "var(--muted-foreground)" }}>Tranche midi (critique)</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} style={{ color: "#856404" }} />
                <span style={{ color: "var(--muted-foreground)" }}>Sous le seuil minimum</span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronDown size={14} style={{ color: "var(--muted-foreground)" }} />
                <span style={{ color: "var(--muted-foreground)" }}>Cliquer pour voir les noms</span>
              </div>
            </div>
          </div>

          {/* Seuils actifs */}
          <div className="bg-white border rounded p-4" style={{ borderColor: "var(--border)" }}>
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
            >
              Seuils actifs
            </h3>
            <div className="space-y-1.5">
              {seuils.map((s, i) => {
                const c = COULEURS_POSTE[s.poste];
                return (
                  <div key={i} className="flex items-center justify-between gap-1">
                    <span
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, minWidth: 44 }}
                    >
                      {s.poste}
                    </span>
                    <span className="text-xs flex-1 truncate" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9 }}>
                      {s.heureDebut}–{s.heureFin}
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: "var(--navy)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}
                    >
                      min {s.minimum}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
