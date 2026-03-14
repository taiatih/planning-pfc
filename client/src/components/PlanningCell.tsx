import { useState, useRef, useEffect } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import {
  BRIQUES, getBrique, COULEURS_POSTE, COULEURS_ABSENCE,
  Poste, BriqueHoraire, Employe,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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

  const heures = b.duree % 1 === 0 ? `${b.duree}h` : `${b.duree}h`;
  const horaire = b.heureDebut2
    ? `${b.heureDebut}-${b.heureFin} / ${b.heureDebut2}-${b.heureFin2}`
    : `${b.heureDebut}-${b.heureFin}`;

  return {
    line1: poste ? `${poste} — ${heures}` : `${heures}`,
    line2: horaire,
  };
}

export default function PlanningCell({ employeId, jour, brique, poste, employe, readOnly }: PlanningCellProps) {
  const { setCellule, celluleSelectionnee, setCelluleSelectionnee } = usePlanning();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isSelected = celluleSelectionnee?.employeId === employeId && celluleSelectionnee?.jour === jour;
  const style = getCellStyle(brique, poste);
  const { line1, line2 } = getCellLabel(brique, poste);

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

  // Briques disponibles pour cet employé
  const briquesDisponibles = BRIQUES.filter((b) => {
    if (b.type === "ABSENCE") return true;
    if (!b.postes) return true;
    return b.postes.some((p) => employe.postesAutorises.includes(p));
  });

  const briquesAbsence = briquesDisponibles.filter((b) => b.type === "ABSENCE");
  const briquesTravail = briquesDisponibles.filter((b) => b.type === "TRAVAIL");

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
            minWidth: 260,
            maxHeight: 380,
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
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}
            >
              {employe.nom} — {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][jour]}
            </span>
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
            {briquesTravail.map((b) => {
              // Postes disponibles pour cette brique
              const postesCompatibles = (b.postes || []).filter((p) =>
                employe.postesAutorises.includes(p)
              );
              return postesCompatibles.map((p) => {
                const c = COULEURS_POSTE[p];
                return (
                  <button
                    key={`${b.code}-${p}`}
                    onClick={() => handleSelect(b.code, p)}
                    className="w-full text-left px-2 py-1.5 rounded mb-0.5 flex items-center justify-between hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                  >
                    <div>
                      <div className="text-xs font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {p} — {b.duree % 1 === 0 ? `${b.duree}h` : `${b.duree}h`}
                      </div>
                      <div className="text-xs opacity-70">
                        {b.label}
                        {b.heureDebut && ` · ${b.heureDebut}${b.heureDebut2 ? `-${b.heureFin} / ${b.heureDebut2}-${b.heureFin2}` : `-${b.heureFin}`}`}
                      </div>
                    </div>
                    {poste === p && brique === b.code && (
                      <span className="text-xs opacity-60">✓</span>
                    )}
                  </button>
                );
              });
            })}
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
                return (
                  <button
                    key={b.code}
                    onClick={() => handleSelect(b.code, undefined)}
                    className="text-left px-2 py-1.5 rounded text-xs font-medium hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: c.bg,
                      color: c.text,
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
