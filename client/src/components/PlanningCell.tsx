// PFC Planning Manager — Composant PlanningCell
// Cellule cliquable avec sélecteur de créneau filtré intelligemment + notes
// ============================================================

import { useState, useRef, useEffect, useMemo } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import {
  getBrique, getCreneauxDisponibles, calculerHeuresEmploye,
  COULEURS_POSTE, COULEURS_ABSENCE,
  Poste, Employe,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { X, AlertTriangle, MessageSquare, Check, StickyNote } from "lucide-react";

interface PlanningCellProps {
  employeId: string;
  jour: number;
  brique: string;
  poste?: Poste;
  employe: Employe;
  readOnly?: boolean;
}

function getCellStyle(brique: string, poste?: Poste) {
  const b = getBrique(brique);
  if (!b || b.type === "ABSENCE") {
    const abs = COULEURS_ABSENCE[brique] || COULEURS_ABSENCE["REPOS"];
    return {
      backgroundColor: abs.bg,
      color: abs.text,
      borderLeft: `3px solid ${abs.border || "#ADB5BD"}`,
    };
  }
  if (poste && COULEURS_POSTE[poste]) {
    const c = COULEURS_POSTE[poste];
    return {
      backgroundColor: c.bg,
      color: c.text,
      borderLeft: `3px solid ${c.border}`,
    };
  }
  return { backgroundColor: "#F8F7F4", color: "#333", borderLeft: "3px solid #CCC" };
}

function getCellLabel(brique: string, poste?: Poste): { line1: string; line2: string } {
  const b = getBrique(brique);
  if (!b) return { line1: brique, line2: "" };
  if (b.type === "ABSENCE") return { line1: b.label.toUpperCase(), line2: "" };

  const heures = `${b.duree}h`;
  const horaire = b.heureDebut2
    ? `${b.heureDebut}-${b.heureFin} / ${b.heureDebut2}-${b.heureFin2}`
    : `${b.heureDebut}-${b.heureFin}`;

  return {
    line1: poste ? `${poste} — ${heures}` : heures,
    line2: horaire,
  };
}

export default function PlanningCell({ employeId, jour, brique, poste, employe, readOnly }: PlanningCellProps) {
  const { setCellule, setCelluleNote, celluleSelectionnee, setCelluleSelectionnee, planningActuel } = usePlanning();
  const [open, setOpen] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  // Note actuelle de la cellule
  const noteActuelle = planningActuel?.cellules.find(
    (c) => c.employeId === employeId && c.jour === jour
  )?.note || "";

  const isSelected = celluleSelectionnee?.employeId === employeId && celluleSelectionnee?.jour === jour;
  const style = getCellStyle(brique, poste);
  const { line1, line2 } = getCellLabel(brique, poste);

  // Vérifier si ce jour est marqué indisponible pour cet employé
  const jourIndisponible = employe.joursIndisponibles?.includes(jour) ?? false;
  const b = getBrique(brique);
  const estTravail = b && b.type === "TRAVAIL";
  const alerteIndisponible = jourIndisponible && estTravail; // Alerte seulement si créneau de travail sur jour indisponible

  // Calculer les heures déjà planifiées (sans le jour courant)
  const heuresDejaPlannifiees = useMemo(() => {
    if (!planningActuel) return 0;
    const cellulesSansJourCourant = planningActuel.cellules.filter(
      (c) => c.employeId === employeId && c.jour !== jour
    );
    return calculerHeuresEmploye(employeId, cellulesSansJourCourant);
  }, [planningActuel, employeId, jour]);

  // Créneaux disponibles filtrés intelligemment
  const { travail: briquesTravail, absences: briquesAbsence } = useMemo(
    () => getCreneauxDisponibles(employe, heuresDejaPlannifiees),
    [employe, heuresDejaPlannifiees]
  );

  const heuresRestantes = employe.heuresHebdo - heuresDejaPlannifiees;

  // Fermer si clic extérieur
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setNoteMode(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = () => {
    if (readOnly) return;
    if (employe.verrouille) return; // Employé verrouillé : saisie bloquée
    setCelluleSelectionnee({ employeId, jour });
    setOpen(true);
    setNoteMode(false);
  };

  const handleSelect = (newBrique: string, newPoste?: Poste) => {
    setCellule(employeId, jour, newBrique, newPoste);
    setOpen(false);
    setNoteMode(false);
    setCelluleSelectionnee(null);
  };

  const handleOpenNote = () => {
    setNoteValue(noteActuelle);
    setNoteMode(true);
    setTimeout(() => noteInputRef.current?.focus(), 50);
  };

  const handleSaveNote = () => {
    setCelluleNote(employeId, jour, noteValue);
    setNoteMode(false);
    setOpen(false);
    setCelluleSelectionnee(null);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveNote();
    if (e.key === "Escape") { setNoteMode(false); setOpen(false); }
  };

  return (
    <div ref={ref} className="relative">
      {/* Cellule principale */}
      <div
        className={cn("planning-cell", isSelected && "selected")}
        style={{
          ...style,
          position: "relative",
          // Fond rayé si jour indisponible avec créneau de travail
          ...(alerteIndisponible ? {
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(220,53,69,0.15) 4px, rgba(220,53,69,0.15) 8px)`,
            borderLeft: "3px solid #DC3545",
            outline: "1px solid #DC3545",
          } : {}),
        }}
        onClick={handleClick}
        title={alerteIndisponible ? `⚠️ Jour indisponible pour ${employe.nom}${noteActuelle ? ` | 📝 ${noteActuelle}` : ""}` : noteActuelle ? `📝 ${noteActuelle}` : undefined}
      >
        <span className="planning-cell-label">{line1}</span>
        {line2 && <span className="planning-cell-hours">{line2}</span>}
        {/* Indicateur alerte indisponible */}
        {alerteIndisponible && (
          <div
            style={{
              position: "absolute",
              top: 1,
              left: 1,
              fontSize: 8,
              lineHeight: 1,
              color: "#DC3545",
              fontWeight: "bold",
            }}
            title="Jour indisponible"
          >
            ⚠
          </div>
        )}
        {/* Indicateur verrouillage */}
        {employe.verrouille && (
          <div
            style={{
              position: "absolute",
              bottom: 1,
              right: 2,
              fontSize: 8,
              lineHeight: 1,
              color: "#DC3545",
              opacity: 0.7,
            }}
            title="Employé verrouillé — saisie bloquée"
          >
            🔒
          </div>
        )}
        {/* Indicateur note */}
        {noteActuelle && (
          <div
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#0D6EFD",
              flexShrink: 0,
            }}
            title={`Note : ${noteActuelle}`}
          />
        )}
      </div>

      {/* Sélecteur de brique */}
      {open && !noteMode && (
        <div
          className="absolute z-50 rounded shadow-lg border bg-white"
          style={{
            top: "100%",
            left: 0,
            minWidth: 280,
            maxHeight: 420,
            overflowY: "auto",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b"
            style={{ background: "var(--navy)", color: "white" }}
          >
            <div>
              <span
                className="text-xs font-bold uppercase tracking-wider block"
                style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}
              >
                {employe.nom} — {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][jour]}
              </span>
              <span
                className="text-xs opacity-70"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Reste {heuresRestantes.toFixed(1)}h / {employe.heuresHebdo}h
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Bouton note */}
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenNote(); }}
                className="opacity-70 hover:opacity-100 p-1 rounded hover:bg-white/20 transition-colors"
                title={noteActuelle ? `Modifier la note : "${noteActuelle}"` : "Ajouter une note"}
              >
                <StickyNote size={13} style={{ color: noteActuelle ? "#FFC107" : "white" }} />
              </button>
              <button onClick={() => { setOpen(false); setCelluleSelectionnee(null); }} className="opacity-70 hover:opacity-100 p-1">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Briques travail */}
          <div className="p-2">
            <div
              className="text-xs font-bold uppercase tracking-wider mb-1 px-1"
              style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Créneaux de travail
            </div>

            {briquesTravail.length === 0 && (
              <div className="flex items-center gap-2 px-2 py-2 text-xs rounded" style={{ background: "#FFF3CD", color: "#856404" }}>
                <AlertTriangle size={12} />
                <span>Aucun créneau compatible — heures hebdo atteintes ({employe.heuresHebdo}h)</span>
              </div>
            )}

            {briquesTravail.map(({ brique: b, postesCompatibles }) =>
              postesCompatibles.map((p: Poste) => {
                const c = COULEURS_POSTE[p];
                const isActive = poste === p && brique === b.code;
                return (
                  <button
                    key={`${b.code}-${p}`}
                    onClick={() => handleSelect(b.code, p)}
                    className="w-full text-left px-2 py-1.5 rounded mb-0.5 flex items-center justify-between hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: isActive ? c.border : c.bg,
                      color: isActive ? "white" : c.text,
                      border: `1px solid ${c.border}`,
                    }}
                  >
                    <div>
                      <div className="text-xs font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {p} — {b.duree}h
                      </div>
                      <div className="text-xs opacity-70">
                        {b.label}
                        {b.heureDebut && ` · ${b.heureDebut}${b.heureDebut2 ? `-${b.heureFin} / ${b.heureDebut2}-${b.heureFin2}` : `-${b.heureFin}`}`}
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-xs font-bold">✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Briques absence */}
          <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
            <div
              className="text-xs font-bold uppercase tracking-wider mb-1 px-1"
              style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Absences
            </div>
            <div className="grid grid-cols-2 gap-1">
              {briquesAbsence.map((b) => {
                const c = COULEURS_ABSENCE[b.code] || COULEURS_ABSENCE["REPOS"];
                const isActive = brique === b.code;
                return (
                  <button
                    key={b.code}
                    onClick={() => handleSelect(b.code, undefined)}
                    className="text-left px-2 py-1.5 rounded text-xs font-medium hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: isActive ? c.border : c.bg,
                      color: isActive ? "white" : c.text,
                      border: `1px solid ${c.border || "#ADB5BD"}`,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note existante */}
          {noteActuelle && (
            <div
              className="px-3 py-2 border-t flex items-start gap-2"
              style={{ borderColor: "var(--border)", background: "#FFFDE7" }}
            >
              <StickyNote size={12} style={{ color: "#856404", flexShrink: 0, marginTop: 1 }} />
              <span className="text-xs" style={{ color: "#5D4037" }}>{noteActuelle}</span>
            </div>
          )}
        </div>
      )}

      {/* Mode saisie note */}
      {open && noteMode && (
        <div
          className="absolute z-50 rounded shadow-lg border bg-white"
          style={{
            top: "100%",
            left: 0,
            minWidth: 260,
            border: "1px solid var(--border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2 border-b"
            style={{ background: "#FFF8E1", borderColor: "#FFC107" }}
          >
            <div className="flex items-center gap-2">
              <StickyNote size={13} style={{ color: "#856404" }} />
              <span className="text-xs font-bold" style={{ color: "#5D4037", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
                Note — {employe.nom} {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][jour]}
              </span>
            </div>
            <button onClick={() => setNoteMode(false)} className="opacity-60 hover:opacity-100">
              <X size={13} />
            </button>
          </div>
          <div className="p-3 space-y-2">
            <input
              ref={noteInputRef}
              type="text"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              placeholder="ex : Formation HACCP, Livraison matin..."
              maxLength={80}
              className="w-full px-3 py-2 text-xs border rounded"
              style={{
                borderColor: "#FFC107",
                fontFamily: "'IBM Plex Mono', monospace",
                outline: "none",
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace" }}>
                {noteValue.length}/80
              </span>
              <div className="flex gap-2">
                {noteActuelle && (
                  <button
                    onClick={() => { setNoteValue(""); }}
                    className="px-2 py-1 text-xs rounded border hover:bg-red-50 transition-colors"
                    style={{ borderColor: "#DC3545", color: "#DC3545" }}
                  >
                    Effacer
                  </button>
                )}
                <button
                  onClick={handleSaveNote}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white rounded"
                  style={{ background: "#856404" }}
                >
                  <Check size={11} />
                  Valider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
