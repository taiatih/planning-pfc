// PFC Planning Manager — Page Paramètres
// Éditeur CRUD complet des créneaux + export + reset
// ============================================================

import { useState, useCallback } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import {
  chargerBriques, sauvegarderBriques, reinitialiserBriques,
  BRIQUES_DEFAUT, COULEURS_POSTE, COULEURS_ABSENCE,
  Poste, BriqueHoraire,
  JourSpecial, TypeJourSpecial,
  chargerJoursSpeciaux, sauvegarderJoursSpeciaux,
  calculerFeriesLegaux, COULEURS_JOUR_SPECIAL,
} from "@/lib/data";
import {
  Settings, Database, Palette, Clock, AlertTriangle,
  Plus, Trash2, Save, RotateCcw, Edit3, X, Check, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

const POSTES: Poste[] = ["F&L", "SEC", "FRAIS", "CAISSE"];
const HEURES_OPTIONS: string[] = [];
for (let h = 7; h <= 20; h++) {
  HEURES_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 20) HEURES_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

function genererCode(label: string): string {
  return label
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
}

function calculerDuree(h1: string, h2: string, h3?: string, h4?: string): number {
  const toNum = (s: string) => { const [a, b] = s.split(":").map(Number); return a + b / 60; };
  let d = toNum(h2) - toNum(h1);
  if (h3 && h4) d += toNum(h4) - toNum(h3);
  return Math.round(d * 10) / 10;
}

interface BriqueEditState {
  code: string;
  label: string;
  heureDebut: string;
  heureFin: string;
  heureDebut2: string;
  heureFin2: string;
  type: "TRAVAIL" | "ABSENCE";
  postes: Poste[];
  hasCoupure: boolean;
}

function briqueToEdit(b: BriqueHoraire): BriqueEditState {
  return {
    code: b.code,
    label: b.label,
    heureDebut: b.heureDebut || "09:00",
    heureFin: b.heureFin || "17:00",
    heureDebut2: b.heureDebut2 || "14:00",
    heureFin2: b.heureFin2 || "18:00",
    type: b.type,
    postes: b.postes || [],
    hasCoupure: !!(b.heureDebut2 && b.heureFin2),
  };
}

function editToBrique(e: BriqueEditState): BriqueHoraire {
  const duree = e.type === "ABSENCE" ? 0 : calculerDuree(
    e.heureDebut, e.heureFin,
    e.hasCoupure ? e.heureDebut2 : undefined,
    e.hasCoupure ? e.heureFin2 : undefined
  );
  return {
    code: e.code,
    label: e.label,
    heureDebut: e.type === "ABSENCE" ? "" : e.heureDebut,
    heureFin: e.type === "ABSENCE" ? "" : e.heureFin,
    heureDebut2: e.type === "ABSENCE" || !e.hasCoupure ? undefined : e.heureDebut2,
    heureFin2: e.type === "ABSENCE" || !e.hasCoupure ? undefined : e.heureFin2,
    duree,
    type: e.type,
    postes: e.type === "ABSENCE" ? undefined : e.postes,
  };
}

const MOIS_NOMS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export default function Parametres() {
  const { employes } = usePlanning();
  const [activeTab, setActiveTab] = useState<"briques" | "postes" | "calendrier" | "export" | "reset">("briques");
  const [briques, setBriques] = useState<BriqueHoraire[]>(() => chargerBriques());
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editState, setEditState] = useState<BriqueEditState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "TRAVAIL" | "ABSENCE">("all");

  // État onglet Calendrier
  const anneeActuelle = new Date().getFullYear();
  const [anneeCalendrier, setAnneeCalendrier] = useState(anneeActuelle);
  const [joursCustom, setJoursCustom] = useState<JourSpecial[]>(() => chargerJoursSpeciaux());
  const [newAidType, setNewAidType] = useState<"AID_FITR" | "AID_ADHA">("AID_FITR");
  const [newAidDate, setNewAidDate] = useState("");
  const [newAidLabel, setNewAidLabel] = useState("");

  const feriesLegaux = calculerFeriesLegaux(anneeCalendrier);
  const joursCustomAnnee = joursCustom.filter((j) => j.annee === anneeCalendrier);

  const handleAjouterAid = useCallback(() => {
    if (!newAidDate) { toast.error("Sélectionnez une date"); return; }
    const annee = parseInt(newAidDate.slice(0, 4));
    const label = newAidLabel.trim() || (newAidType === "AID_FITR" ? "Aïd el-Fitr" : "Aïd el-Adha");
    const id = `aid-${newAidType.toLowerCase()}-${newAidDate}`;
    const nouveau: JourSpecial = { id, date: newAidDate, type: newAidType, label, annee };
    const updated = joursCustom.filter((j) => j.id !== id);
    updated.push(nouveau);
    updated.sort((a, b) => a.date.localeCompare(b.date));
    sauvegarderJoursSpeciaux(updated);
    setJoursCustom(updated);
    setNewAidDate("");
    setNewAidLabel("");
    toast.success(`${label} ajouté au calendrier`);
  }, [joursCustom, newAidType, newAidDate, newAidLabel]);

  const handleSupprimerAid = useCallback((id: string) => {
    const updated = joursCustom.filter((j) => j.id !== id);
    sauvegarderJoursSpeciaux(updated);
    setJoursCustom(updated);
    toast.success("Fête supprimée");
  }, [joursCustom]);

  const briquesFiltrees = briques.filter((b) =>
    filterType === "all" ? true : b.type === filterType
  );

  const refreshBriques = useCallback(() => {
    setBriques(chargerBriques());
  }, []);

  const handleSaveBriques = useCallback(() => {
    sauvegarderBriques(briques);
    toast.success("Créneaux sauvegardés");
  }, [briques]);

  const handleResetBriques = useCallback(() => {
    if (confirm("Réinitialiser tous les créneaux aux valeurs par défaut ?")) {
      reinitialiserBriques();
      setBriques(BRIQUES_DEFAUT);
      toast.success("Créneaux réinitialisés");
    }
  }, []);

  const startEdit = useCallback((b: BriqueHoraire) => {
    setEditingCode(b.code);
    setEditState(briqueToEdit(b));
    setIsCreating(false);
  }, []);

  const startCreate = useCallback(() => {
    setEditingCode("__new__");
    setEditState({
      code: "",
      label: "",
      heureDebut: "09:00",
      heureFin: "17:00",
      heureDebut2: "14:00",
      heureFin2: "18:00",
      type: "TRAVAIL",
      postes: [],
      hasCoupure: false,
    });
    setIsCreating(true);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCode(null);
    setEditState(null);
    setIsCreating(false);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editState) return;
    if (!editState.label.trim()) {
      toast.error("Le libellé est obligatoire");
      return;
    }

    const code = isCreating ? genererCode(editState.label) : editState.code;
    const brique = editToBrique({ ...editState, code });

    if (isCreating) {
      if (briques.some((b) => b.code === code)) {
        toast.error(`Le code "${code}" existe déjà`);
        return;
      }
      const updated = [...briques, brique];
      setBriques(updated);
      sauvegarderBriques(updated);
      toast.success(`Créneau "${brique.label}" créé`);
    } else {
      const updated = briques.map((b) => b.code === editingCode ? brique : b);
      setBriques(updated);
      sauvegarderBriques(updated);
      toast.success(`Créneau "${brique.label}" modifié`);
    }
    cancelEdit();
  }, [editState, editingCode, isCreating, briques, cancelEdit]);

  const deleteBrique = useCallback((code: string) => {
    const b = briques.find((br) => br.code === code);
    if (!b) return;
    if (!confirm(`Supprimer le créneau "${b.label}" ?`)) return;
    const updated = briques.filter((br) => br.code !== code);
    setBriques(updated);
    sauvegarderBriques(updated);
    toast.success(`Créneau "${b.label}" supprimé`);
  }, [briques]);

  const handleReset = () => {
    if (confirm("Supprimer TOUTES les données (plannings, employés, créneaux) ? Cette action est irréversible.")) {
      localStorage.clear();
      toast.success("Données réinitialisées — rechargement...");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleExportJSON = () => {
    const data = {
      employes: JSON.parse(localStorage.getItem("pfc_employes") || "[]"),
      plannings: JSON.parse(localStorage.getItem("pfc_plannings") || "[]"),
      briques: JSON.parse(localStorage.getItem("pfc_briques") || "[]"),
      seuils: JSON.parse(localStorage.getItem("pfc_seuils") || "[]"),
      semainesType: JSON.parse(localStorage.getItem("pfc_semaine_type") || "[]"),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pfc-planning-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export JSON téléchargé");
  };

  const tabs = [
    { id: "briques" as const, label: "Créneaux", icon: Clock },
    { id: "postes" as const, label: "Postes", icon: Palette },
    { id: "calendrier" as const, label: "Calendrier", icon: CalendarDays },
    { id: "export" as const, label: "Export", icon: Database },
    { id: "reset" as const, label: "Réinitialisation", icon: AlertTriangle },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1
          className="text-xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
        >
          Paramètres
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configuration des créneaux, postes et données
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors"
            style={{
              borderBottomColor: activeTab === id ? "var(--navy)" : "transparent",
              color: activeTab === id ? "var(--navy)" : "var(--muted-foreground)",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ═══ TAB CRÉNEAUX ═══ */}
      {activeTab === "briques" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1">
              {(["all", "TRAVAIL", "ABSENCE"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className="px-3 py-1.5 text-xs font-semibold rounded transition-colors"
                  style={{
                    background: filterType === f ? "var(--navy)" : "transparent",
                    color: filterType === f ? "white" : "var(--muted-foreground)",
                    border: `1px solid ${filterType === f ? "var(--navy)" : "var(--border)"}`,
                  }}
                >
                  {f === "all" ? `Tous (${briques.length})` : f === "TRAVAIL" ? `Travail (${briques.filter((b) => b.type === "TRAVAIL").length})` : `Absence (${briques.filter((b) => b.type === "ABSENCE").length})`}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResetBriques}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border hover:bg-muted transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                <RotateCcw size={12} />
                Réinitialiser
              </button>
              <button
                onClick={startCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded text-white transition-colors"
                style={{ background: "var(--navy)" }}
              >
                <Plus size={12} />
                Nouveau créneau
              </button>
            </div>
          </div>

          {/* Formulaire création/édition */}
          {editState && (
            <div
              className="bg-white border rounded-lg p-4 space-y-3"
              style={{ borderColor: "var(--navy)", borderWidth: 2 }}
            >
              <div className="flex items-center justify-between">
                <h3
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
                >
                  {isCreating ? "Nouveau créneau" : `Modifier — ${editState.code}`}
                </h3>
                <button onClick={cancelEdit} className="p-1 hover:bg-muted rounded">
                  <X size={16} style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Libellé */}
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--navy)" }}>Libellé *</label>
                  <input
                    type="text"
                    value={editState.label}
                    onChange={(e) => setEditState({ ...editState, label: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded"
                    style={{ borderColor: "var(--border)" }}
                    placeholder="ex: Matin 9h-16h"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--navy)" }}>Type</label>
                  <select
                    value={editState.type}
                    onChange={(e) => setEditState({ ...editState, type: e.target.value as "TRAVAIL" | "ABSENCE" })}
                    className="w-full px-3 py-2 text-sm border rounded"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="TRAVAIL">Travail</option>
                    <option value="ABSENCE">Absence</option>
                  </select>
                </div>

                {/* Postes (si travail) */}
                {editState.type === "TRAVAIL" && (
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold block mb-1" style={{ color: "var(--navy)" }}>Postes compatibles</label>
                    <div className="flex gap-2 flex-wrap">
                      {POSTES.map((p) => {
                        const selected = editState.postes.includes(p);
                        const c = COULEURS_POSTE[p];
                        return (
                          <button
                            key={p}
                            onClick={() => {
                              const postes = selected
                                ? editState.postes.filter((x) => x !== p)
                                : [...editState.postes, p];
                              setEditState({ ...editState, postes });
                            }}
                            className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
                            style={{
                              backgroundColor: selected ? c.bg : "transparent",
                              color: selected ? c.text : "var(--muted-foreground)",
                              border: `2px solid ${selected ? c.border : "var(--border)"}`,
                            }}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Horaires (si travail) */}
              {editState.type === "TRAVAIL" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <label className="text-xs font-semibold block mb-1" style={{ color: "var(--navy)" }}>Début</label>
                      <select
                        value={editState.heureDebut}
                        onChange={(e) => setEditState({ ...editState, heureDebut: e.target.value })}
                        className="px-2 py-1.5 text-sm border rounded"
                        style={{ borderColor: "var(--border)", fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {HEURES_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1" style={{ color: "var(--navy)" }}>Fin</label>
                      <select
                        value={editState.heureFin}
                        onChange={(e) => setEditState({ ...editState, heureFin: e.target.value })}
                        className="px-2 py-1.5 text-sm border rounded"
                        style={{ borderColor: "var(--border)", fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {HEURES_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editState.hasCoupure}
                          onChange={(e) => setEditState({ ...editState, hasCoupure: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-xs font-semibold" style={{ color: "var(--navy)" }}>Coupure (2 plages)</span>
                      </label>
                    </div>

                    {editState.hasCoupure && (
                      <>
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--navy)" }}>Reprise</label>
                          <select
                            value={editState.heureDebut2}
                            onChange={(e) => setEditState({ ...editState, heureDebut2: e.target.value })}
                            className="px-2 py-1.5 text-sm border rounded"
                            style={{ borderColor: "var(--border)", fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            {HEURES_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--navy)" }}>Fin 2</label>
                          <select
                            value={editState.heureFin2}
                            onChange={(e) => setEditState({ ...editState, heureFin2: e.target.value })}
                            className="px-2 py-1.5 text-sm border rounded"
                            style={{ borderColor: "var(--border)", fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            {HEURES_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </>
                    )}

                    {/* Durée calculée */}
                    <div className="ml-auto">
                      <label className="text-xs font-semibold block mb-1" style={{ color: "var(--navy)" }}>Durée</label>
                      <div
                        className="px-3 py-1.5 text-sm font-bold rounded"
                        style={{
                          background: "oklch(0.95 0.02 250)",
                          color: "var(--navy)",
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >
                        {calculerDuree(
                          editState.heureDebut, editState.heureFin,
                          editState.hasCoupure ? editState.heureDebut2 : undefined,
                          editState.hasCoupure ? editState.heureFin2 : undefined
                        )}h
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={saveEdit}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded text-white"
                  style={{ background: "var(--navy)" }}
                >
                  <Check size={14} />
                  {isCreating ? "Créer" : "Enregistrer"}
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded border hover:bg-muted"
                  style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Table des créneaux */}
          <div className="bg-white border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "oklch(0.95 0.003 250)" }}>
                  {["Code", "Libellé", "Type", "Horaires", "Durée", "Postes", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-semibold uppercase tracking-wide"
                      style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {briquesFiltrees.map((b, idx) => (
                  <tr
                    key={b.code}
                    style={{
                      background: editingCode === b.code ? "oklch(0.96 0.02 250)" : idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)",
                    }}
                  >
                    <td className="px-3 py-2 font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)", fontSize: 10 }}>
                      {b.code}
                    </td>
                    <td className="px-3 py-2 font-medium">{b.label}</td>
                    <td className="px-3 py-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-semibold"
                        style={{
                          background: b.type === "TRAVAIL" ? "#D4EDDA" : "#F0F0F0",
                          color: b.type === "TRAVAIL" ? "#155724" : "#6C757D",
                        }}
                      >
                        {b.type}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {b.heureDebut && b.heureFin
                        ? b.heureDebut2
                          ? `${b.heureDebut}-${b.heureFin} / ${b.heureDebut2}-${b.heureFin2}`
                          : `${b.heureDebut}-${b.heureFin}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {b.duree > 0 ? `${b.duree}h` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {(b.postes || []).map((p) => {
                          const c = COULEURS_POSTE[p];
                          return (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: c.bg, color: c.text, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                              {p}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(b)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Modifier"
                        >
                          <Edit3 size={13} style={{ color: "var(--navy)" }} />
                        </button>
                        <button
                          onClick={() => deleteBrique(b.code)}
                          className="p-1 rounded hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={13} style={{ color: "#DC3545" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB POSTES ═══ */}
      {activeTab === "postes" && (
        <div className="space-y-4">
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Postes de travail
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {POSTES.map((poste) => {
              const c = COULEURS_POSTE[poste];
              const empsPoste = employes.filter((e) => e.actif && e.postePrincipal === poste);
              return (
                <div
                  key={poste}
                  className="bg-white border rounded p-4"
                  style={{ borderColor: c.border, borderLeftWidth: 4 }}
                >
                  <div className="text-lg font-bold mb-1" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: c.text }}>
                    {poste}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {poste === "F&L" && "Fruits & Légumes"}
                    {poste === "SEC" && "Rayon Sec & Surgelés"}
                    {poste === "FRAIS" && "Rayon Frais"}
                    {poste === "CAISSE" && "Caisse"}
                  </div>
                  <div className="text-2xl font-bold" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: c.text }}>
                    {empsPoste.length}
                  </div>
                  <div className="text-xs text-muted-foreground">employé{empsPoste.length > 1 ? "s" : ""} principal</div>
                  <div className="mt-2 space-y-0.5">
                    {empsPoste.map((e) => (
                      <div key={e.id} className="text-xs" style={{ color: c.text }}>• {e.nom}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ TAB CALENDRIER ═══ */}
      {activeTab === "calendrier" && (
        <div className="space-y-6">
          {/* Navigation année */}
          <div className="flex items-center justify-between">
            <h2
              className="text-sm font-bold uppercase tracking-wider"
              style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
            >
              Calendrier {anneeCalendrier}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnneeCalendrier((a) => a - 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded border hover:bg-muted transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                ← {anneeCalendrier - 1}
              </button>
              <span className="text-sm font-bold" style={{ color: "var(--navy)", fontFamily: "'IBM Plex Mono', monospace" }}>{anneeCalendrier}</span>
              <button
                onClick={() => setAnneeCalendrier((a) => a + 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded border hover:bg-muted transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                {anneeCalendrier + 1} →
              </button>
            </div>
          </div>

          {/* Formulaire ajout fête musulmane */}
          <div className="bg-white border rounded p-5 space-y-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-sm" style={{ color: "var(--navy)" }}>
              Déclarer une fête musulmane
            </h3>
            <p className="text-xs text-muted-foreground">
              Les dates de l'Aïd varient chaque année selon le calendrier lunaire. Saisissez les dates manuellement pour les afficher à titre indicatif dans le planning.
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Type</label>
                <select
                  value={newAidType}
                  onChange={(e) => setNewAidType(e.target.value as "AID_FITR" | "AID_ADHA")}
                  className="px-3 py-1.5 text-xs border rounded"
                  style={{ borderColor: "var(--border)", fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  <option value="AID_FITR">Aïd el-Fitr (fin du Ramadan)</option>
                  <option value="AID_ADHA">Aïd el-Adha (fête du sacrifice)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Date</label>
                <input
                  type="date"
                  value={newAidDate}
                  onChange={(e) => setNewAidDate(e.target.value)}
                  className="px-3 py-1.5 text-xs border rounded"
                  style={{ borderColor: "var(--border)", fontFamily: "'IBM Plex Mono', monospace" }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Label (optionnel)</label>
                <input
                  type="text"
                  value={newAidLabel}
                  onChange={(e) => setNewAidLabel(e.target.value)}
                  placeholder="ex : Aïd el-Fitr 2026"
                  className="px-3 py-1.5 text-xs border rounded"
                  style={{ borderColor: "var(--border)", minWidth: 180 }}
                />
              </div>
              <button
                onClick={handleAjouterAid}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded"
                style={{ background: "var(--navy)" }}
              >
                <Plus size={12} />
                Ajouter
              </button>
            </div>

            {/* Liste des fêtes déclarées pour l'année */}
            {joursCustomAnnee.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Fêtes déclarées pour {anneeCalendrier}</div>
                {joursCustomAnnee.map((j) => {
                  const c = COULEURS_JOUR_SPECIAL[j.type];
                  return (
                    <div
                      key={j.id}
                      className="flex items-center justify-between px-3 py-2 rounded"
                      style={{ background: c.bg, border: `1px solid ${c.border}` }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="px-2 py-0.5 rounded text-white text-xs font-bold"
                          style={{ background: c.border, fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                          {c.badge}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: c.text }}>{j.label}</span>
                        <span className="text-xs" style={{ color: c.text, opacity: 0.7, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {new Date(j.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleSupprimerAid(j.id)}
                        className="p-1 rounded hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} style={{ color: "#DC3545" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tableau des jours fériés légaux */}
          <div className="bg-white border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)", background: "oklch(0.97 0.003 250)" }}>
              <h3 className="font-semibold text-sm" style={{ color: "var(--navy)" }}>
                Jours fériés légaux {anneeCalendrier} — calculés automatiquement
              </h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "oklch(0.97 0.003 250)" }}>
                  <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--muted-foreground)" }}>Date</th>
                  <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--muted-foreground)" }}>Jour</th>
                  <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--muted-foreground)" }}>Fête</th>
                  <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--muted-foreground)" }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {feriesLegaux.map((f) => {
                  const c = COULEURS_JOUR_SPECIAL[f.type];
                  const dateObj = new Date(f.date + "T12:00:00");
                  return (
                    <tr key={f.id} style={{ background: c.bg, borderBottom: `1px solid ${c.border}22` }}>
                      <td className="px-4 py-2 font-mono" style={{ color: c.text, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {dateObj.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                      </td>
                      <td className="px-4 py-2" style={{ color: c.text }}>
                        {dateObj.toLocaleDateString("fr-FR", { weekday: "long" })}
                      </td>
                      <td className="px-4 py-2 font-semibold" style={{ color: c.text }}>{f.label}</td>
                      <td className="px-4 py-2">
                        <span
                          className="px-2 py-0.5 rounded text-white text-xs font-bold"
                          style={{ background: c.border, fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                          {f.type === "FERIE_BLOQUE" ? "FERMÉ" : "FÉRIÉ"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB EXPORT ═══ */}
      {activeTab === "export" && (
        <div className="space-y-4">
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Export des données
          </h2>
          <div className="bg-white border rounded p-5 space-y-4" style={{ borderColor: "var(--border)" }}>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: "var(--navy)" }}>Export JSON complet</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Exporte tous les plannings, employés, créneaux, seuils et semaines type au format JSON.
              </p>
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded border hover:bg-muted transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--navy)" }}
              >
                <Database size={14} />
                Télécharger export JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB RESET ═══ */}
      {activeTab === "reset" && (
        <div className="space-y-4">
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "#DC3545" }}
          >
            Zone dangereuse
          </h2>
          <div className="bg-white border rounded p-5" style={{ borderColor: "#DC3545", borderLeftWidth: 4 }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} style={{ color: "#DC3545", flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 className="font-semibold mb-1" style={{ color: "#DC3545" }}>Réinitialiser toutes les données</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Supprime définitivement tous les plannings, employés, créneaux et seuils.
                  Cette action est <strong>irréversible</strong>.
                </p>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded"
                  style={{ background: "#DC3545" }}
                >
                  <AlertTriangle size={14} />
                  Réinitialiser les données
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
