// PFC Planning Manager — Vue Gantt Hebdomadaire
// Design: "Terrain Pro" — Brutalisme fonctionnel, IBM Plex
// Diagramme horizontal : employés en lignes, heures en colonnes (07h-20h)
// Ligne verticale "heure actuelle" pour voir la couverture en cours
// ============================================================

import { useState, useEffect, useRef } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import {
  getBrique, COULEURS_POSTE, COULEURS_ABSENCE,
  formatDate, addDays, getNumeroSemaine, getLundiDeSemaine, heureToNum,
  JOURS_COURT, Poste,
} from "@/lib/data";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

// Plage horaire affichée : 07h00 à 20h00
const HEURE_DEBUT = 7;
const HEURE_FIN = 20;
const TOTAL_HEURES = HEURE_FIN - HEURE_DEBUT; // 13h

// Convertit une heure "HH:MM" en position % dans la plage
function heureToPercent(heure: string): number {
  const val = heureToNum(heure); // retourne en heures décimales
  return Math.max(0, Math.min(100, ((val - HEURE_DEBUT) / TOTAL_HEURES) * 100));
}

// Convertit des minutes depuis minuit en position %
function minutesToPercent(minutes: number): number {
  const heures = minutes / 60;
  return Math.max(0, Math.min(100, ((heures - HEURE_DEBUT) / TOTAL_HEURES) * 100));
}

// Génère les ticks horaires (toutes les heures)
const TICKS = Array.from({ length: TOTAL_HEURES + 1 }, (_, i) => HEURE_DEBUT + i);

const JOURS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function Gantt() {
  const { employes, planningActuel, semaineCourante, semaineSuivante, semainePrecedente } = usePlanning();
  const [jourSelectionne, setJourSelectionne] = useState<number>(() => {
    // Sélectionner le jour actuel si c'est la semaine courante
    const now = new Date();
    const lundi = getLundiDeSemaine(now);
    const lundiSemaine = getLundiDeSemaine(semaineCourante);
    if (lundi.toDateString() === lundiSemaine.toDateString()) {
      return (now.getDay() + 6) % 7; // 0=Lun
    }
    return 0;
  });

  const [heureActuelle, setHeureActuelle] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [dateActuelle, setDateActuelle] = useState(() => new Date());

  // Mise à jour toutes les minutes
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setHeureActuelle(now.getHours() * 60 + now.getMinutes());
      setDateActuelle(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const semaine = getNumeroSemaine(semaineCourante);
  const actifs = employes.filter((e) => e.actif);

  // Vérifier si c'est la semaine courante pour afficher la ligne "maintenant"
  const lundiSemaineCourante = getLundiDeSemaine(semaineCourante);
  const lundiAujourdhui = getLundiDeSemaine(dateActuelle);
  const estSemaineCourante = lundiSemaineCourante.toDateString() === lundiAujourdhui.toDateString();
  const jourActuel = estSemaineCourante ? ((dateActuelle.getDay() + 6) % 7) : -1;
  const afficherLigneNow = estSemaineCourante && jourSelectionne === jourActuel;
  const positionNow = minutesToPercent(heureActuelle);

  // Calculer les barres pour chaque employé pour le jour sélectionné
  const barresEmployes = actifs.map((emp) => {
    const cellule = planningActuel?.cellules.find(
      (c) => c.employeId === emp.id && c.jour === jourSelectionne
    );
    if (!cellule) return { employe: emp, barres: [] as { debut: number; fin: number; poste?: Poste; label: string; couleur: { bg: string; text: string; border: string } }[], absent: true };

    const b = getBrique(cellule.brique);
    if (!b) return { employe: emp, barres: [], absent: true };

    if (b.type === "ABSENCE") {
      const c = COULEURS_ABSENCE[b.code] || COULEURS_ABSENCE["REPOS"];
      return {
        employe: emp,
        barres: [{ debut: 0, fin: 100, poste: undefined, label: b.label, couleur: c }],
        absent: true,
        absenceLabel: b.label,
        absenceCouleur: c,
      };
    }

    const barres = [];
    // Période 1
    const d1 = heureToPercent(b.heureDebut);
    const f1 = heureToPercent(b.heureFin);
    if (f1 > d1) {
      const c = cellule.poste ? COULEURS_POSTE[cellule.poste] : { bg: "#E8F5E9", text: "#155724", border: "#28A745" };
      barres.push({ debut: d1, fin: f1, poste: cellule.poste, label: `${b.heureDebut}–${b.heureFin}`, couleur: c });
    }
    // Période 2
    if (b.heureDebut2 && b.heureFin2) {
      const d2 = heureToPercent(b.heureDebut2);
      const f2 = heureToPercent(b.heureFin2);
      if (f2 > d2) {
        const c = cellule.poste ? COULEURS_POSTE[cellule.poste] : { bg: "#E8F5E9", text: "#155724", border: "#28A745" };
        barres.push({ debut: d2, fin: f2, poste: cellule.poste, label: `${b.heureDebut2}–${b.heureFin2}`, couleur: c });
      }
    }

    return { employe: emp, barres, absent: false };
  });

  // Compter les présents par heure (pour la ligne de couverture en bas)
  const couvertureParTick = TICKS.map((h) => {
    const hMin = h * 60;
    return actifs.filter((emp) => {
      const cellule = planningActuel?.cellules.find(
        (c) => c.employeId === emp.id && c.jour === jourSelectionne
      );
      if (!cellule) return false;
      const b = getBrique(cellule.brique);
      if (!b || b.type === "ABSENCE") return false;
      const d1 = heureToNum(b.heureDebut) * 60;
      const f1 = heureToNum(b.heureFin) * 60;
      const d2 = b.heureDebut2 ? heureToNum(b.heureDebut2) * 60 : null;
      const f2 = b.heureFin2 ? heureToNum(b.heureFin2) * 60 : null;
      return (hMin >= d1 && hMin < f1) || (d2 !== null && f2 !== null && hMin >= d2 && hMin < f2);
    }).length;
  });

  const maxCouverture = Math.max(...couvertureParTick, 1);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-black uppercase tracking-wider"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Vue Gantt — S{semaine} {semaineCourante.getFullYear()}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {formatDate(semaineCourante)} → {formatDate(addDays(semaineCourante, 6))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={semainePrecedente}
            className="p-2 rounded border hover:bg-gray-50 transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={semaineSuivante}
            className="p-2 rounded border hover:bg-gray-50 transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Sélecteur de jour */}
      <div className="flex gap-1">
        {JOURS_COURT.map((j, idx) => {
          const date = addDays(semaineCourante, idx);
          const isToday = estSemaineCourante && jourActuel === idx;
          const isSelected = jourSelectionne === idx;
          return (
            <button
              key={j}
              onClick={() => setJourSelectionne(idx)}
              className="flex-1 py-2 rounded text-xs font-semibold transition-all"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                background: isSelected ? "var(--navy)" : isToday ? "#E8F4FD" : "white",
                color: isSelected ? "white" : isToday ? "#1A5276" : "var(--muted-foreground)",
                border: `1px solid ${isSelected ? "var(--navy)" : isToday ? "#85C1E9" : "var(--border)"}`,
                fontWeight: isToday ? "bold" : "normal",
              }}
            >
              <div>{j}</div>
              <div className="text-xs opacity-70">{formatDate(date).slice(0, 5)}</div>
              {isToday && (
                <div className="text-xs mt-0.5" style={{ color: isSelected ? "#4ADE80" : "#2980B9" }}>
                  ● Auj.
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Diagramme Gantt */}
      <div
        className="bg-white border rounded overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        {/* En-tête horaire */}
        <div
          className="flex border-b"
          style={{ borderColor: "var(--border)", background: "oklch(0.97 0.002 250)" }}
        >
          {/* Colonne nom */}
          <div
            className="flex-shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wider"
            style={{ width: 140, fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            {JOURS_FULL[jourSelectionne]} {formatDate(addDays(semaineCourante, jourSelectionne)).slice(0, 5)}
          </div>
          {/* Ticks horaires */}
          <div className="flex-1 relative" style={{ height: 32 }}>
            {TICKS.map((h) => (
              <div
                key={h}
                className="absolute top-0 h-full flex flex-col items-center"
                style={{ left: `${((h - HEURE_DEBUT) / TOTAL_HEURES) * 100}%`, transform: "translateX(-50%)" }}
              >
                <div
                  className="h-full border-l"
                  style={{ borderColor: "var(--border)", borderStyle: h % 2 === 0 ? "solid" : "dashed" }}
                />
                <span
                  className="absolute bottom-1 text-xs"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: "var(--muted-foreground)",
                    fontSize: 9,
                    transform: "translateX(-50%)",
                  }}
                >
                  {h}h
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Lignes employés */}
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {barresEmployes.map(({ employe: emp, barres, absent, absenceLabel, absenceCouleur }, idx) => {
            const c = COULEURS_POSTE[emp.postePrincipal];
            return (
              <div
                key={emp.id}
                className="flex items-center"
                style={{
                  background: idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)",
                  minHeight: 44,
                }}
              >
                {/* Nom */}
                <div
                  className="flex-shrink-0 px-3 py-2"
                  style={{ width: 140 }}
                >
                  <div
                    className="text-xs font-semibold"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)" }}
                  >
                    {emp.nom}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className="text-xs px-1 rounded"
                      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {emp.postePrincipal}
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)", fontSize: 9 }}>
                      {emp.heuresHebdo}h
                    </span>
                  </div>
                </div>

                {/* Zone Gantt */}
                <div className="flex-1 relative" style={{ height: 44 }}>
                  {/* Grille verticale */}
                  {TICKS.map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 h-full border-l"
                      style={{
                        left: `${((h - HEURE_DEBUT) / TOTAL_HEURES) * 100}%`,
                        borderColor: "var(--border)",
                        borderStyle: h % 2 === 0 ? "solid" : "dashed",
                        opacity: 0.5,
                      }}
                    />
                  ))}

                  {/* Absence pleine ligne */}
                  {absent && absenceLabel && absenceCouleur && (
                    <div
                      className="absolute inset-y-2 flex items-center px-2 rounded"
                      style={{
                        left: "2%",
                        right: "2%",
                        backgroundColor: absenceCouleur.bg,
                        border: `1px solid ${absenceCouleur.border || "#ADB5BD"}`,
                        color: absenceCouleur.text,
                      }}
                    >
                      <span className="text-xs font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {absenceLabel}
                      </span>
                    </div>
                  )}

                  {/* Barres de travail */}
                  {!absent && barres.map((barre, i) => (
                    <div
                      key={i}
                      className="absolute inset-y-2 rounded flex items-center px-2 overflow-hidden"
                      style={{
                        left: `${barre.debut}%`,
                        width: `${barre.fin - barre.debut}%`,
                        backgroundColor: barre.couleur.bg,
                        border: `1px solid ${barre.couleur.border}`,
                        color: barre.couleur.text,
                        minWidth: 4,
                      }}
                      title={`${emp.nom} — ${barre.label}${barre.poste ? ` (${barre.poste})` : ""}`}
                    >
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}
                      >
                        {barre.poste || barre.label}
                      </span>
                    </div>
                  ))}

                  {/* Ligne "maintenant" */}
                  {afficherLigneNow && positionNow > 0 && positionNow < 100 && (
                    <div
                      className="absolute top-0 h-full border-l-2 z-10"
                      style={{
                        left: `${positionNow}%`,
                        borderColor: "#DC3545",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ligne de couverture (mini graphique en bas) */}
        <div
          className="border-t"
          style={{ borderColor: "var(--border)", background: "oklch(0.97 0.002 250)" }}
        >
          <div className="flex items-end" style={{ height: 40 }}>
            {/* Label */}
            <div
              className="flex-shrink-0 px-3 flex items-center"
              style={{ width: 140, height: 40 }}
            >
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)", fontSize: 9 }}
              >
                Couverture
              </span>
            </div>
            {/* Mini barres */}
            <div className="flex-1 flex items-end px-1" style={{ height: 40, gap: 1 }}>
              {couvertureParTick.slice(0, -1).map((count, i) => {
                const pct = (count / maxCouverture) * 100;
                const color = count === 0 ? "#DC3545" : count < 3 ? "#FFC107" : "#28A745";
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      backgroundColor: color,
                      opacity: 0.7,
                      minWidth: 2,
                    }}
                    title={`${HEURE_DEBUT + i}h : ${count} pers.`}
                  />
                );
              })}
            </div>
          </div>
          {/* Ligne "maintenant" sur la couverture */}
          {afficherLigneNow && positionNow > 0 && positionNow < 100 && (
            <div className="relative" style={{ height: 0 }}>
              <div
                className="absolute border-l-2"
                style={{
                  left: `calc(140px + ${positionNow}% * (100% - 140px) / 100)`,
                  top: -40,
                  height: 40,
                  borderColor: "#DC3545",
                  pointerEvents: "none",
                }}
              />
            </div>
          )}
        </div>

        {/* Légende + heure actuelle */}
        <div
          className="px-4 py-2 border-t flex items-center justify-between flex-wrap gap-2"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            {(["F&L", "SEC", "FRAIS", "CAISSE"] as Poste[]).map((p) => {
              const c = COULEURS_POSTE[p];
              return (
                <div key={p} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: c.border }} />
                  <span className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: c.text }}>{p}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border-l-2" style={{ borderColor: "#DC3545", background: "transparent" }} />
              <span className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#DC3545" }}>Maintenant</span>
            </div>
          </div>
          {afficherLigneNow && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} style={{ color: "#DC3545" }} />
              <span
                className="text-xs font-semibold"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#DC3545" }}
              >
                {Math.floor(heureActuelle / 60).toString().padStart(2, "0")}h{(heureActuelle % 60).toString().padStart(2, "0")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
