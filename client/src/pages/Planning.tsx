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
  getJoursCritiquesSeveres,
  getLundiDeSemaine, getNumeroSemaine, formatDate, OptionsCopie,
  getJoursSpeciauxSemaine, JourSpecial, COULEURS_JOUR_SPECIAL, dateToString, estJourFerme,
} from "@/lib/data";
import PlanningCell from "@/components/PlanningCell";
import { Info, Copy, BookmarkPlus, Wand2, FileText, Calendar, AlertOctagon, X, CopyPlus, ChevronRight, Cloud, CloudOff, Loader2, Lock, LockOpen } from "lucide-react";
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
  const { employes, plannings, planningActuel, semaineCourante, stats, setCellule, setCellulesMultiples, copierVers, allerSemaine, isSaving, isDirty, lastSaved, toggleVerrou } = usePlanning();
  const actifs = employes.filter((e) => e.actif);
  const [loadingEmp, setLoadingEmp] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Modal copie multi-semaine
  const [modalCopieOuvert, setModalCopieOuvert] = useState(false);
  const [optionsCopie, setOptionsCopie] = useState<OptionsCopie>({
    exclureAbsences: true,
    seulementSemaine: false,
    ecraser: true,
  });
  // Semaines cibles proposées : S+1, S+2, S+3, S+4
  const semainesCibles = useMemo(() => {
    return [1, 2, 3, 4].map((offset) => {
      const lundi = addDays(semaineCourante, offset * 7);
      const num = getNumeroSemaine(lundi);
      const annee = lundi.getFullYear();
      const dejaExiste = plannings.some((p) => p.semaine === num && p.annee === annee);
      return { lundi, num, annee, offset, dejaExiste };
    });
  }, [semaineCourante, plannings]);
  const [semaineCibleSelectionnee, setSemaineCibleSelectionnee] = useState<number>(1); // offset

  const executerCopie = useCallback(() => {
    const cible = semainesCibles.find((s) => s.offset === semaineCibleSelectionnee);
    if (!cible) return;
    const resultat = copierVers(cible.lundi, optionsCopie);
    if (!resultat) {
      toast.error("Impossible de copier — aucun planning source");
      return;
    }
    setModalCopieOuvert(false);
    toast.success(
      `Planning copié vers S${resultat.semaineCible} — ${resultat.anneeCible}`,
      {
        description: `${resultat.nbCellulesCopiees} créneaux copiés${resultat.nbCellulesIgnorees > 0 ? `, ${resultat.nbCellulesIgnorees} ignorés` : ""}`,
        action: {
          label: "Aller à S" + resultat.semaineCible,
          onClick: () => allerSemaine(cible.lundi),
        },
      }
    );
  }, [semainesCibles, semaineCibleSelectionnee, optionsCopie, copierVers, allerSemaine]);

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

  // Jours critiques sévères (sous-effectif sur > 3 tranches)
  const joursCritiques = useMemo(() => {
    const seuils = chargerSeuils();
    return getJoursCritiquesSeveres(planningActuel?.cellules || [], employes, seuils, 3);
  }, [planningActuel, employes]);

  // Jours spéciaux de la semaine (fériés + Aïd)
  const joursSpeciaux = useMemo(() => {
    return getJoursSpeciauxSemaine(semaineCourante, semaineCourante.getFullYear());
  }, [semaineCourante]);

  const [banniereVisible, setBanniereVisible] = useState(true);

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
      {/* ── Bannière alerte critique ── */}
      {banniereVisible && joursCritiques.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
          style={{
            background: "#DC3545",
            color: "white",
          }}
        >
          <div className="flex items-center gap-2">
            <AlertOctagon size={16} />
            <span className="text-sm font-bold" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
              SOUS-EFFECTIF SÉVÈRE
            </span>
            <span className="text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace", opacity: 0.9 }}>
              — {joursCritiques.length} jour{joursCritiques.length > 1 ? "s" : ""} en situation critique : 
              {joursCritiques.map((j) => JOURS_COURT[j]).join(", ")}
            </span>
            <span className="text-xs opacity-75" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              (plus de 3 tranches horaires sans couverture suffisante)
            </span>
          </div>
          <button
            onClick={() => setBanniereVisible(false)}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            title="Masquer l'alerte"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
            onClick={() => setModalCopieOuvert(true)}
            disabled={!planningActuel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border hover:bg-muted transition-colors"
            style={{ borderColor: "#0D6EFD", color: "#0D6EFD", opacity: !planningActuel ? 0.5 : 1 }}
            title="Copier ce planning vers une autre semaine"
          >
            <CopyPlus size={12} />
            Copier vers...
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
          {/* Indicateur auto-save */}
          <div className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {isSaving ? (
              <>
                <Loader2 size={11} className="animate-spin" style={{ color: "#0D6EFD" }} />
                <span style={{ color: "#0D6EFD" }}>Sauvegarde...</span>
              </>
            ) : isDirty ? (
              <>
                <CloudOff size={11} style={{ color: "#FFC107" }} />
                <span style={{ color: "#856404" }}>Non sauvegardé</span>
              </>
            ) : lastSaved ? (
              <>
                <Cloud size={11} style={{ color: "#28A745" }} />
                <span style={{ color: "#155724" }}>Sauvegardé à {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
              </>
            ) : (
              <>
                <Info size={11} style={{ color: "var(--muted-foreground)" }} />
                <span className="hidden md:inline" style={{ color: "var(--muted-foreground)" }}>Clic sur cellule pour modifier</span>
              </>
            )}
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
                  const dateJour = addDays(semaineCourante, i);
                  const dateStr = dateToString(dateJour);
                  const joursSpec = joursSpeciaux[dateStr] || [];
                  const estFerme = estJourFerme(dateJour);
                  const principalSpec = joursSpec[0]; // Premier jour spécial du jour
                  return (
                    <th
                      key={jour}
                      style={{
                        minWidth: 110,
                        background: estFerme
                          ? COULEURS_JOUR_SPECIAL.FERIE_BLOQUE.bg
                          : principalSpec
                            ? COULEURS_JOUR_SPECIAL[principalSpec.type].bg
                            : undefined,
                        color: estFerme
                          ? COULEURS_JOUR_SPECIAL.FERIE_BLOQUE.text
                          : principalSpec
                            ? COULEURS_JOUR_SPECIAL[principalSpec.type].text
                            : undefined,
                      }}
                    >
                      <div>{JOURS_COURT[i]}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 400, opacity: 0.85 }}>
                        {formatDateCourt(dateJour)}
                      </div>
                      {/* Badge jour spécial */}
                      {joursSpec.length > 0 && (
                        <div
                          className="mt-0.5 rounded px-1 py-0.5 inline-block"
                          style={{
                            background: COULEURS_JOUR_SPECIAL[joursSpec[0].type].border,
                            color: "white",
                            fontSize: 8,
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontWeight: 700,
                            letterSpacing: "0.03em",
                            maxWidth: 100,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={joursSpec.map((j) => j.label).join(" · ")}
                        >
                          {COULEURS_JOUR_SPECIAL[joursSpec[0].type].badge}
                          {joursSpec.length > 1 && ` +${joursSpec.length - 1}`}
                        </div>
                      )}
                      {/* Indicateur couverture (masqué si fermé) */}
                      {!estFerme && (
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
                      )}
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
                  <tr key={emp.id} style={{ background: emp.verrouille ? "#FFF5F5" : (idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)") }}>
                    {/* Nom + indicateur rotation weekend + cadenas */}
                    <td className="px-3 py-1">
                      <div className="flex items-center gap-2">
                        {/* Bouton verrou */}
                        <button
                          onClick={() => toggleVerrou(emp.id)}
                          title={emp.verrouille ? "Verrouillé — cliquer pour déverrouiller" : "Déverrouillé — cliquer pour verrouiller"}
                          className="flex-shrink-0 transition-opacity hover:opacity-100"
                          style={{ opacity: emp.verrouille ? 1 : 0.25 }}
                        >
                          {emp.verrouille
                            ? <Lock size={12} style={{ color: "#DC3545" }} />
                            : <LockOpen size={12} style={{ color: "#6C757D" }} />
                          }
                        </button>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: emp.verrouille ? "#DC3545" : c.border }} />
                        <div className="min-w-0">
                          <div className="font-semibold text-xs" style={{ color: emp.verrouille ? "#721C24" : "var(--navy)", textDecoration: emp.verrouille ? "none" : "none" }}>{emp.nom}</div>
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
                      const dateJourCell = addDays(semaineCourante, jourIdx);
                      const estFermeCell = estJourFerme(dateJourCell);
                      const joursSpecCell = joursSpeciaux[dateToString(dateJourCell)] || [];
                      const hasAid = joursSpecCell.some((j) => j.type === "AID_FITR" || j.type === "AID_ADHA");

                      if (estFermeCell) {
                        // 1er mai : cellule bloquée, saisie impossible
                        return (
                          <td key={jourIdx} style={{ padding: 0 }}>
                            <div
                              className="flex flex-col items-center justify-center"
                              style={{
                                minHeight: 52,
                                background: COULEURS_JOUR_SPECIAL.FERIE_BLOQUE.bg,
                                borderLeft: `3px solid ${COULEURS_JOUR_SPECIAL.FERIE_BLOQUE.border}`,
                                cursor: "not-allowed",
                                padding: "4px 6px",
                              }}
                              title="Magasin fermé — 1er mai"
                            >
                              <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: COULEURS_JOUR_SPECIAL.FERIE_BLOQUE.text }}>FERMÉ</span>
                              <span style={{ fontSize: 8, color: COULEURS_JOUR_SPECIAL.FERIE_BLOQUE.text, opacity: 0.7 }}>1er mai</span>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={jourIdx} style={{ padding: 0, position: "relative" }}>
                          {/* Indicateur Aïd (bande colorée en haut de la cellule) */}
                          {hasAid && (
                            <div
                              style={{
                                position: "absolute",
                                top: 0, left: 0, right: 0,
                                height: 3,
                                background: joursSpecCell.find((j) => j.type === "AID_FITR")
                                  ? COULEURS_JOUR_SPECIAL.AID_FITR.border
                                  : COULEURS_JOUR_SPECIAL.AID_ADHA.border,
                                zIndex: 1,
                              }}
                              title={joursSpecCell.filter((j) => j.type === "AID_FITR" || j.type === "AID_ADHA").map((j) => j.label).join(" · ")}
                            />
                          )}
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

      {/* ── Modal Copie Multi-Semaine ── */}
      {modalCopieOuvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalCopieOuvert(false); }}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4"
            style={{ border: "2px solid var(--navy)" }}
          >
            {/* En-tête */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ background: "var(--navy)", borderRadius: "6px 6px 0 0" }}
            >
              <div className="flex items-center gap-2">
                <CopyPlus size={16} color="white" />
                <span
                  className="font-bold text-white text-sm"
                  style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", letterSpacing: "0.05em" }}
                >
                  COPIER LE PLANNING
                </span>
              </div>
              <button onClick={() => setModalCopieOuvert(false)} className="text-white/70 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* Corps */}
            <div className="px-5 py-4 space-y-5">
              {/* Source */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
                  Source
                </p>
                <div
                  className="px-3 py-2 rounded text-sm font-semibold"
                  style={{ background: "#EEF2FF", color: "var(--navy)", fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  S{planningActuel?.semaine} — {planningActuel?.annee}
                  &nbsp;&middot;&nbsp;
                  {planningActuel?.cellules.filter((c) => c.brique !== "REPOS" && ![
                    "CP","MALADIE","FORM","RTT","ABS-J","ABS-NJ","FERIE"
                  ].includes(c.brique)).length} créneaux travail
                </div>
              </div>

              {/* Sélection semaine cible */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
                  Semaine cible
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {semainesCibles.map((s) => (
                    <button
                      key={s.offset}
                      onClick={() => setSemaineCibleSelectionnee(s.offset)}
                      className="flex flex-col items-start px-3 py-2.5 rounded border-2 text-left transition-all"
                      style={{
                        borderColor: semaineCibleSelectionnee === s.offset ? "#0D6EFD" : "var(--border)",
                        background: semaineCibleSelectionnee === s.offset ? "#EFF6FF" : "white",
                      }}
                    >
                      <span className="text-xs font-bold" style={{ color: "var(--navy)", fontFamily: "'IBM Plex Mono', monospace" }}>
                        S{s.num} — {s.annee}
                      </span>
                      <span className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                        {formatDate(s.lundi)}
                      </span>
                      {s.dejaExiste && (
                        <span className="text-xs mt-1 px-1.5 py-0.5 rounded" style={{ background: "#FFF3CD", color: "#856404", fontSize: 10 }}>
                          Planning existant
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
                  Options
                </p>
                <div className="space-y-2">
                  {[
                    {
                      key: "exclureAbsences" as keyof OptionsCopie,
                      label: "Exclure les absences (CP, Maladie, RTT…)",
                      desc: "Seuls les créneaux de travail sont copiés",
                    },
                    {
                      key: "seulementSemaine" as keyof OptionsCopie,
                      label: "Jours ouvrables uniquement (Lun–Ven)",
                      desc: "Ignorer Samedi et Dimanche",
                    },
                    {
                      key: "ecraser" as keyof OptionsCopie,
                      label: "Écraser les créneaux existants",
                      desc: "Si désactivé, ne copie que les cellules encore vides (REPOS)",
                    },
                  ].map(({ key, label, desc }) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={optionsCopie[key] as boolean}
                        onChange={(e) => setOptionsCopie((prev) => ({ ...prev, [key]: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{label}</p>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Pied */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setModalCopieOuvert(false)}
                className="px-4 py-2 text-sm rounded border hover:bg-muted transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                Annuler
              </button>
              <button
                onClick={executerCopie}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded text-white transition-opacity hover:opacity-90"
                style={{ background: "#0D6EFD" }}
              >
                <CopyPlus size={14} />
                Copier vers S{semainesCibles.find((s) => s.offset === semaineCibleSelectionnee)?.num}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
