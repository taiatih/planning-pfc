import { useState } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import { BRIQUES, COULEURS_POSTE, COULEURS_ABSENCE, Poste } from "@/lib/data";
import { Settings, Database, Palette, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const POSTES: Poste[] = ["F&L", "SEC", "FRAIS", "CAISSE"];

export default function Parametres() {
  const { employes } = usePlanning();
  const [activeTab, setActiveTab] = useState<"briques" | "postes" | "export" | "reset">("briques");

  const briquesTravail = BRIQUES.filter((b) => b.type === "TRAVAIL");
  const briquesAbsence = BRIQUES.filter((b) => b.type === "ABSENCE");

  const handleReset = () => {
    if (confirm("⚠️ Supprimer TOUTES les données (plannings, employés) ? Cette action est irréversible.")) {
      localStorage.clear();
      toast.success("Données réinitialisées — rechargement...");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleExportJSON = () => {
    const data = {
      employes: JSON.parse(localStorage.getItem("pfc_employes") || "[]"),
      plannings: JSON.parse(localStorage.getItem("pfc_plannings") || "[]"),
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
          Configuration de l'application PFC Planning Manager
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

      {/* Contenu */}
      {activeTab === "briques" && (
        <div className="space-y-6">
          {/* Créneaux de travail */}
          <div>
            <h2
              className="text-sm font-bold uppercase tracking-wider mb-3"
              style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
            >
              Créneaux de travail ({briquesTravail.length})
            </h2>
            <div className="bg-white border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "oklch(0.95 0.003 250)" }}>
                    {["Code", "Label", "Horaires", "Durée", "Postes compatibles"].map((h) => (
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
                  {briquesTravail.map((b, idx) => (
                    <tr key={b.code} style={{ background: idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}>
                      <td className="px-3 py-2 font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)" }}>
                        {b.code}
                      </td>
                      <td className="px-3 py-2">{b.label}</td>
                      <td className="px-3 py-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {b.heureDebut && b.heureFin
                          ? b.heureDebut2
                            ? `${b.heureDebut}-${b.heureFin} / ${b.heureDebut2}-${b.heureFin2}`
                            : `${b.heureDebut}-${b.heureFin}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {b.duree}h
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Codes absence */}
          <div>
            <h2
              className="text-sm font-bold uppercase tracking-wider mb-3"
              style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
            >
              Codes d'absence ({briquesAbsence.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {briquesAbsence.map((b) => {
                const c = COULEURS_ABSENCE[b.code] || COULEURS_ABSENCE["REPOS"];
                return (
                  <div
                    key={b.code}
                    className="px-3 py-2 rounded border text-xs font-semibold"
                    style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border || "#ADB5BD", fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {b.code} — {b.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
                  <div
                    className="text-lg font-bold mb-1"
                    style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: c.text }}
                  >
                    {poste}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {poste === "F&L" && "Fruits & Légumes"}
                    {poste === "SEC" && "Rayon Sec & Surgelés"}
                    {poste === "FRAIS" && "Rayon Frais"}
                    {poste === "CAISSE" && "Caisse"}
                  </div>
                  <div
                    className="text-2xl font-bold"
                    style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: c.text }}
                  >
                    {empsPoste.length}
                  </div>
                  <div className="text-xs text-muted-foreground">employé{empsPoste.length > 1 ? "s" : ""} principal</div>
                  <div className="mt-2 space-y-0.5">
                    {empsPoste.map((e) => (
                      <div key={e.id} className="text-xs" style={{ color: c.text }}>
                        • {e.nom}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              <h3 className="font-semibold mb-1" style={{ color: "var(--navy)" }}>Export JSON</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Exporte tous les plannings et employés au format JSON pour sauvegarde ou migration.
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
            <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="font-semibold mb-1" style={{ color: "var(--navy)" }}>Export PDF</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Génère un PDF du planning hebdomadaire pour distribution aux employés.
              </p>
              <button
                onClick={() => toast.info("Export PDF — fonctionnalité à venir dans la prochaine version")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded border hover:bg-muted transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                <Settings size={14} />
                Export PDF (à venir)
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "reset" && (
        <div className="space-y-4">
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "#DC3545" }}
          >
            Zone dangereuse
          </h2>
          <div
            className="bg-white border rounded p-5"
            style={{ borderColor: "#DC3545", borderLeftWidth: 4 }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} style={{ color: "#DC3545", flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 className="font-semibold mb-1" style={{ color: "#DC3545" }}>Réinitialiser toutes les données</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Cette action supprime définitivement tous les plannings et remet les employés aux valeurs par défaut.
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
