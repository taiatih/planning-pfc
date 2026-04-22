import { usePlanning } from "@/contexts/PlanningContext";
import { useState, useEffect } from "react";
import {
  JOURS_COURT, COULEURS_POSTE, Poste,
  calculerHeuresEmploye, validerContrat, compterJoursTravailles, compterJoursRepos,
  getBrique, formatDate, addDays, getNumeroSemaine, getLundiDeSemaine, heureToNum,
  verifierRotationEquipe, StatutRotation, BriqueHoraire,
} from "@/lib/data";
import { AlertTriangle, CheckCircle, Users, Clock, TrendingUp, CalendarCheck, Calendar, Activity, Printer, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const POSTES: Poste[] = ["F&L", "SEC", "FRAIS", "CAISSE"];

// Calculer le statut d'un employé à une heure donnée
function getStatutEmploye(
  employeId: string,
  cellules: { employeId: string; jour: number; brique: string; poste?: Poste; note?: string }[],
  heureActuelle: number, // en minutes depuis minuit
  jourSemaine: number // 0=Lun
): { statut: "present" | "arrive_bientot" | "finit_bientot" | "absent"; brique?: BriqueHoraire; poste?: Poste; debut?: number; fin?: number } {
  const cellule = cellules.find((c) => c.employeId === employeId && c.jour === jourSemaine);
  if (!cellule) return { statut: "absent" };
  const b = getBrique(cellule.brique);
  if (!b || b.type === "ABSENCE") return { statut: "absent" };

  const debut1 = heureToNum(b.heureDebut) * 60;
  const fin1 = heureToNum(b.heureFin) * 60;
  const debut2 = b.heureDebut2 ? heureToNum(b.heureDebut2) * 60 : null;
  const fin2 = b.heureFin2 ? heureToNum(b.heureFin2) * 60 : null;

  const finale = fin2 ?? fin1;
  const SEUIL = 60; // minutes

  // En poste (période 1)
  if (heureActuelle >= debut1 && heureActuelle < fin1) {
    if (fin1 - heureActuelle <= SEUIL) return { statut: "finit_bientot", brique: b, poste: cellule.poste, debut: debut1, fin: finale };
    return { statut: "present", brique: b, poste: cellule.poste, debut: debut1, fin: finale };
  }
  // En poste (période 2)
  if (debut2 !== null && fin2 !== null && heureActuelle >= debut2 && heureActuelle < fin2) {
    if (fin2 - heureActuelle <= SEUIL) return { statut: "finit_bientot", brique: b, poste: cellule.poste, debut: debut1, fin: finale };
    return { statut: "present", brique: b, poste: cellule.poste, debut: debut1, fin: finale };
  }
  // Arrive bientôt
  if (debut1 - heureActuelle > 0 && debut1 - heureActuelle <= SEUIL) {
    return { statut: "arrive_bientot", brique: b, poste: cellule.poste, debut: debut1, fin: finale };
  }
  return { statut: "absent" };
}

function minutesToHeure(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}h${m}`;
}

export default function Dashboard() {
  const { employes, planningActuel, stats, semaineCourante, plannings } = usePlanning();
  const [showPrintModal, setShowPrintModal] = useState(false);
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
  const annee = semaineCourante.getFullYear();

  const actifs = employes.filter((e) => e.actif);

  // Calculer le jour de semaine actuel (0=Lun) pour le widget
  const lundiSemaineCourante = getLundiDeSemaine(semaineCourante);
  const lundiAujourdhui = getLundiDeSemaine(dateActuelle);
  const estSemaineCourante = lundiSemaineCourante.toDateString() === lundiAujourdhui.toDateString();
  const jourSemaineActuel = estSemaineCourante ? ((dateActuelle.getDay() + 6) % 7) : -1; // -1 si pas la semaine courante

  // Statuts des employés maintenant
  const statutsEmployes = actifs.map((emp) => ({
    employe: emp,
    statut: planningActuel && jourSemaineActuel >= 0
      ? getStatutEmploye(emp.id, planningActuel.cellules, heureActuelle, jourSemaineActuel)
      : { statut: "absent" as const },
  }));

  const presents = statutsEmployes.filter((s) => s.statut.statut === "present" || s.statut.statut === "finit_bientot");
  const arriventBientot = statutsEmployes.filter((s) => s.statut.statut === "arrive_bientot");
  const finissentBientot = statutsEmployes.filter((s) => s.statut.statut === "finit_bientot");

  // Rotation weekends
  const rotationWeekends = verifierRotationEquipe(employes, plannings);
  const alertesRotation = actifs.filter(
    (e) => rotationWeekends[e.id] && rotationWeekends[e.id].statut !== "ok"
  );

  // Données pour le graphique de couverture
  const couvertureData = stats.couvertureParJour.map((d, i) => ({
    jour: d.jour,
    date: formatDate(addDays(semaineCourante, i)).slice(0, 5),
    total: d.total,
    "F&L": d.parPoste["F&L"],
    SEC: d.parPoste["SEC"],
    FRAIS: d.parPoste["FRAIS"],
    CAISSE: d.parPoste["CAISSE"],
  }));

  // ── Fonction d'impression du rapport hebdomadaire ──
  function imprimerRapport() {
    const semaine = getNumeroSemaine(semaineCourante);
    const annee = semaineCourante.getFullYear();
    const dateDebut = formatDate(semaineCourante);
    const dateFin = formatDate(addDays(semaineCourante, 6));
    const JOURS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

    // Lignes employés
    const lignesEmployes = actifs.map((emp) => {
      const heures = planningActuel ? calculerHeuresEmploye(emp.id, planningActuel.cellules) : 0;
      const validation = validerContrat(emp, heures);
      const jours = Array.from({ length: 7 }, (_, j) => {
        const c = planningActuel?.cellules.find((cel) => cel.employeId === emp.id && cel.jour === j);
        if (!c) return `<td style="text-align:center;padding:3px 4px;border:1px solid #ddd;font-size:9px;color:#999;">—</td>`;
        const b = getBrique(c.brique);
        if (!b) return `<td style="text-align:center;padding:3px 4px;border:1px solid #ddd;font-size:9px;">?</td>`;
        if (b.type === "ABSENCE") {
          return `<td style="text-align:center;padding:3px 4px;border:1px solid #ddd;background:#FFE5CC;color:#7D3C00;font-size:9px;">${b.code}</td>`;
        }
        const couleur = c.poste ? COULEURS_POSTE[c.poste] : { bg: "#f0f0f0", text: "#333" };
        return `<td style="text-align:center;padding:3px 4px;border:1px solid #ddd;background:${couleur.bg};color:${couleur.text};font-size:9px;"><strong>${c.poste || ""}</strong><br/>${b.duree}h<br/><span style="font-size:7px;">${b.heureDebut}-${b.heureFin}</span></td>`;
      }).join("");
      const statutColor = heures === 0 ? "#999" : validation.ok ? "#155724" : "#7D3C00";
      const statutLabel = heures === 0 ? "À remplir" : validation.ok ? "✓ OK" : `⚠ ${heures}h/${emp.heuresHebdo}h`;
      return `<tr>
        <td style="padding:3px 6px;border:1px solid #ddd;font-weight:bold;font-size:10px;white-space:nowrap;">${emp.nom}</td>
        <td style="text-align:center;padding:3px 4px;border:1px solid #ddd;font-size:9px;">${emp.heuresHebdo}h</td>
        ${jours}
        <td style="text-align:center;padding:3px 4px;border:1px solid #ddd;font-weight:bold;font-size:10px;">${heures > 0 ? heures + "h" : "—"}</td>
        <td style="text-align:center;padding:3px 4px;border:1px solid #ddd;font-size:9px;color:${statutColor};">${statutLabel}</td>
      </tr>`;
    }).join("");

    // Alertes rotation
    const alertesHTML = alertesRotation.length > 0
      ? alertesRotation.map((e) => {
          const r = rotationWeekends[e.id];
          return `<li>${e.nom} — Sam: ${r.samedis} | Dim: ${r.dimanches} (${r.statut === "manque_samedi" ? "Sam manquant" : r.statut === "manque_dimanche" ? "Dim manquant" : "Sam+Dim manquants"})</li>`;
        }).join("")
      : "<li style='color:#155724'>Aucune alerte de rotation</li>";

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport Semaine ${semaine} — ${annee}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    body { font-family: 'Helvetica', Arial, sans-serif; margin: 0; padding: 8px; font-size: 10px; }
    h1 { font-size: 15px; color: #1B2A4A; margin: 0 0 2px; }
    .subtitle { font-size: 10px; color: #666; margin-bottom: 8px; }
    .kpis { display: flex; gap: 12px; margin-bottom: 10px; }
    .kpi { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 6px 12px; text-align: center; flex: 1; }
    .kpi-val { font-size: 18px; font-weight: bold; color: #1B2A4A; }
    .kpi-lbl { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th { padding: 5px 4px; border: 1px solid #ddd; background: #1B2A4A; color: white; font-size: 9px; text-align: center; }
    td { padding: 3px 4px; border: 1px solid #ddd; }
    h3 { font-size: 11px; color: #1B2A4A; margin: 8px 0 4px; border-bottom: 1px solid #dee2e6; padding-bottom: 2px; }
    ul { margin: 0; padding-left: 16px; }
    li { font-size: 9px; margin-bottom: 2px; }
    .footer { margin-top: 8px; font-size: 8px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 4px; }
  </style>
</head>
<body>
  <h1>PFC MARKETS — Rapport Semaine ${semaine} / ${annee}</h1>
  <div class="subtitle">${dateDebut} → ${dateFin} · Statut : ${planningActuel?.statut || "Non créé"} · Généré le ${new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-val">${stats.totalEmployesActifs}</div><div class="kpi-lbl">Employés actifs</div></div>
    <div class="kpi"><div class="kpi-val">${stats.totalHeuresPlanifiees.toFixed(1)}h</div><div class="kpi-lbl">Heures planifiées</div></div>
    <div class="kpi"><div class="kpi-val" style="color:${stats.conformiteContrats >= 80 ? '#155724' : '#7D3C00'}">${stats.conformiteContrats}%</div><div class="kpi-lbl">Conformité contrats</div></div>
    <div class="kpi"><div class="kpi-val" style="color:${stats.nombreAlertes > 0 ? '#7D3C00' : '#155724'}">${stats.nombreAlertes}</div><div class="kpi-lbl">Alertes</div></div>
  </div>

  <h3>Planning de la semaine</h3>
  <table>
    <thead><tr>
      <th style="text-align:left;">Employé</th>
      <th>Contrat</th>
      ${JOURS.map((j, i) => `<th>${j}<br/><span style="font-size:7px;font-weight:normal;">${formatDate(addDays(semaineCourante, i)).slice(0, 5)}</span></th>`).join("")}
      <th>Total</th>
      <th>Statut</th>
    </tr></thead>
    <tbody>${lignesEmployes}</tbody>
  </table>

  <h3>Alertes rotation weekends</h3>
  <ul>${alertesHTML}</ul>

  <div class="footer">PFC Planning Manager — Rapport automatique — ${new Date().toLocaleDateString("fr-FR")}</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Bouton Imprimer ── */}
      <div className="flex justify-end">
        <button
          onClick={imprimerRapport}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium"
          style={{
            background: "var(--navy)",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontFamily: "'IBM Plex Sans Condensed', sans-serif",
          }}
          title="Imprimer le rapport hebdomadaire"
        >
          <Printer size={14} />
          Imprimer la semaine
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} style={{ color: "var(--navy)" }} />
            <span className="kpi-label">Équipe active</span>
          </div>
          <div className="kpi-value">{stats.totalEmployesActifs}</div>
          <div className="text-xs text-muted-foreground">employés planifiés</div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} style={{ color: "var(--navy)" }} />
            <span className="kpi-label">Heures planifiées</span>
          </div>
          <div className="kpi-value">{stats.totalHeuresPlanifiees.toFixed(1)}h</div>
          <div className="text-xs text-muted-foreground">semaine {semaine}</div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} style={{ color: stats.conformiteContrats >= 80 ? "#28A745" : "#E07B39" }} />
            <span className="kpi-label">Conformité</span>
          </div>
          <div className="kpi-value" style={{ color: stats.conformiteContrats >= 80 ? "#155724" : "#7D3C00" }}>
            {stats.conformiteContrats}%
          </div>
          <div className="text-xs text-muted-foreground">contrats respectés</div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            {stats.nombreAlertes > 0
              ? <AlertTriangle size={16} style={{ color: "#E07B39" }} />
              : <CheckCircle size={16} style={{ color: "#28A745" }} />
            }
            <span className="kpi-label">Alertes</span>
          </div>
          <div className="kpi-value" style={{ color: stats.nombreAlertes > 0 ? "#7D3C00" : "#155724" }}>
            {stats.nombreAlertes}
          </div>
          <div className="text-xs text-muted-foreground">
            {stats.nombreAlertes === 0 ? "Tout est OK ✓" : "à corriger"}
          </div>
        </div>
      </div>

      {/* ── Widget Qui est là maintenant ── */}
      <div className="bg-white border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)", background: "var(--navy)" }}
        >
          <div className="flex items-center gap-2">
            <Activity size={14} style={{ color: "#4ADE80" }} />
            <h2
              className="text-sm font-bold uppercase tracking-wider"
              style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "white" }}
            >
              Qui est là maintenant
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {jourSemaineActuel >= 0 ? (
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.15)", color: "white", fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {minutesToHeure(heureActuelle)} — {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"][jourSemaineActuel]}
              </span>
            ) : (
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Semaine non courante
              </span>
            )}
          </div>
        </div>

        {jourSemaineActuel < 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Ce widget est actif uniquement pour la semaine en cours. Naviguez vers la semaine actuelle pour voir les présences en temps réel.
          </div>
        ) : (
          <div className="p-4">
            {/* Présents */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: "#28A745" }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#155724", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
                  En poste ({presents.length})
                </span>
              </div>
              {presents.length === 0 ? (
                <div className="text-xs text-muted-foreground px-3">Aucun employé en poste actuellement</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {presents.map(({ employe: emp, statut: s }) => {
                    const c = s.poste ? COULEURS_POSTE[s.poste] : { bg: "#E8F5E9", text: "#155724", border: "#28A745" };
                    const finBientot = s.statut === "finit_bientot";
                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded"
                        style={{
                          backgroundColor: finBientot ? "#FFF3CD" : c.bg,
                          border: `1px solid ${finBientot ? "#FFC107" : c.border}`,
                          color: finBientot ? "#856404" : c.text,
                        }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: finBientot ? "#FFC107" : c.border, flexShrink: 0 }}
                        />
                        <span className="text-xs font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                          {emp.nom}
                        </span>
                        {s.poste && (
                          <span className="text-xs opacity-70">{s.poste}</span>
                        )}
                        {s.fin !== undefined && (
                          <span className="text-xs opacity-60">→ {minutesToHeure(s.fin)}</span>
                        )}
                        {finBientot && (
                          <span className="text-xs font-bold">⚡ bientôt</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Arrivent bientôt */}
            {arriventBientot.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#2980B9" }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1A5276", fontFamily: "'IBM Plex Sans Condensed', sans-serif" }}>
                    Arrivent dans &lt;1h ({arriventBientot.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {arriventBientot.map(({ employe: emp, statut: s }) => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded"
                      style={{ backgroundColor: "#E8F4FD", border: "1px solid #85C1E9", color: "#1A5276" }}
                    >
                      <span className="text-xs font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {emp.nom}
                      </span>
                      {s.debut !== undefined && (
                        <span className="text-xs opacity-70">à {minutesToHeure(s.debut)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Résumé par poste */}
            <div className="border-t pt-3 mt-2 flex items-center gap-4 flex-wrap" style={{ borderColor: "var(--border)" }}>
              {POSTES.map((p) => {
                const count = presents.filter((s) => s.statut.poste === p).length;
                const c = COULEURS_POSTE[p];
                return (
                  <div key={p} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.border }} />
                    <span className="text-xs font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: c.text }}>
                      {p}: {count}
                    </span>
                  </div>
                );
              })}
              <div className="ml-auto text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace" }}>
                Mis à jour chaque minute
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Couverture par jour ── */}
        <div className="lg:col-span-2 bg-white border rounded p-4" style={{ borderColor: "var(--border)" }}>
          <h2
            className="text-sm font-bold uppercase tracking-wider mb-4"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Couverture par jour — Semaine {semaine}
          </h2>
          {stats.totalHeuresPlanifiees > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={couvertureData} barSize={18} barGap={2}>
                <XAxis
                  dataKey="jour"
                  tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={20}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", border: "1px solid var(--border)" }}
                  formatter={(val, name) => [`${val} pers.`, name]}
                />
                <Bar dataKey="F&L" stackId="a" fill="#28A745" />
                <Bar dataKey="SEC" stackId="a" fill="#1ABC9C" />
                <Bar dataKey="FRAIS" stackId="a" fill="#2980B9" />
                <Bar dataKey="CAISSE" stackId="a" fill="#FFC107" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Aucun planning rempli pour cette semaine
            </div>
          )}
          {/* Légende */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {POSTES.map((p) => {
              const c = COULEURS_POSTE[p];
              return (
                <div key={p} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: c.border }} />
                  <span className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: c.text }}>
                    {p}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Alertes ── */}
        <div className="bg-white border rounded p-4" style={{ borderColor: "var(--border)" }}>
          <h2
            className="text-sm font-bold uppercase tracking-wider mb-4"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Alertes & Anomalies
          </h2>
          {stats.alertes.length === 0 && alertesRotation.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <CheckCircle size={32} style={{ color: "#28A745" }} />
              <span className="text-sm text-muted-foreground">Aucune alerte</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {/* Alertes rotation weekends */}
              {alertesRotation.map((emp) => {
                const r = rotationWeekends[emp.id];
                const msg = r.statut === "manque_les_deux"
                  ? "Aucun weekend ce mois — Sam + Dim requis"
                  : r.statut === "manque_samedi"
                  ? `Samedi manquant ce mois (${r.dimanches} Dim OK)`
                  : `Dimanche manquant ce mois (${r.samedis} Sam OK)`;
                return (
                  <div
                    key={emp.id}
                    className="px-3 py-2 rounded text-xs flex items-start gap-2"
                    style={{ background: "#E8F4FD", color: "#1A5276", border: "1px solid #85C1E9", fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    <Calendar size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div className="font-semibold">{emp.nom}</div>
                      <div className="opacity-80">{msg}</div>
                    </div>
                  </div>
                );
              })}
              {/* Alertes contrats */}
              {stats.alertes.map((a, i) => (
                <div
                  key={`alerte-${i}`}
                  className="px-3 py-2 rounded text-xs"
                  style={{
                    background: a.type === "REPOS" ? "#FFE5CC" : "#FFF3CD",
                    color: a.type === "REPOS" ? "#7D3C00" : "#856404",
                    border: `1px solid ${a.type === "REPOS" ? "#E07B39" : "#FFC107"}`,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  <div className="font-semibold">{a.nom}</div>
                  <div className="opacity-80">{a.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Récapitulatif employés ── */}
      <div className="bg-white border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)", background: "oklch(0.97 0.002 250)" }}
        >
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}
          >
            Récapitulatif Employés — Semaine {semaine}
          </h2>
          <span
            className="text-xs"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}
          >
            {actifs.length} actifs
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "oklch(0.95 0.003 250)" }}>
                <th className="text-left px-4 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Employé
                </th>
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Contrat
                </th>
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Poste
                </th>
                {JOURS_COURT.map((j) => (
                  <th key={j} className="text-center px-2 py-2 font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)", minWidth: 36 }}>
                    {j}
                  </th>
                ))}
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Total
                </th>
                <th className="text-center px-3 py-2 font-semibold uppercase tracking-wide" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", color: "var(--navy)" }}>
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {actifs.map((emp, idx) => {
                const heures = planningActuel
                  ? calculerHeuresEmploye(emp.id, planningActuel.cellules)
                  : 0;
                const validation = validerContrat(emp, heures);
                const joursRepos = planningActuel
                  ? compterJoursRepos(emp.id, planningActuel.cellules)
                  : 0;
                const c = COULEURS_POSTE[emp.postePrincipal];

                return (
                  <tr
                    key={emp.id}
                    style={{ background: idx % 2 === 0 ? "white" : "oklch(0.985 0.001 250)" }}
                  >
                    <td className="px-4 py-2 font-semibold" style={{ color: "var(--navy)" }}>
                      {emp.nom}
                      {emp.contrainte && (
                        <div className="text-xs font-normal opacity-60">{emp.contrainte}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted-foreground)" }}>
                      {emp.typeContrat} {emp.heuresHebdo}h
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-semibold"
                        style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {emp.postePrincipal}
                      </span>
                    </td>
                    {JOURS_COURT.map((_, jourIdx) => {
                      const cellule = planningActuel?.cellules.find(
                        (c) => c.employeId === emp.id && c.jour === jourIdx
                      );
                      const b = cellule ? getBrique(cellule.brique) : null;
                      const isRepos = !b || b.code === "REPOS";
                      const isAbsence = b && b.type === "ABSENCE" && b.code !== "REPOS";
                      const posteCellule = cellule?.poste;
                      const couleur = posteCellule
                        ? COULEURS_POSTE[posteCellule]
                        : isAbsence
                        ? { bg: "#FFE5CC", text: "#7D3C00", border: "#E07B39" }
                        : { bg: "#F0F0F0", text: "#6C757D", border: "#ADB5BD" };

                      return (
                        <td key={jourIdx} className="px-1 py-1 text-center">
                          <div
                            className="rounded text-center py-0.5 px-1"
                            style={{
                              backgroundColor: couleur.bg,
                              color: couleur.text,
                              fontSize: 9,
                              fontFamily: "'IBM Plex Mono', monospace",
                              minWidth: 28,
                            }}
                          >
                            {isRepos ? "—" : isAbsence ? b!.code.slice(0, 3) : b ? `${b.duree}h` : "—"}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--navy)" }}>
                      {heures > 0 ? `${heures}h` : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {heures === 0 ? (
                        <span className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "'IBM Plex Mono', monospace" }}>À remplir</span>
                      ) : validation.ok ? (
                        <span className="text-xs font-semibold" style={{ color: "#155724", fontFamily: "'IBM Plex Mono', monospace" }}>✓ OK</span>
                      ) : (
                        <span className="text-xs font-semibold" style={{ color: "#7D3C00", fontFamily: "'IBM Plex Mono', monospace" }}>⚠ {heures}h/{emp.heuresHebdo}h</span>
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
