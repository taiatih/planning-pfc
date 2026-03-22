// Design "Terrain Pro" — IBM Plex, bleu marine #1A2B4A, couleurs sémantiques par poste
// Historique enrichi : liste des plannings + modal lecture seule + duplication vers semaine cible
import { useState } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import {
  getNumeroSemaine, formatDate, addDays, getLundiDeSemaine,
  chargerEmployes, getBrique, JOURS_LONG, JOURS_COURT,
  COULEURS_POSTE, COULEURS_ABSENCE,
  calculerHeuresEmploye, validerContrat,
  PlanningHebdo, CellulePlanning, Employe, OptionsCopie,
} from "@/lib/data";
import { CalendarDays, Eye, Copy, FileText, X, ChevronRight, Check, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

// ── Sous-composant : mini cellule lecture seule ──────────────────────────────
function MiniCellule({ cellule }: { cellule: CellulePlanning | undefined }) {
  if (!cellule) {
    return (
      <td className="border px-1 py-1.5 text-center" style={{ borderColor: "var(--border)", minWidth: 80 }}>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>—</span>
      </td>
    );
  }

  const brique = getBrique(cellule.brique);
  if (!brique) {
    return (
      <td className="border px-1 py-1.5 text-center" style={{ borderColor: "var(--border)", minWidth: 80 }}>
        <span className="text-xs text-muted-foreground">?</span>
      </td>
    );
  }

  const isAbsence = brique.type === "ABSENCE";
  const isRepos = brique.code === "REPOS";

  let bg = "#F8F9FA";
  let textColor = "#6C757D";
  let borderColor = "#DEE2E6";

  if (isRepos) {
    bg = "#F8F9FA"; textColor = "#9CA3AF"; borderColor = "#E5E7EB";
  } else if (isAbsence) {
    const couleur = COULEURS_ABSENCE[brique.code];
    if (couleur) { bg = couleur.bg; textColor = couleur.text; borderColor = couleur.border; }
  } else if (cellule.poste) {
    const couleur = COULEURS_POSTE[cellule.poste];
    if (couleur) { bg = couleur.bg; textColor = couleur.text; borderColor = couleur.border; }
  }

  return (
    <td
      className="border px-1 py-1.5 text-center"
      style={{ borderColor: "var(--border)", minWidth: 80 }}
    >
      <div
        className="rounded px-1 py-0.5 text-center"
        style={{ background: bg, border: `1px solid ${borderColor}` }}
      >
        <div className="text-xs font-bold leading-tight" style={{ color: textColor, fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
          {isRepos ? "REPOS" : brique.label.split(" ")[0]}
        </div>
            {!isRepos && !isAbsence && (
          <div className="text-xs leading-tight" style={{ color: textColor, fontFamily: "'IBM Plex Mono', monospace", opacity: 0.8 }}>
            {brique.heureDebut}–{brique.heureFin}
          </div>
        )}
      </div>
    </td>
  );
}

// ── Modal lecture seule ──────────────────────────────────────────────────────
function ModalLectureSeule({
  planning,
  employes,
  onClose,
  onDupliquer,
}: {
  planning: PlanningHebdo;
  employes: Employe[];
  onClose: () => void;
  onDupliquer: (planning: PlanningHebdo) => void;
}) {
  const lundi = new Date(planning.dateDebut + "T00:00:00");
  const dimanche = addDays(lundi, 6);

  const getCellule = (employeId: string, jour: number): CellulePlanning | undefined =>
    planning.cellules.find((c) => c.employeId === employeId && c.jour === jour);

  const statutStyle = (statut: string) => {
    if (statut === "PUBLIE") return { bg: "#D4EDDA", text: "#155724", border: "#28A745" };
    if (statut === "AVENANT") return { bg: "#CCE5FF", text: "#004085", border: "#3B82F6" };
    return { bg: "#FFF3CD", text: "#856404", border: "#FFC107" };
  };
  const s = statutStyle(planning.statut);

  // Calcul conformité
  const conformes = employes.filter((emp) => {
    const heures = calculerHeuresEmploye(emp.id, planning.cellules);
    if (heures === 0) return true; // non planifié = pas d'alerte
    const validation = validerContrat(emp, heures);
    return validation.ok;
  });
  const tauxConformite = employes.length > 0 ? Math.round((conformes.length / employes.length) * 100) : 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col"
        style={{ width: "95vw", maxWidth: 1200, maxHeight: "92vh", border: "1px solid var(--border)" }}
      >
        {/* Header modal */}
        <div
          className="flex items-center justify-between px-5 py-3 rounded-t-lg"
          style={{ background: "var(--navy)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="flex items-center gap-3">
            <Eye size={16} className="text-white opacity-70" />
            <div>
              <span
                className="text-white font-bold text-base uppercase tracking-wide"
                style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}
              >
                Planning S{planning.semaine} — {planning.annee}
              </span>
              <span className="text-white opacity-60 text-xs ml-3" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {formatDate(lundi)} → {formatDate(dimanche)}
              </span>
            </div>
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold ml-2"
              style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {planning.statut}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Indicateurs */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded text-xs text-white opacity-70">
              <Check size={12} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{tauxConformite}% conformité</span>
            </div>
            <button
              onClick={() => onDupliquer(planning)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            >
              <Copy size={12} />
              Dupliquer
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded transition-colors"
              style={{ color: "rgba(255,255,255,0.7)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tableau lecture seule */}
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th
                  className="border px-3 py-2 text-left text-xs font-bold uppercase tracking-wider sticky left-0 z-10"
                  style={{ borderColor: "var(--border)", background: "var(--navy)", color: "white", fontFamily: "'IBM Plex Sans Condensed', sans-serif", minWidth: 140 }}
                >
                  Employé
                </th>
                {JOURS_LONG.map((jour, idx) => {
                  const jourDate = addDays(lundi, idx);
                  const isWeekend = idx >= 5;
                  return (
                    <th
                      key={jour}
                      className="border px-1 py-2 text-center text-xs font-bold uppercase tracking-wider"
                      style={{
                        borderColor: "var(--border)",
                        background: isWeekend ? "oklch(0.25 0.05 250)" : "var(--navy)",
                        color: "white",
                        fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                        minWidth: 80,
                      }}
                    >
                      <div>{JOURS_COURT[idx]}</div>
                      <div className="font-normal opacity-70" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>
                        {formatDate(jourDate).split("/").slice(0, 2).join("/")}
                      </div>
                    </th>
                  );
                })}
                <th
                  className="border px-2 py-2 text-center text-xs font-bold uppercase tracking-wider"
                  style={{ borderColor: "var(--border)", background: "var(--navy)", color: "white", fontFamily: "'IBM Plex Sans Condensed', sans-serif", minWidth: 60 }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {employes.map((emp, empIdx) => {
                const heures = calculerHeuresEmploye(emp.id, planning.cellules);
                const validation = heures > 0 ? validerContrat(emp, heures) : null;
                const isConform = !validation || validation.ok;

                return (
                  <tr
                    key={emp.id}
                    style={{ background: empIdx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}
                  >
                    {/* Nom employé */}
                    <td
                      className="border px-3 py-1.5 sticky left-0 z-10"
                      style={{ borderColor: "var(--border)", background: empIdx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}
                    >
                      <div className="flex items-center gap-1.5">
                        {!isConform && <AlertTriangle size={10} style={{ color: "#F59E0B", flexShrink: 0 }} />}
                        <div>
                          <div className="font-semibold text-xs" style={{ color: "var(--navy)", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
                            {emp.prenom} {emp.nom.charAt(0)}.
                          </div>
                          <div className="text-xs opacity-60" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9 }}>
                            {emp.heuresHebdo}h
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cellules par jour */}
                    {[0, 1, 2, 3, 4, 5, 6].map((jour) => (
                      <MiniCellule key={jour} cellule={getCellule(emp.id, jour)} />
                    ))}

                    {/* Total heures */}
                    <td
                      className="border px-2 py-1.5 text-center"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span
                        className="text-xs font-bold"
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: heures === 0 ? "var(--muted-foreground)" : isConform ? "#16A34A" : "#DC2626",
                        }}
                      >
                        {heures > 0 ? `${heures}h` : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Légende */}
        <div
          className="px-5 py-2.5 flex items-center gap-4 rounded-b-lg"
          style={{ borderTop: "1px solid var(--border)", background: "oklch(0.97 0.002 250)" }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
            Légende
          </span>
          {[
            { label: "F&L", bg: "#D4EDDA", text: "#155724", border: "#28A745" },
            { label: "SEC", bg: "#D1ECF1", text: "#0C5460", border: "#17A2B8" },
            { label: "FRAIS", bg: "#CCE5FF", text: "#004085", border: "#3B82F6" },
            { label: "CAISSE", bg: "#FFF3CD", text: "#856404", border: "#FFC107" },
            { label: "REPOS", bg: "#F8F9FA", text: "#9CA3AF", border: "#E5E7EB" },
            { label: "ABSENCE", bg: "#FFE4E6", text: "#9F1239", border: "#F43F5E" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded"
                style={{ background: item.bg, border: `1px solid ${item.border}` }}
              />
              <span className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace" }}>
                {item.label}
              </span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace" }}>
            <Clock size={10} />
            Modifié le {new Date(planning.modifieLe).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal duplication ────────────────────────────────────────────────────────
function ModalDupliquer({
  planning,
  onClose,
  onConfirm,
}: {
  planning: PlanningHebdo;
  onClose: () => void;
  onConfirm: (lundiCible: Date, options: OptionsCopie) => void;
}) {
  const [semaineSelectionnee, setSemaineSelectionnee] = useState(0); // index dans les semaines proposées
  const [options, setOptions] = useState<OptionsCopie>({
    exclureAbsences: true,
    seulementSemaine: false,
    ecraser: true,
  });

  // Générer 6 semaines cibles à partir de la semaine suivant le planning source
  const lundiSource = new Date(planning.dateDebut + "T00:00:00");
  const semaineCibles = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(lundiSource);
    d.setDate(d.getDate() + 7 * (i + 1));
    return getLundiDeSemaine(d);
  });

  const lundiCible = semaineCibles[semaineSelectionnee];
  const semaineCible = getNumeroSemaine(lundiCible);
  const anneeCible = lundiCible.getFullYear();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl"
        style={{ width: 480, border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 rounded-t-lg"
          style={{ background: "var(--navy)" }}
        >
          <div className="flex items-center gap-2">
            <Copy size={15} className="text-white opacity-70" />
            <span className="text-white font-bold text-sm uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
              Dupliquer S{planning.semaine} — {planning.annee}
            </span>
          </div>
          <button onClick={onClose} className="text-white opacity-60 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Semaine source */}
          <div
            className="rounded p-3 text-sm"
            style={{ background: "oklch(0.97 0.002 250)", border: "1px solid var(--border)" }}
          >
            <span className="font-semibold" style={{ color: "var(--navy)", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
              Source :
            </span>
            <span className="ml-2" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)", fontSize: 12 }}>
              S{planning.semaine} — {planning.annee} · {planning.cellules.filter(c => {
                const b = getBrique(c.brique);
                return b && b.type !== "ABSENCE" && b.code !== "REPOS";
              }).length} créneaux travail
            </span>
          </div>

          {/* Sélection semaine cible */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--navy)", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
              Semaine cible
            </label>
            <div className="grid grid-cols-3 gap-2">
              {semaineCibles.map((lundi, idx) => {
                const sem = getNumeroSemaine(lundi);
                const annee = lundi.getFullYear();
                const isSelected = idx === semaineSelectionnee;
                return (
                  <button
                    key={idx}
                    onClick={() => setSemaineSelectionnee(idx)}
                    className="rounded p-2 text-center transition-all text-xs"
                    style={{
                      border: `2px solid ${isSelected ? "var(--navy)" : "var(--border)"}`,
                      background: isSelected ? "var(--navy)" : "white",
                      color: isSelected ? "white" : "var(--navy)",
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    <div className="font-bold">S{sem}</div>
                    <div className="opacity-70" style={{ fontSize: 10 }}>{annee}</div>
                    <div className="opacity-60" style={{ fontSize: 9 }}>
                      {formatDate(lundi).split("/").slice(0, 2).join("/")} →{" "}
                      {formatDate(addDays(lundi, 6)).split("/").slice(0, 2).join("/")}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--navy)", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
              Options
            </label>
            <div className="space-y-2">
              {[
                     { key: "exclureAbsences" as keyof OptionsCopie, label: "Exclure les absences (CP, Maladie, RTT…)", desc: "Ne copie que les créneaux de travail" },
                { key: "seulementSemaine" as keyof OptionsCopie, label: "Jours ouvrables uniquement (Lun–Ven)", desc: "Ignore Sam et Dim" },
                { key: "ecraser" as keyof OptionsCopie, label: "Écraser les créneaux existants", desc: "Remplace ce qui est déjà saisi" },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors"
                    style={{
                      background: options[key] ? "var(--navy)" : "white",
                      border: `2px solid ${options[key] ? "var(--navy)" : "var(--border)"}`,
                    }}
                    onClick={() => setOptions((prev) => ({ ...prev, [key]: !prev[key] }))}
                  >
                    {options[key] && <Check size={10} className="text-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--navy)", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>{label}</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded text-sm font-semibold transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
            >
              Annuler
            </button>
            <button
              onClick={() => onConfirm(lundiCible, options)}
              className="flex-1 py-2 rounded text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors"
              style={{ background: "var(--navy)" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <Copy size={14} />
              Dupliquer vers S{semaineCible}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page principale Historique ───────────────────────────────────────────────
export default function Historique() {
  const { plannings, allerSemaine, copierVers } = usePlanning();
  const employes = chargerEmployes();

  const [planningVu, setPlanningVu] = useState<PlanningHebdo | null>(null);
  const [planningDuplique, setPlanningDuplique] = useState<PlanningHebdo | null>(null);

  const planningsTries = [...plannings].sort((a, b) => {
    if (a.annee !== b.annee) return b.annee - a.annee;
    return b.semaine - a.semaine;
  });

  const statutStyle = (statut: string) => {
    if (statut === "PUBLIE") return { bg: "#D4EDDA", text: "#155724", border: "#28A745" };
    if (statut === "AVENANT") return { bg: "#CCE5FF", text: "#004085", border: "#3B82F6" };
    return { bg: "#FFF3CD", text: "#856404", border: "#FFC107" };
  };

  const handleDupliquer = (lundiCible: Date, options: OptionsCopie) => {
    if (!planningDuplique) return;

    // Sauvegarder le contexte actuel et naviguer vers la semaine source pour la copie
    const lundiSource = new Date(planningDuplique.dateDebut + "T00:00:00");
    allerSemaine(lundiSource);

    // Effectuer la copie après un tick pour que le contexte soit à jour
    setTimeout(() => {
      const resultat = copierVers(lundiCible, options);
      if (resultat) {
        const semaineCible = getNumeroSemaine(lundiCible);
        toast.success(`Planning S${planningDuplique.semaine} dupliqué vers S${semaineCible} — ${resultat.nbCellulesCopiees} créneaux copiés`, {
          action: {
            label: `Aller à S${semaineCible}`,
            onClick: () => allerSemaine(lundiCible),
          },
        });
        setPlanningDuplique(null);
      } else {
        toast.error("Erreur lors de la duplication");
      }
    }, 100);
  };

  // Calcul rapide du taux de conformité pour l'affichage dans la liste
  const getConformite = (planning: PlanningHebdo): number => {
    const planifies = employes.filter((emp) => {
      const heures = calculerHeuresEmploye(emp.id, planning.cellules);
      return heures > 0;
    });
    if (planifies.length === 0) return 100;
    const conformes = planifies.filter((emp) => {
      const heures = calculerHeuresEmploye(emp.id, planning.cellules);
      return validerContrat(emp, heures).ok;
    });
    return Math.round((conformes.length / planifies.length) * 100);
  };

  // Compter les créneaux travail (hors REPOS/ABSENCE)
  const getNbCreneaux = (planning: PlanningHebdo): number =>
    planning.cellules.filter((c) => {
      const b = getBrique(c.brique);
      return b && b.type !== "ABSENCE" && b.code !== "REPOS";
    }).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold uppercase tracking-wide"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Historique des Plannings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {planningsTries.length} planning{planningsTries.length > 1 ? "s" : ""} enregistré{planningsTries.length > 1 ? "s" : ""}
            {" · "}
            <span className="font-medium">Cliquez sur "Voir" pour consulter en lecture seule, "Dupliquer" pour réutiliser comme base</span>
          </p>
        </div>
      </div>

      {planningsTries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <CalendarDays size={48} style={{ color: "var(--muted-foreground)" }} />
          <div className="text-center">
            <p className="font-semibold" style={{ color: "var(--navy)" }}>Aucun planning enregistré</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sauvegardez un planning depuis la page Planning pour le retrouver ici
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--navy)" }}>
                {["Semaine", "Période", "Statut", "Créneaux", "Conformité", "Dernière modif.", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white"
                    style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planningsTries.map((p, idx) => {
                const lundi = new Date(p.dateDebut + "T00:00:00");
                const dimanche = addDays(lundi, 6);
                const s = statutStyle(p.statut);
                const conformite = getConformite(p);
                const nbCreneaux = getNbCreneaux(p);

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-blue-50 transition-colors"
                    style={{ background: idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}
                  >
                    {/* Semaine */}
                    <td className="px-4 py-3 font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)" }}>
                      S{p.semaine} — {p.annee}
                    </td>

                    {/* Période */}
                    <td className="px-4 py-3 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}>
                      {formatDate(lundi)} → {formatDate(dimanche)}
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {p.statut}
                      </span>
                    </td>

                    {/* Créneaux */}
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-semibold"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", color: nbCreneaux > 0 ? "var(--navy)" : "var(--muted-foreground)" }}
                      >
                        {nbCreneaux > 0 ? `${nbCreneaux} créneaux` : "Vide"}
                      </span>
                    </td>

                    {/* Conformité */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${conformite}%`,
                              background: conformite >= 90 ? "#16A34A" : conformite >= 70 ? "#F59E0B" : "#DC2626",
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-semibold"
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            color: conformite >= 90 ? "#16A34A" : conformite >= 70 ? "#F59E0B" : "#DC2626",
                          }}
                        >
                          {conformite}%
                        </span>
                      </div>
                    </td>

                    {/* Dernière modif */}
                    <td className="px-4 py-3 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}>
                      {new Date(p.modifieLe).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Voir (lecture seule) */}
                        <button
                          onClick={() => setPlanningVu(p)}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border hover:bg-muted transition-colors"
                          style={{ borderColor: "var(--navy)", color: "var(--navy)" }}
                          title="Consulter en lecture seule"
                        >
                          <Eye size={12} />
                          Voir
                        </button>

                        {/* Dupliquer */}
                        <button
                          onClick={() => setPlanningDuplique(p)}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border hover:bg-muted transition-colors"
                          style={{ borderColor: "#3B82F6", color: "#3B82F6" }}
                          title="Dupliquer vers une autre semaine"
                        >
                          <Copy size={12} />
                          Dupliquer
                        </button>

                        {/* Naviguer vers */}
                        <button
                          onClick={() => allerSemaine(lundi)}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded border hover:bg-muted transition-colors"
                          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                          title="Aller à cette semaine dans le Planning"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal lecture seule */}
      {planningVu && (
        <ModalLectureSeule
          planning={planningVu}
          employes={employes}
          onClose={() => setPlanningVu(null)}
          onDupliquer={(p) => { setPlanningVu(null); setPlanningDuplique(p); }}
        />
      )}

      {/* Modal duplication */}
      {planningDuplique && (
        <ModalDupliquer
          planning={planningDuplique}
          onClose={() => setPlanningDuplique(null)}
          onConfirm={handleDupliquer}
        />
      )}
    </div>
  );
}
