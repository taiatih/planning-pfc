// PFC Planning Manager — Composant PlanningCell
// Cellule cliquable avec sélecteur de créneau filtré intelligemment
// ============================================================

import { useState, useRef, useEffect, useMemo } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import {
  getBrique, getCreneauxDisponibles, calculerHeuresEmploye,
  COULEURS_POSTE, COULEURS_ABSENCE,
  Poste, Employe,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { X, AlertTriangle } from "lucide-react";

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
  const { setCellule, celluleSelectionnee, setCelluleSelectionnee, planningActuel } = usePlanning();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isSelected = celluleSelectionnee?.employeId === employeId && celluleSelectionnee?.jour === jour;
  const style = getCellStyle(brique, poste);
  const { line1, line2 } = getCellLabel(brique, poste);

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
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = () => {
    if (readOnly) return;
    setCelluleSelectionnee({ employeId, jour });
    setOpen(true);
  };

  const handleSelect = (newBrique: string, newPoste?: Poste) => {
    setCellule(employeId, jour, newBrique, newPoste);
    setOpen(false);
    setCelluleSelectionnee(null);
  };

  return (
    <div ref={ref} className="relative">
      <div
        className={cn("planning-cell", isSelected && "selected")}
        style={style}
        onClick={handleClick}
      >
        <span className="planning-cell-label">{line1}</span>
        {line2 && <span className="planning-cell-hours">{line2}</span>}
      </div>

      {/* Sélecteur de brique */}
      {open && (
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
            <button onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
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
        </div>
      )}
    </div>
  );
}
