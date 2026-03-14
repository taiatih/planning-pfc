// PFC Planning Manager — Page Seuils Minimum
// Configuration des effectifs minimum par secteur et plage horaire
// Le manager définit combien de personnes minimum par poste
// ============================================================

import { useState, useCallback } from "react";
import {
  COULEURS_POSTE, Poste, SeuilSecteur,
  chargerSeuils, sauvegarderSeuils, SEUILS_DEFAUT,
} from "@/lib/data";
import { Plus, Trash2, Save, RotateCcw, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const POSTES: Poste[] = ["F&L", "SEC", "FRAIS", "CAISSE"];

const HEURES = [
  "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30",
  "19:00","19:30","20:00",
];

export default function Seuils() {
  const [seuils, setSeuils] = useState<SeuilSecteur[]>(() => chargerSeuils());
  const [saved, setSaved] = useState(false);
  const [posteFiltre, setPosteFiltre] = useState<Poste | "TOUS">("TOUS");

  const seuilsFiltres = posteFiltre === "TOUS"
    ? seuils
    : seuils.filter((s) => s.poste === posteFiltre);

  const handleChange = useCallback((idx: number, field: keyof SeuilSecteur, value: string | number | Poste) => {
    setSeuils((prev) => {
      const updated = [...prev];
      // Trouver l'index réel dans le tableau complet
      const realIdx = prev.indexOf(seuilsFiltres[idx]);
      updated[realIdx] = { ...updated[realIdx], [field]: value };
      return updated;
    });
    setSaved(false);
  }, [seuilsFiltres]);

  const ajouterSeuil = useCallback(() => {
    const nouveau: SeuilSecteur = {
      poste: posteFiltre === "TOUS" ? "SEC" : posteFiltre,
      heureDebut: "09:00",
      heureFin: "13:00",
      minimum: 1,
      label: "",
    };
    setSeuils((prev) => [...prev, nouveau]);
    setSaved(false);
  }, [posteFiltre]);

  const supprimerSeuil = useCallback((idx: number) => {
    setSeuils((prev) => {
      const realIdx = prev.indexOf(seuilsFiltres[idx]);
      return prev.filter((_, i) => i !== realIdx);
    });
    setSaved(false);
  }, [seuilsFiltres]);

  const sauvegarder = useCallback(() => {
    sauvegarderSeuils(seuils);
    setSaved(true);
    toast.success("Seuils sauvegardés", {
      description: `${seuils.length} règles enregistrées`,
    });
  }, [seuils]);

  const reinitialiser = useCallback(() => {
    setSeuils(SEUILS_DEFAUT);
    sauvegarderSeuils(SEUILS_DEFAUT);
    setSaved(true);
    toast.info("Seuils réinitialisés aux valeurs par défaut");
  }, []);

  return (
    <div className="p-6 space-y-5">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Seuils d'effectif minimum
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Définissez le nombre minimum d'employés requis par secteur et plage horaire
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reinitialiser}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors hover:bg-muted"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            <RotateCcw size={13} />
            Réinitialiser
          </button>
          <button
            onClick={sauvegarder}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded text-white transition-colors"
            style={{ background: saved ? "#28A745" : "var(--navy)" }}
          >
            {saved ? <CheckCircle size={13} /> : <Save size={13} />}
            {saved ? "Sauvegardé" : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* ── Explication ── */}
      <div
        className="rounded border px-4 py-3 flex items-start gap-3"
        style={{ background: "#D0E8F5", borderColor: "#2980B9" }}
      >
        <AlertTriangle size={16} style={{ color: "#0A3D62", marginTop: 1 }} />
        <div className="text-xs" style={{ color: "#0A3D62", fontFamily: "'IBM Plex Mono', monospace" }}>
          <strong>Comment ça marche :</strong> Pour chaque règle, définissez un secteur, une plage horaire et le nombre minimum d'employés requis.
          La vue <strong>Couverture</strong> signalera en rouge toute tranche horaire où l'effectif réel est inférieur à ce seuil.
          Exemple : "CAISSE — 09:00–13:00 — min 2" = il faut au moins 2 caissiers le matin.
        </div>
      </div>

      {/* ── Filtres par poste ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setPosteFiltre("TOUS")}
          className="px-3 py-1.5 rounded text-xs font-semibold border transition-colors"
          style={{
            background: posteFiltre === "TOUS" ? "var(--navy)" : "white",
            color: posteFiltre === "TOUS" ? "white" : "var(--navy)",
            borderColor: "var(--navy)",
            fontFamily: "'IBM Plex Sans Condensed', sans-serif",
          }}
        >
          Tous ({seuils.length})
        </button>
        {POSTES.map((p) => {
          const c = COULEURS_POSTE[p];
          const count = seuils.filter((s) => s.poste === p).length;
          return (
            <button
              key={p}
              onClick={() => setPosteFiltre(p)}
              className="px-3 py-1.5 rounded text-xs font-semibold border transition-colors"
              style={{
                background: posteFiltre === p ? c.border : c.bg,
                color: posteFiltre === p ? "white" : c.text,
                borderColor: c.border,
                fontFamily: "'IBM Plex Sans Condensed', sans-serif",
              }}
            >
              {p} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Tableau des seuils ── */}
      <div className="bg-white border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)", background: "oklch(0.97 0.002 250)" }}
        >
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            {seuilsFiltres.length} règle{seuilsFiltres.length > 1 ? "s" : ""}
            {posteFiltre !== "TOUS" ? ` — ${posteFiltre}` : ""}
          </h2>
          <button
            onClick={ajouterSeuil}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded text-white transition-colors"
            style={{ background: "var(--navy)" }}
          >
            <Plus size={13} />
            Ajouter une règle
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "oklch(0.95 0.003 250)" }}>
                <th className="text-left px-4 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Secteur
                </th>
                <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Libellé
                </th>
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Début
                </th>
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Fin
                </th>
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Min. personnes
                </th>
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {seuilsFiltres.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    Aucune règle pour ce secteur — cliquez sur "Ajouter une règle"
                  </td>
                </tr>
              )}
              {seuilsFiltres.map((seuil, idx) => {
                const c = COULEURS_POSTE[seuil.poste];
                return (
                  <tr
                    key={idx}
                    style={{ background: idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}
                  >
                    {/* Secteur */}
                    <td className="px-4 py-2">
                      <select
                        value={seuil.poste}
                        onChange={(e) => handleChange(idx, "poste", e.target.value as Poste)}
                        className="px-2 py-1 rounded border text-xs font-semibold"
                        style={{
                          background: c.bg,
                          color: c.text,
                          borderColor: c.border,
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >
                        {POSTES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    {/* Libellé */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={seuil.label || ""}
                        onChange={(e) => handleChange(idx, "label", e.target.value)}
                        placeholder="ex: CAISSE Matin"
                        className="w-full px-2 py-1 rounded border text-xs"
                        style={{
                          borderColor: "var(--border)",
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: "var(--navy)",
                          minWidth: 140,
                        }}
                      />
                    </td>
                    {/* Début */}
                    <td className="px-3 py-2 text-center">
                      <select
                        value={seuil.heureDebut}
                        onChange={(e) => handleChange(idx, "heureDebut", e.target.value)}
                        className="px-2 py-1 rounded border text-xs"
                        style={{
                          borderColor: "var(--border)",
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: "var(--navy)",
                        }}
                      >
                        {HEURES.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                    {/* Fin */}
                    <td className="px-3 py-2 text-center">
                      <select
                        value={seuil.heureFin}
                        onChange={(e) => handleChange(idx, "heureFin", e.target.value)}
                        className="px-2 py-1 rounded border text-xs"
                        style={{
                          borderColor: "var(--border)",
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: "var(--navy)",
                        }}
                      >
                        {HEURES.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                    {/* Minimum */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleChange(idx, "minimum", Math.max(0, seuil.minimum - 1))}
                          className="w-6 h-6 rounded border flex items-center justify-center font-bold hover:bg-muted transition-colors"
                          style={{ borderColor: "var(--border)", color: "var(--navy)", fontSize: 14 }}
                        >
                          −
                        </button>
                        <span
                          className="w-8 text-center font-bold text-sm"
                          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)" }}
                        >
                          {seuil.minimum}
                        </span>
                        <button
                          onClick={() => handleChange(idx, "minimum", seuil.minimum + 1)}
                          className="w-6 h-6 rounded border flex items-center justify-center font-bold hover:bg-muted transition-colors"
                          style={{ borderColor: "var(--border)", color: "var(--navy)", fontSize: 14 }}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => supprimerSeuil(idx)}
                        className="p-1.5 rounded hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} style={{ color: "#DC3545" }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Visualisation rapide ── */}
      <div className="bg-white border rounded p-4" style={{ borderColor: "var(--border)" }}>
        <h3
          className="text-sm font-bold uppercase tracking-wider mb-4"
          style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
        >
          Aperçu des plages couvertes par secteur
        </h3>
        <div className="space-y-3">
          {POSTES.map((poste) => {
            const c = COULEURS_POSTE[poste];
            const seuilsPoste = seuils.filter((s) => s.poste === poste);
            return (
              <div key={poste} className="flex items-center gap-3">
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: "'IBM Plex Mono', monospace", minWidth: 52, textAlign: "center" }}
                >
                  {poste}
                </span>
                <div className="flex-1 flex gap-1 flex-wrap">
                  {seuilsPoste.map((s, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        background: c.bg,
                        color: c.text,
                        border: `1px solid ${c.border}`,
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                      }}
                    >
                      {s.heureDebut}–{s.heureFin} min<strong>{s.minimum}</strong>
                    </span>
                  ))}
                  {seuilsPoste.length === 0 && (
                    <span className="text-xs text-muted-foreground italic" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      Aucun seuil défini
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
