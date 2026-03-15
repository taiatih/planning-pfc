// PFC Planning Manager — Page Planning
// Tableau 15×7 interactif + indicateur couverture + suggestion semaine + export PDF
// Design: "Terrain Pro" — Brutalisme fonctionnel, IBM Plex
// ============================================================

import { useState, useCallback, useMemo } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import {
  JOURS_LONG, JOURS_COURT, formatDateCourt, addDays,
  calculerHeuresEmploye, validerContrat, COULEURS_POSTE,
  Poste, Employe,
  getSemaineTypeEmploye, setSemaineTypeEmploye,
  calculerNiveauCouverture, NiveauCouverture,
  chargerSeuils, suggererPlanning,
  verifierRotationEquipe, StatutRotation,
  genererHTMLPlanningPDF,
} from "@/lib/data";
import PlanningCell from "@/components/PlanningCell";
import { Info, Copy, BookmarkPlus, Wand2, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";

const POSTES_LEGENDE: { poste: Poste; label: string }[] = [
  { poste: "F&L", label: "Fruits & Légumes" },
  { poste: "SEC", label: "Rayon Sec" },
  { poste: "FRAIS", label: "Rayon Frais" },
  { poste: "CAISSE", label: "Caisse" },
];

const COULEUR_NIVEAU: Record<NiveauCouverture, { bg: string; text: string; label: string; dot: string }> = {
  ok:        { bg: "#D4EDDA", text: "#155724", label: "OK",       dot: "#28A745" },
  attention: { bg: "#FFF3CD", text: "#856404", label: "Attention", dot: "#FFC107" },
  critique:  { bg: "#F8D7DA", text: "#721C24", label: "Critique",  dot: "#DC3545" },
  vide:      { bg: "#F0F0F0", text: "#6C757D", label: "—",         dot: "#ADB5BD" },
};

export default function Planning() {
  const { employes, plannings, planningActuel, semaineCourante, stats, setCellule, setCellulesMultiples } = usePlanning();
  const actifs = employes.filter((e) => e.actif);
  const [loadingEmp, setLoadingEmp] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Calcul des niveaux de couverture par jour (mémoïsé)
  const niveauxCouverture = useMemo(() => {
    const seuils = chargerSeuils();
    return Array.from({ length: 7 }, (_, j) =>
      calculerNiveauCouverture(j, planningActuel?.cellules || [], employes, seuils)
    );
  }, [planningActuel, employes]);

  // Rotation weekends par employé
  const rotationWeekends = useMemo(
    () => verifierRotationEquipe(employes, plannings),
    [employes, plannings]
  );

  // Appliquer la semaine type d'un employé
  const appliquerSemaineType = useCallback((emp: Employe) => {
    const st = getSemaineTypeEmploye(emp.id);
    if (!st || st.jours.length === 0) {
      toast.warning(`Aucune semaine type définie pour ${emp.nom}`, {
        description: "Remplissez d'abord une semaine, puis cliquez sur 💾 pour la sauvegarder comme modèle.",
      });
      return;
    }
    setLoadingEmp(emp.id);
    st.jours.forEach(({ jour, brique, poste }) => {
      setCellule(emp.id, jour, brique, poste);
    });
    setTimeout(() => {
      setLoadingEmp(null);
      toast.success(`Semaine type appliquée — ${emp.nom}`, {
        description: `${st.jours.filter((j) => j.brique !== "REPOS").length} créneaux chargés`,
      });
    }, 200);
  }, [setCellule]);

  // Sauvegarder la semaine actuelle comme semaine type
  const sauvegarderSemaineType = useCallback((emp: Employe) => {
    if (!planningActuel) return;
    const jours = planningActuel.cellules
      .filter((c) => c.employeId === emp.id)
      .map((c) => ({ jour: c.jour, brique: c.brique, poste: c.poste }));
    if (jours.length === 0) {
      toast.warning(`Aucun créneau à sauvegarder pour ${emp.nom}`);
      return;
    }
    setSemaineTypeEmploye({ employeId: emp.id, jours });
    toast.success(`Semaine type sauvegardée — ${emp.nom}`, {
      description: `${jours.filter((j) => j.brique !== "REPOS").length} créneaux mémorisés`,
    });
  }, [planningActuel]);

  // Suggérer une semaine complète
  const suggererSemaine = useCallback(() => {
    const seuils = chargerSeuils();
    setLoadingSuggestion(true);
    setTimeout(() => {
      const cellules = suggererPlanning(employes, seuils);
      if (setCellulesMultiples) {
        setCellulesMultiples(cellules);
      } else {
        cellules.forEach((c) => setCellule(c.employeId, c.jour, c.brique, c.poste));
      }
      setLoadingSuggestion(false);
      toast.success("Planning suggéré appliqué", {
        description: `${cellules.filter((c) => c.brique !== "REPOS").length} créneaux générés pour ${actifs.length} employés`,
      });
    }, 300);
  }, [employes, setCellule, setCellulesMultiples, actifs.length]);

  // Export PDF via fenêtre d'impression avec HTML généré
  const exportPDF = useCallback(() => {
    if (!planningActuel) {
      toast.warning("Aucun planning à exporter");
      return;
    }
    const html = genererHTMLPlanningPDF(planningActuel, employes, semaineCourante);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
    toast.info("Export PDF ouvert dans un nouvel onglet", { description: "Choisissez 'Enregistrer en PDF' dans la boîte d'impression" });
  }, [planningActuel, employes, semaineCourante]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Barre d'outils ── */}
      <div
        className="flex items-center gap-3 px-4 py-2 border-b bg-white flex-shrink-0 flex-wrap"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Légende postes */}
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
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.bg, border: `2px solid ${c.border}` }} />
              <span className="text-xs font-semibold" style={{ color: c.text, fontFamily: "'IBM Plex Mono', monospace" }}>{poste}</span>
              <span className="text-xs hidden lg:inline" style={{ color: "var(--muted-foreground)" }}>— {label}</span>
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

        {/* Séparateur + Actions */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <button
            onClick={suggererSemaine}
            disabled={loadingSuggestion}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--navy)", opacity: loadingSuggestion ? 0.6 : 1 }}
            title="Générer automatiquement un planning en respectant les contrats et les seuils"
          >
            <Wand2 size={12} />
            {loadingSuggestion ? "Génération..." : "Suggérer semaine"}
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border hover:bg-muted transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--navy)" }}
            title="Imprimer ou exporter en PDF"
          >
            <FileText size={12} />
            PDF
          </button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info size={12} />
            <span className="hidden md:inline">Clic sur cellule pour modifier</span>
          </div>
        </div>
      </div>

      {/* ── Tableau principal ── */}
      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-x-auto">
          <table className="planning-table" style={{ minWidth: 960 }}>
            <thead>
              <tr>
                <th className="text-left" style={{ minWidth: 140, width: 140 }}>Employé</th>
                <th style={{ minWidth: 60, width: 60 }}>Contrat</th>
                {JOURS_LONG.map((jour, i) => {
                  const niveau = niveauxCouverture[i];
                  const cn = COULEUR_NIVEAU[niveau.niveau];
                  return (
                    <th key={jour} style={{ minWidth: 110 }}>
                      <div>{JOURS_COURT[i]}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 400, opacity: 0.75 }}>
                        {formatDateCourt(addDays(semaineCourante, i))}
                      </div>
                      {/* Indicateur couverture */}
                      <div
                        className="mt-1 rounded px-1.5 py-0.5 inline-flex items-center gap-1"
                        style={{ backgroundColor: cn.bg, color: cn.text }}
                        title={
                          niveau.niveau === "vide"
                            ? "Aucun seuil défini"
                            : `${niveau.sousEffectifs} tranche(s) en sous-effectif sur ${niveau.totalTranches}`
                        }
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cn.dot }}
                        />
                        <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
                          {cn.label}
                          {niveau.niveau !== "vide" && niveau.sousEffectifs > 0 && ` (${niveau.sousEffectifs})`}
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th style={{ minWidth: 60 }}>Total</th>
                <th style={{ minWidth: 70 }}>Statut</th>
                <th style={{ minWidth: 64, width: 64 }} title="Semaine type">Type</th>
              </tr>
            </thead>
            <tbody>
              {actifs.map((emp, idx) => {
                const heures = planningActuel
                  ? calculerHeuresEmploye(emp.id, planningActuel.cellules)
                  : 0;
                const validation = validerContrat(emp, heures);
                const c = COULEURS_POSTE[emp.postePrincipal];
                const semaineType = getSemaineTypeEmploye(emp.id);
                const hasSemaineType = semaineType && semaineType.jours.some((j) => j.brique !== "REPOS");

                return (
                  <tr key={emp.id} style={{ background: idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}>
                    {/* Nom + indicateur rotation weekend */}
                    <td className="px-3 py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.border }} />
                        <div className="min-w-0">
                          <div className="font-semibold text-xs" style={{ color: "var(--navy)" }}>{emp.nom}</div>
                          {emp.contrainte && (
                            <div className="text-xs opacity-50" style={{ fontSize: 10 }}>{emp.contrainte}</div>
                          )}
                          {/* Badge rotation weekend */}
                          {rotationWeekends[emp.id] && rotationWeekends[emp.id].statut !== "ok" && (
                            <div
                              className="inline-flex items-center gap-0.5 mt-0.5"
                              style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}
                              title={`Rotation mois en cours : ${rotationWeekends[emp.id].samedis} Sam / ${rotationWeekends[emp.id].dimanches} Dim`}
                            >
                              <Calendar size={9} style={{ color: "#856404" }} />
                              <span style={{ color: "#856404" }}>
                                {rotationWeekends[emp.id].statut === "manque_les_deux" && "0 WE"}
                                {rotationWeekends[emp.id].statut === "manque_samedi" && "0 Sam"}
                                {rotationWeekends[emp.id].statut === "manque_dimanche" && "0 Dim"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contrat */}
                    <td className="text-center">
                      <div className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}>
                        {emp.heuresHebdo}h
                      </div>
                      <div className="text-xs opacity-60" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9 }}>
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
                          color: heures === 0 ? "var(--muted-foreground)" : validation.ok ? "#155724" : "#7D3C00",
                        }}
                      >
                        {heures > 0 ? `${heures}h` : "—"}
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="text-center px-2">
                      {heures === 0 ? (
                        <span className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace" }}>—</span>
                      ) : validation.ok ? (
                        <span className="text-xs font-semibold" style={{ color: "#155724", fontFamily: "'IBM Plex Mono', monospace" }}>✓ OK</span>
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

                    {/* Semaine type — boutons */}
                    <td className="text-center px-1">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => sauvegarderSemaineType(emp)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Sauvegarder comme semaine type"
                          disabled={heures === 0}
                        >
                          <BookmarkPlus size={13} style={{ color: heures === 0 ? "var(--muted-foreground)" : "var(--navy)" }} />
                        </button>
                        <button
                          onClick={() => appliquerSemaineType(emp)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title={hasSemaineType ? "Appliquer la semaine type" : "Aucune semaine type sauvegardée"}
                          disabled={loadingEmp === emp.id}
                        >
                          <Copy size={13} style={{ color: hasSemaineType ? "#28A745" : "var(--muted-foreground)" }} />
                        </button>
                      </div>
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
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Styles d'impression ── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .planning-table, .planning-table * { visibility: visible; }
          .planning-table { position: absolute; left: 0; top: 0; width: 100%; font-size: 9px; }
        }
      `}</style>
    </div>
  );
}
