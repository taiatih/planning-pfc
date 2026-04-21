// PFC Planning Manager — Page Rotation Mensuelle
// Tableau Sam/Dim par employé sur les 4 semaines du mois
// Design: "Terrain Pro" — Brutalisme fonctionnel, IBM Plex
// ============================================================
import React from "react";

import { useState, useMemo } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import {
  calculerRotationEquipe, getSemainesDuMois, JOURS_COURT,
  formatDate, addDays, dateToString,
} from "@/lib/data";
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Calendar } from "lucide-react";

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function RotationMensuelle() {
  const { employes, plannings } = usePlanning();
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());

  const rotations = useMemo(
    () => calculerRotationEquipe(employes, annee, mois, plannings),
    [employes, annee, mois, plannings]
  );

  const semaines = useMemo(() => getSemainesDuMois(annee, mois), [annee, mois]);

  const nbConformes = rotations.filter((r) => r.conformeSamedi && r.conformeDimanche).length;
  const nbNonConformes = rotations.length - nbConformes;

  const moisPrecedent = () => {
    if (mois === 1) { setMois(12); setAnnee((a) => a - 1); }
    else setMois((m) => m - 1);
  };
  const moisSuivant = () => {
    if (mois === 12) { setMois(1); setAnnee((a) => a + 1); }
    else setMois((m) => m + 1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── En-tête ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b bg-white flex-shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <Calendar size={18} style={{ color: "var(--navy)" }} />
          <h1
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Rotation Weekends — {MOIS_NOMS[mois - 1]} {annee}
          </h1>
        </div>

        {/* Navigation mois */}
        <div className="flex items-center gap-2">
          <button
            onClick={moisPrecedent}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            style={{ border: "1px solid var(--border)" }}
          >
            <ChevronLeft size={14} />
          </button>
          <span
            className="text-sm font-semibold px-2"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)", minWidth: 120, textAlign: "center" }}
          >
            {MOIS_NOMS[mois - 1]} {annee}
          </span>
          <button
            onClick={moisSuivant}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            style={{ border: "1px solid var(--border)" }}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Résumé conformité */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={13} style={{ color: "#28A745" }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#155724" }}>
              {nbConformes} conformes
            </span>
          </div>
          {nbNonConformes > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={13} style={{ color: "#E07B39" }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#7D3C00" }}>
                {nbNonConformes} à corriger
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Légende ── */}
      <div
        className="flex items-center gap-4 px-4 py-2 border-b flex-shrink-0 flex-wrap"
        style={{ borderColor: "var(--border)", background: "oklch(0.97 0.002 250)" }}
      >
        {[
          { bg: "#D4EDDA", border: "#28A745", label: "Travaillé" },
          { bg: "#FFE5CC", border: "#E07B39", label: "Absence (CP/Maladie)" },
          { bg: "#F0F0F0", border: "#ADB5BD", label: "Repos" },
          { bg: "#FFF3CD", border: "#FFC107", label: "Non planifié" },
        ].map(({ bg, border, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: bg, border: `2px solid ${border}` }} />
            <span className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}>
              {label}
            </span>
          </div>
        ))}
        <span className="text-xs ml-auto" style={{ color: "var(--muted-foreground)" }}>
          Règle : ≥ 1 Sam + ≥ 1 Dim travaillés par mois
        </span>
      </div>

      {/* ── Tableau ── */}
      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "var(--navy)" }}>
                <th
                  className="text-left px-4 py-3"
                  style={{
                    color: "white", fontSize: 11,
                    fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                    minWidth: 160,
                  }}
                >
                  Employé
                </th>
                <th
                  className="text-center px-3 py-3"
                  style={{
                    color: "white", fontSize: 11,
                    fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                    minWidth: 60,
                  }}
                >
                  Contrat
                </th>
                {semaines.map(({ semaine, lundi }) => (
                  <th
                    key={semaine}
                    colSpan={2}
                    className="text-center px-2 py-3"
                    style={{
                      color: "white", fontSize: 10,
                      fontFamily: "'IBM Plex Mono', monospace",
                      borderLeft: "1px solid rgba(255,255,255,0.15)",
                      minWidth: 100,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>S{semaine}</div>
                    <div style={{ opacity: 0.7, fontSize: 9 }}>
                      {formatDate(lundi).slice(0, 5)} → {formatDate(addDays(lundi, 6)).slice(0, 5)}
                    </div>
                  </th>
                ))}
                <th
                  colSpan={2}
                  className="text-center px-3 py-3"
                  style={{
                    color: "white", fontSize: 11,
                    fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                    borderLeft: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  Total mois
                </th>
                <th
                  className="text-center px-3 py-3"
                  style={{
                    color: "white", fontSize: 11,
                    fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                  }}
                >
                  Statut
                </th>
              </tr>
              {/* Sous-en-tête Sam/Dim */}
              <tr style={{ background: "oklch(0.25 0.04 250)" }}>
                <td colSpan={2} />
                {semaines.map(({ semaine }) => (
                  <>
                    <td
                      key={`${semaine}-sam`}
                      className="text-center py-1.5"
                      style={{
                        color: "rgba(255,255,255,0.8)", fontSize: 9,
                        fontFamily: "'IBM Plex Mono', monospace",
                        borderLeft: "1px solid rgba(255,255,255,0.1)",
                        fontWeight: 700,
                      }}
                    >
                      SAM
                    </td>
                    <td
                      key={`${semaine}-dim`}
                      className="text-center py-1.5"
                      style={{
                        color: "rgba(255,255,255,0.8)", fontSize: 9,
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 700,
                      }}
                    >
                      DIM
                    </td>
                  </>
                ))}
                <td
                  className="text-center py-1.5"
                  style={{
                    color: "rgba(255,255,255,0.8)", fontSize: 9,
                    fontFamily: "'IBM Plex Mono', monospace",
                    borderLeft: "1px solid rgba(255,255,255,0.2)",
                    fontWeight: 700,
                  }}
                >
                  SAM
                </td>
                <td
                  className="text-center py-1.5"
                  style={{
                    color: "rgba(255,255,255,0.8)", fontSize: 9,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 700,
                  }}
                >
                  DIM
                </td>
                <td />
              </tr>
            </thead>
            <tbody>
              {rotations.map((rot, idx) => {
                const { employe, semaines: sems, totalSamedis, totalDimanches, conformeSamedi, conformeDimanche } = rot;
                const conforme = conformeSamedi && conformeDimanche;
                const joursIndisp = employe.joursIndisponibles || [];

                return (
                  <tr
                    key={employe.id}
                    style={{ background: idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}
                  >
                    {/* Nom */}
                    <td className="px-4 py-2">
                      <div className="font-semibold text-xs" style={{ color: "var(--navy)" }}>
                        {employe.nom}
                      </div>
                      {joursIndisp.length > 0 && (
                        <div className="text-xs mt-0.5" style={{ color: "#856404", fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}>
                          Indisp: {joursIndisp.map((j) => ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"][j]).join(", ")}
                        </div>
                      )}
                    </td>

                    {/* Contrat */}
                    <td className="text-center px-3 py-2">
                      <span className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}>
                        {employe.heuresHebdo}h
                      </span>
                    </td>

                    {/* Cellules Sam/Dim par semaine */}
                    {sems.map((sem) => (
                      <React.Fragment key={`${sem.semaine}-${sem.annee}`}>
                        <CelluleWeekend
                          travaille={sem.samediTravaille}
                          absence={sem.samediAbsence}
                          indisponible={joursIndisp.includes(5)}
                          planifie={plannings.some((p) => p.semaine === sem.semaine && p.annee === sem.annee)}
                        />
                        <CelluleWeekend
                          travaille={sem.dimancheTravaille}
                          absence={sem.dimancheAbsence}
                          indisponible={joursIndisp.includes(6)}
                          planifie={plannings.some((p) => p.semaine === sem.semaine && p.annee === sem.annee)}
                        />
                      </React.Fragment>
                    ))}

                    {/* Total mois */}
                    <td className="text-center px-3 py-2" style={{ borderLeft: "2px solid var(--border)" }}>
                      <span
                        className="font-bold text-xs"
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: conformeSamedi ? "#155724" : "#7D3C00",
                        }}
                      >
                        {totalSamedis}
                      </span>
                    </td>
                    <td className="text-center px-3 py-2">
                      <span
                        className="font-bold text-xs"
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: conformeDimanche ? "#155724" : "#7D3C00",
                        }}
                      >
                        {totalDimanches}
                      </span>
                    </td>

                    {/* Statut */}
                    <td className="text-center px-3 py-2">
                      {conforme ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: "#D4EDDA" }}>
                          <CheckCircle size={10} style={{ color: "#28A745" }} />
                          <span className="text-xs font-semibold" style={{ color: "#155724", fontFamily: "'IBM Plex Mono', monospace" }}>OK</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: "#FFF3CD" }}>
                          <AlertTriangle size={10} style={{ color: "#E07B39" }} />
                          <span className="text-xs font-semibold" style={{ color: "#7D3C00", fontFamily: "'IBM Plex Mono', monospace" }}>
                            {!conformeSamedi && !conformeDimanche ? "0 WE" : !conformeSamedi ? "0 Sam" : "0 Dim"}
                          </span>
                        </div>
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

// Composant cellule weekend
function CelluleWeekend({
  travaille, absence, indisponible, planifie,
}: {
  travaille: boolean;
  absence: boolean;
  indisponible: boolean;
  planifie: boolean;
}) {
  let bg = "#F0F0F0";
  let color = "#6C757D";
  let border = "#ADB5BD";
  let label = "—";

  if (indisponible) {
    bg = "#F5F5F5"; color = "#CCC"; border = "#DDD"; label = "N/D";
  } else if (travaille) {
    bg = "#D4EDDA"; color = "#155724"; border = "#28A745"; label = "✓";
  } else if (absence) {
    bg = "#FFE5CC"; color = "#7D3C00"; border = "#E07B39"; label = "ABS";
  } else if (!planifie) {
    bg = "#FFF3CD"; color = "#856404"; border = "#FFC107"; label = "?";
  }

  return (
    <td className="text-center py-1.5 px-1" style={{ borderLeft: "1px solid var(--border)" }}>
      <div
        className="mx-auto rounded text-center"
        style={{
          width: 28, height: 22, lineHeight: "22px",
          backgroundColor: bg, color, border: `1px solid ${border}`,
          fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700,
        }}
      >
        {label}
      </div>
    </td>
  );
}
