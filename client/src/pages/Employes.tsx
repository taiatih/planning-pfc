import { useState } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import { Employe, COULEURS_POSTE, Poste, TypeContrat, dateToString } from "@/lib/data";
import { Plus, Pencil, UserX, UserCheck, X, Save } from "lucide-react";
import { toast } from "sonner";

const POSTES: Poste[] = ["F&L", "SEC", "FRAIS", "CAISSE"];
const TYPES_CONTRAT: TypeContrat[] = ["CDI", "CDD", "ALTERNANCE", "STAGE"];

const EMPLOYE_VIDE: Omit<Employe, "id"> = {
  nom: "",
  prenom: "",
  typeContrat: "CDI",
  heuresHebdo: 35,
  heuresJour: 7,
  dateDebut: dateToString(new Date()),
  postePrincipal: "SEC",
  postesAutorises: ["SEC"],
  postesExclus: [],
  ratioPrincipal: 100,
  ratioSecondaire: {},
  actif: true,
};

export default function Employes() {
  const { employes, ajouterEmploye, modifierEmploye, desactiverEmploye } = usePlanning();
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Employe, "id">>(EMPLOYE_VIDE);

  const actifs = employes.filter((e) => e.actif);
  const inactifs = employes.filter((e) => !e.actif);

  const openEdit = (emp: Employe) => {
    setEditId(emp.id);
    setForm({ ...emp });
    setShowForm(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(EMPLOYE_VIDE);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.nom.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    if (editId) {
      modifierEmploye({ ...form, id: editId });
      toast.success(`${form.nom} mis à jour`);
    } else {
      const id = form.nom.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
      ajouterEmploye({ ...form, id });
      toast.success(`${form.nom} ajouté`);
    }
    setShowForm(false);
  };

  const togglePosteAutorise = (poste: Poste) => {
    setForm((prev) => ({
      ...prev,
      postesAutorises: prev.postesAutorises.includes(poste)
        ? prev.postesAutorises.filter((p) => p !== poste)
        : [...prev.postesAutorises, poste],
    }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold uppercase tracking-wide"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Gestion des Employés
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {actifs.length} actifs · {inactifs.length} inactifs
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded"
          style={{ background: "var(--navy)" }}
        >
          <Plus size={16} />
          Nouvel employé
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--navy)" }}>
              {["Nom", "Contrat", "Heures/sem", "Poste principal", "Postes autorisés", "Contrainte", "Actions"].map((h) => (
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
            {actifs.map((emp, idx) => {
              const c = COULEURS_POSTE[emp.postePrincipal];
              return (
                <tr key={emp.id} style={{ background: idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--navy)" }}>
                    {emp.nom}
                  </td>
                  <td className="px-4 py-2.5" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)", fontSize: 12 }}>
                    {emp.typeContrat}
                  </td>
                  <td className="px-4 py-2.5 text-center font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {emp.heuresHebdo}h
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {emp.postePrincipal}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {emp.postesAutorises.map((p) => {
                        const cp = COULEURS_POSTE[p];
                        return (
                          <span
                            key={p}
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{ backgroundColor: cp.bg, color: cp.text, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            {p}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {emp.contrainte || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(emp)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="Modifier"
                      >
                        <Pencil size={14} style={{ color: "var(--navy)" }} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Désactiver ${emp.nom} ?`)) {
                            desactiverEmploye(emp.id);
                            toast.success(`${emp.nom} désactivé`);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="Désactiver"
                      >
                        <UserX size={14} style={{ color: "#DC3545" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inactifs */}
      {inactifs.length > 0 && (
        <div>
          <h2
            className="text-sm font-bold uppercase tracking-wider mb-3"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--muted-foreground)" }}
          >
            Employés inactifs ({inactifs.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {inactifs.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                <span>{emp.nom}</span>
                <button
                  onClick={() => {
                    modifierEmploye({ ...emp, actif: true });
                    toast.success(`${emp.nom} réactivé`);
                  }}
                  className="hover:text-green-600"
                  title="Réactiver"
                >
                  <UserCheck size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div
            className="bg-white rounded shadow-xl w-full max-w-lg mx-4"
            style={{ border: "1px solid var(--border)" }}
          >
            {/* Header modal */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ background: "var(--navy)", borderColor: "var(--border)" }}
            >
              <h3
                className="font-bold text-white uppercase tracking-wide"
                style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}
              >
                {editId ? "Modifier l'employé" : "Nouvel employé"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-white opacity-70 hover:opacity-100">
                <X size={18} />
              </button>
            </div>

            {/* Corps */}
            <div className="p-5 space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--navy)" }}>
                  Nom *
                </label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
                  className="w-full px-3 py-2 border rounded text-sm"
                  style={{ borderColor: "var(--border)", fontFamily: "'IBM Plex Sans', sans-serif" }}
                  placeholder="Prénom Nom"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Type contrat */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--navy)" }}>
                    Type contrat
                  </label>
                  <select
                    value={form.typeContrat}
                    onChange={(e) => setForm((p) => ({ ...p, typeContrat: e.target.value as TypeContrat }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {TYPES_CONTRAT.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Heures hebdo */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--navy)" }}>
                    Heures/semaine
                  </label>
                  <input
                    type="number"
                    value={form.heuresHebdo}
                    onChange={(e) => setForm((p) => ({ ...p, heuresHebdo: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                    style={{ borderColor: "var(--border)" }}
                    min={1}
                    max={48}
                    step={0.5}
                  />
                </div>
              </div>

              {/* Poste principal */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--navy)" }}>
                  Poste principal
                </label>
                <div className="flex gap-2">
                  {POSTES.map((p) => {
                    const c = COULEURS_POSTE[p];
                    const active = form.postePrincipal === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          postePrincipal: p,
                          postesAutorises: prev.postesAutorises.includes(p)
                            ? prev.postesAutorises
                            : [...prev.postesAutorises, p],
                        }))}
                        className="px-3 py-1.5 rounded text-xs font-semibold border transition-all"
                        style={{
                          backgroundColor: active ? c.bg : "white",
                          color: active ? c.text : "var(--muted-foreground)",
                          borderColor: active ? c.border : "var(--border)",
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Postes autorisés */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--navy)" }}>
                  Postes autorisés
                </label>
                <div className="flex gap-2">
                  {POSTES.map((p) => {
                    const c = COULEURS_POSTE[p];
                    const active = form.postesAutorises.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() => togglePosteAutorise(p)}
                        className="px-3 py-1.5 rounded text-xs font-semibold border transition-all"
                        style={{
                          backgroundColor: active ? c.bg : "white",
                          color: active ? c.text : "var(--muted-foreground)",
                          borderColor: active ? c.border : "var(--border)",
                          fontFamily: "'IBM Plex Mono', monospace",
                          opacity: p === form.postePrincipal ? 1 : undefined,
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contrainte */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--navy)" }}>
                  Contrainte particulière
                </label>
                <input
                  type="text"
                  value={form.contrainte || ""}
                  onChange={(e) => setForm((p) => ({ ...p, contrainte: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border rounded text-sm"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="ex: Mi-temps thérapeutique 3.5h/j max"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded"
                style={{ background: "var(--navy)" }}
              >
                <Save size={14} />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
