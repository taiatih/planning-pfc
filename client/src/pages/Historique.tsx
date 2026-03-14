import { usePlanning } from "@/contexts/PlanningContext";
import { getNumeroSemaine, formatDate, addDays, getLundiDeSemaine } from "@/lib/data";
import { CalendarDays, Eye, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Historique() {
  const { plannings, allerSemaine } = usePlanning();

  const planningsTries = [...plannings].sort((a, b) => {
    if (a.annee !== b.annee) return b.annee - a.annee;
    return b.semaine - a.semaine;
  });

  const statutStyle = (statut: string) => {
    if (statut === "PUBLIE") return { bg: "#D4EDDA", text: "#155724", border: "#28A745" };
    if (statut === "AVENANT") return { bg: "#CCE5FF", text: "#004085", border: "#3B82F6" };
    return { bg: "#FFF3CD", text: "#856404", border: "#FFC107" };
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1
          className="text-xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
        >
          Historique des Plannings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {planningsTries.length} planning{planningsTries.length > 1 ? "s" : ""} enregistré{planningsTries.length > 1 ? "s" : ""}
        </p>
      </div>

      {planningsTries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <CalendarDays size={48} style={{ color: "var(--muted-foreground)" }} />
          <div className="text-center">
            <p className="font-semibold" style={{ color: "var(--navy)" }}>Aucun planning enregistré</p>
            <p className="text-sm text-muted-foreground mt-1">
              Les plannings sauvegardés apparaîtront ici
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--navy)" }}>
                {["Semaine", "Période", "Statut", "Dernière modif.", "Actions"].map((h) => (
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

                return (
                  <tr
                    key={p.id}
                    style={{ background: idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}
                  >
                    <td className="px-4 py-3 font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)" }}>
                      S{p.semaine} — {p.annee}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}>
                      {formatDate(lundi)} → {formatDate(dimanche)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {p.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}>
                      {new Date(p.modifieLe).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => allerSemaine(lundi)}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border hover:bg-muted transition-colors"
                          style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                        >
                          <Eye size={12} />
                          Voir
                        </button>
                        <button
                          onClick={() => toast.info("Export PDF — fonctionnalité à venir")}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border hover:bg-muted transition-colors"
                          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                        >
                          <FileText size={12} />
                          PDF
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
    </div>
  );
}
