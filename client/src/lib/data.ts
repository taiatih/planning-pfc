// ============================================================
// PFC Planning Manager — Structure de données centrale
// Design: "Terrain Pro" — Brutalisme fonctionnel, IBM Plex
// Postes: F&L (vert clair), SEC (teal), FRAIS (bleu), CAISSE (jaune)
// ============================================================

export type TypeContrat = "CDI" | "CDD" | "STAGE" | "ALTERNANCE";
export type Poste = "F&L" | "SEC" | "FRAIS" | "CAISSE";
export type StatutAbsence = "REPOS" | "CP" | "MALADIE" | "FORM" | "RTT" | "ABS-J" | "ABS-NJ" | "FERIE";
export type StatutPlanning = "BROUILLON" | "PUBLIE" | "AVENANT";

export interface Employe {
  id: string;
  nom: string;
  prenom: string;
  typeContrat: TypeContrat;
  heuresHebdo: number;
  heuresJour: number;
  dateDebut: string;
  dateFin?: string;
  postePrincipal: Poste;
  postesAutorises: Poste[];
  postesExclus: Poste[];
  ratioPrincipal: number; // % poste principal
  ratioSecondaire: { [key in Poste]?: number };
  contrainte?: string; // ex: "mi-temps thérapeutique 3h30/j max"
  actif: boolean;
  tuteur?: string;
  commentaire?: string;
}

export interface BriqueHoraire {
  code: string;
  label: string;
  heureDebut: string;
  heureFin: string;
  heureDebut2?: string;
  heureFin2?: string;
  duree: number; // en heures
  type: "TRAVAIL" | "ABSENCE";
  postes?: Poste[]; // postes compatibles
  couleur?: string;
}

export interface CellulePlanning {
  employeId: string;
  jour: number; // 0=Lundi, 6=Dimanche
  brique: string; // code brique
  poste?: Poste;
  note?: string;
}

export interface PlanningHebdo {
  id: string;
  semaine: number;
  annee: number;
  dateDebut: string; // YYYY-MM-DD lundi
  statut: StatutPlanning;
  cellules: CellulePlanning[];
  creeLe: string;
  modifieLe: string;
}

// ============================================================
// BRIQUES HORAIRES — Système modulaire explicite
// ============================================================
export const BRIQUES: BriqueHoraire[] = [
  // === BRIQUES SPÉCIALISTES F&L (Anthony, Houssem) — 4h ===
  { code: "FL-MATIN", label: "F&L Matin", heureDebut: "07:00", heureFin: "11:00", heureDebut2: "13:00", heureFin2: "17:00", duree: 8, type: "TRAVAIL", postes: ["F&L"] },
  { code: "FL-APREM", label: "F&L Après-midi", heureDebut: "09:00", heureFin: "13:00", heureDebut2: "14:00", heureFin2: "18:00", duree: 8, type: "TRAVAIL", postes: ["F&L"] },
  { code: "FL-FERME", label: "F&L Fermeture", heureDebut: "11:00", heureFin: "15:00", heureDebut2: "16:00", heureFin2: "20:00", duree: 8, type: "TRAVAIL", postes: ["F&L"] },

  // === BRIQUES MIRA — 8h (3j) et 9h (2j) ===
  { code: "MIRA-8H", label: "Journée 8h", heureDebut: "07:00", heureFin: "11:30", heureDebut2: "13:30", heureFin2: "17:00", duree: 8, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "MIRA-9H", label: "Journée 9h", heureDebut: "07:00", heureFin: "11:30", heureDebut2: "13:30", heureFin2: "18:00", duree: 9, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },

  // === BRIQUES STANDARDS 7h — Polyvalents (35h) ===
  { code: "OUVERTURE", label: "Ouverture 7h", heureDebut: "07:00", heureFin: "10:30", heureDebut2: "13:30", heureFin2: "17:00", duree: 7, type: "TRAVAIL", postes: ["SEC", "FRAIS", "F&L"] },
  { code: "MATIN", label: "Matin 9h-16h", heureDebut: "09:00", heureFin: "16:00", duree: 7, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "COUPURE", label: "Coupure 10h-17h", heureDebut: "10:00", heureFin: "13:30", heureDebut2: "14:30", heureFin2: "18:00", duree: 7, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "JOURNEE", label: "Journée 10h30-17h30", heureDebut: "10:30", heureFin: "14:00", heureDebut2: "16:30", heureFin2: "20:00", duree: 7, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "FERMETURE", label: "Fermeture 13h-20h", heureDebut: "13:00", heureFin: "20:00", duree: 7, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },

  // === BRIQUES CAISSE — Spécifiques ===
  { code: "CAISSE-OUVERTURE", label: "Caisse Ouverture 8h30", heureDebut: "08:30", heureFin: "12:00", heureDebut2: "13:00", heureFin2: "17:00", duree: 7, type: "TRAVAIL", postes: ["CAISSE"] },
  { code: "CAISSE-MATIN", label: "Caisse Matin 9h-16h", heureDebut: "09:00", heureFin: "16:00", duree: 7, type: "TRAVAIL", postes: ["CAISSE"] },
  { code: "CAISSE-FERMETURE", label: "Caisse Fermeture 13h-20h", heureDebut: "13:00", heureFin: "20:00", duree: 7, type: "TRAVAIL", postes: ["CAISSE"] },

  // === BRIQUES MI-TEMPS THÉRAPEUTIQUE — Isabelle (3h30) ===
  { code: "MT-MATIN", label: "Mi-temps Matin 9h-12h30", heureDebut: "09:00", heureFin: "12:30", duree: 3.5, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "MT-MIDI", label: "Mi-temps Midi 13h-16h30", heureDebut: "13:00", heureFin: "16:30", duree: 3.5, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "MT-APREM", label: "Mi-temps Après-midi 16h30-20h", heureDebut: "16:30", heureFin: "20:00", duree: 3.5, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },

  // === ABSENCES ===
  { code: "REPOS", label: "Repos", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "CP", label: "Congés payés", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "MALADIE", label: "Arrêt maladie", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "FORM", label: "Formation", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "RTT", label: "RTT", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "ABS-J", label: "Absence justifiée", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "ABS-NJ", label: "Absence non justifiée", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "FERIE", label: "Jour férié travaillé", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
];

export const getBrique = (code: string): BriqueHoraire | undefined =>
  BRIQUES.find((b) => b.code === code);

// ============================================================
// COULEURS PAR POSTE ET PAR STATUT
// ============================================================
export const COULEURS_POSTE: Record<Poste, { bg: string; text: string; border: string }> = {
  "F&L":    { bg: "#D4EDDA", text: "#155724", border: "#28A745" },
  "SEC":    { bg: "#D1ECE8", text: "#0D5246", border: "#1ABC9C" },
  "FRAIS":  { bg: "#D0E8F5", text: "#0A3D62", border: "#2980B9" },
  "CAISSE": { bg: "#FFF3CD", text: "#856404", border: "#FFC107" },
};

export const COULEURS_ABSENCE: Record<string, { bg: string; text: string; border: string }> = {
  REPOS:    { bg: "#F0F0F0", text: "#6C757D", border: "#ADB5BD" },
  CP:       { bg: "#CCE5FF", text: "#004085", border: "#3B82F6" },
  MALADIE:  { bg: "#FFE5CC", text: "#7D3C00", border: "#E07B39" },
  FORM:     { bg: "#E8D5F5", text: "#4A235A", border: "#9B59B6" },
  RTT:      { bg: "#D5F5E3", text: "#1E5631", border: "#27AE60" },
  "ABS-J":  { bg: "#FFF3CD", text: "#856404", border: "#FFC107" },
  "ABS-NJ": { bg: "#F8D7DA", text: "#721C24", border: "#DC3545" },
  FERIE:    { bg: "#FCE4EC", text: "#880E4F", border: "#E91E63" },
};

// ============================================================
// EMPLOYÉS — 15 employés réels de PFC Markets SUD
// ============================================================
export const EMPLOYES_INITIAUX: Employe[] = [
  {
    id: "anthony",
    nom: "ANTHONY",
    prenom: "Anthony",
    typeContrat: "CDI",
    heuresHebdo: 40,
    heuresJour: 8,
    dateDebut: "2020-01-01",
    postePrincipal: "F&L",
    postesAutorises: ["F&L"],
    postesExclus: ["CAISSE", "SEC", "FRAIS"],
    ratioPrincipal: 100,
    ratioSecondaire: {},
    actif: true,
    commentaire: "Spécialiste Fruits & Légumes — 40h/sem (8h×5j)",
  },
  {
    id: "houssem",
    nom: "HOUSSEM",
    prenom: "Houssem",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2021-03-01",
    postePrincipal: "F&L",
    postesAutorises: ["F&L"],
    postesExclus: ["CAISSE", "SEC", "FRAIS"],
    ratioPrincipal: 100,
    ratioSecondaire: {},
    actif: true,
    commentaire: "Spécialiste Fruits & Légumes — 35h/sem",
  },
  {
    id: "mira",
    nom: "MIRA",
    prenom: "Mira",
    typeContrat: "CDI",
    heuresHebdo: 42,
    heuresJour: 8.4,
    dateDebut: "2019-06-01",
    postePrincipal: "SEC",
    postesAutorises: ["SEC", "FRAIS", "CAISSE"],
    postesExclus: ["F&L"],
    ratioPrincipal: 50,
    ratioSecondaire: { FRAIS: 30, CAISSE: 20 },
    actif: true,
    commentaire: "42h/sem — 8h×3j + 9h×2j",
  },
  {
    id: "cassandra",
    nom: "CASSANDRA",
    prenom: "Cassandra",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2020-09-01",
    postePrincipal: "CAISSE",
    postesAutorises: ["CAISSE", "SEC"],
    postesExclus: ["F&L"],
    ratioPrincipal: 80,
    ratioSecondaire: { SEC: 20 },
    actif: true,
    commentaire: "1ère caissière — priorité CAISSE",
  },
  {
    id: "isabelle",
    nom: "ISABELLE",
    prenom: "Isabelle",
    typeContrat: "CDI",
    heuresHebdo: 17.5,
    heuresJour: 3.5,
    dateDebut: "2018-04-01",
    postePrincipal: "CAISSE",
    postesAutorises: ["CAISSE", "SEC", "FRAIS"],
    postesExclus: ["F&L"],
    ratioPrincipal: 40,
    ratioSecondaire: { SEC: 30, FRAIS: 30 },
    actif: true,
    contrainte: "Mi-temps thérapeutique temporaire — 3h30/j max",
    commentaire: "Polyvalente — mi-temps thérapeutique 3h30/j",
  },
  {
    id: "abdullah",
    nom: "ABDULLAH",
    prenom: "Abdullah",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2021-01-01",
    postePrincipal: "FRAIS",
    postesAutorises: ["FRAIS", "SEC"],
    postesExclus: ["CAISSE", "F&L"],
    ratioPrincipal: 60,
    ratioSecondaire: { SEC: 40 },
    actif: true,
  },
  {
    id: "laura",
    nom: "LAURA / CÉLIA",
    prenom: "Laura",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2020-02-01",
    postePrincipal: "FRAIS",
    postesAutorises: ["FRAIS", "SEC", "CAISSE"],
    postesExclus: ["F&L"],
    ratioPrincipal: 40,
    ratioSecondaire: { SEC: 30, CAISSE: 30 },
    actif: true,
  },
  {
    id: "mohammad",
    nom: "MOHAMMAD",
    prenom: "Mohammad",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2022-05-01",
    postePrincipal: "SEC",
    postesAutorises: ["SEC", "FRAIS"],
    postesExclus: ["CAISSE", "F&L"],
    ratioPrincipal: 60,
    ratioSecondaire: { FRAIS: 40 },
    actif: true,
  },
  {
    id: "fabiola",
    nom: "FABIOLA",
    prenom: "Fabiola",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2021-09-01",
    postePrincipal: "SEC",
    postesAutorises: ["SEC", "FRAIS", "CAISSE"],
    postesExclus: ["F&L"],
    ratioPrincipal: 40,
    ratioSecondaire: { FRAIS: 30, CAISSE: 30 },
    actif: true,
  },
  {
    id: "will",
    nom: "WILL",
    prenom: "Will",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2020-11-01",
    postePrincipal: "CAISSE",
    postesAutorises: ["CAISSE", "SEC", "FRAIS"],
    postesExclus: ["F&L"],
    ratioPrincipal: 40,
    ratioSecondaire: { SEC: 30, FRAIS: 30 },
    actif: true,
  },
  {
    id: "aline",
    nom: "ALINE",
    prenom: "Aline",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2019-03-01",
    postePrincipal: "CAISSE",
    postesAutorises: ["CAISSE", "SEC"],
    postesExclus: ["F&L", "FRAIS"],
    ratioPrincipal: 70,
    ratioSecondaire: { SEC: 30 },
    actif: true,
  },
  {
    id: "tom",
    nom: "TOM",
    prenom: "Tom",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2022-01-01",
    postePrincipal: "FRAIS",
    postesAutorises: ["FRAIS", "SEC", "CAISSE"],
    postesExclus: ["F&L"],
    ratioPrincipal: 40,
    ratioSecondaire: { SEC: 30, CAISSE: 30 },
    actif: true,
  },
  {
    id: "emma",
    nom: "EMMA",
    prenom: "Emma",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2021-06-01",
    postePrincipal: "FRAIS",
    postesAutorises: ["FRAIS", "SEC"],
    postesExclus: ["CAISSE", "F&L"],
    ratioPrincipal: 60,
    ratioSecondaire: { SEC: 40 },
    actif: true,
  },
  {
    id: "fleg",
    nom: "FLEG",
    prenom: "Fleg",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2020-07-01",
    postePrincipal: "SEC",
    postesAutorises: ["SEC", "FRAIS", "CAISSE"],
    postesExclus: ["F&L"],
    ratioPrincipal: 40,
    ratioSecondaire: { FRAIS: 30, CAISSE: 30 },
    actif: true,
  },
  {
    id: "angelique",
    nom: "ANGÉLIQUE",
    prenom: "Angélique",
    typeContrat: "CDI",
    heuresHebdo: 35,
    heuresJour: 7,
    dateDebut: "2023-02-01",
    postePrincipal: "SEC",
    postesAutorises: ["SEC", "FRAIS", "CAISSE"],
    postesExclus: ["F&L"],
    ratioPrincipal: 40,
    ratioSecondaire: { FRAIS: 30, CAISSE: 30 },
    actif: true,
  },
];

// ============================================================
// JOURS DE LA SEMAINE
// ============================================================
export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const JOURS_LONG = JOURS;
export const JOURS_COURT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Alias pour compatibilité
export type Planning = PlanningHebdo;
export type Alerte = { employeId: string; nom: string; type: string; message: string };
export type Stats = StatsDashboard;

// ============================================================
// UTILITAIRES DATE
// ============================================================
export function getLundiDeSemaine(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getNumeroSemaine(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateCourt(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function dateToString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function stringToDate(str: string): Date {
  return new Date(str + "T00:00:00");
}

// ============================================================
// CALCULS HEURES
// ============================================================
export function calculerHeuresJour(brique: BriqueHoraire): number {
  return brique.duree;
}

export function calculerHeuresSemaine(cellules: CellulePlanning[]): number {
  return cellules.reduce((total, c) => {
    const b = getBrique(c.brique);
    return total + (b ? b.duree : 0);
  }, 0);
}

export function calculerHeuresEmploye(employeId: string, cellules: CellulePlanning[]): number {
  return calculerHeuresSemaine(cellules.filter((c) => c.employeId === employeId));
}

export function validerContrat(employe: Employe, heures: number): { ok: boolean; ecart: number; message: string } {
  const ecart = Math.abs(heures - employe.heuresHebdo);
  const ok = ecart <= 2;
  return {
    ok,
    ecart,
    message: ok
      ? `✅ ${heures}h / ${employe.heuresHebdo}h`
      : `⚠️ ${heures}h / ${employe.heuresHebdo}h (écart: ${ecart.toFixed(1)}h)`,
  };
}

export function compterJoursTravailles(employeId: string, cellules: CellulePlanning[]): number {
  return cellules.filter((c) => {
    if (c.employeId !== employeId) return false;
    const b = getBrique(c.brique);
    return b && b.type === "TRAVAIL";
  }).length;
}

export function compterJoursRepos(employeId: string, cellules: CellulePlanning[]): number {
  return cellules.filter((c) => {
    if (c.employeId !== employeId) return false;
    const b = getBrique(c.brique);
    return b && b.code === "REPOS";
  }).length;
}

// ============================================================
// GÉNÉRATION PLANNING VIDE
// ============================================================
export function genererPlanningVide(lundi: Date, employes: Employe[]): CellulePlanning[] {
  const cellules: CellulePlanning[] = [];
  employes.forEach((emp) => {
    for (let j = 0; j < 7; j++) {
      cellules.push({
        employeId: emp.id,
        jour: j,
        brique: "REPOS",
        poste: undefined,
      });
    }
  });
  return cellules;
}

// ============================================================
// STORAGE LOCAL
// ============================================================
const STORAGE_KEY_EMPLOYES = "pfc_employes";
const STORAGE_KEY_PLANNINGS = "pfc_plannings";

export function chargerEmployes(): Employe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMPLOYES);
    return raw ? JSON.parse(raw) : EMPLOYES_INITIAUX;
  } catch {
    return EMPLOYES_INITIAUX;
  }
}

export function sauvegarderEmployes(employes: Employe[]): void {
  localStorage.setItem(STORAGE_KEY_EMPLOYES, JSON.stringify(employes));
}

export function chargerPlannings(): PlanningHebdo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLANNINGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function sauvegarderPlannings(plannings: PlanningHebdo[]): void {
  localStorage.setItem(STORAGE_KEY_PLANNINGS, JSON.stringify(plannings));
}

export function trouverOuCreerPlanning(
  semaine: number,
  annee: number,
  lundi: Date,
  employes: Employe[]
): { planning: PlanningHebdo; isNew: boolean } {
  const plannings = chargerPlannings();
  const existing = plannings.find((p) => p.semaine === semaine && p.annee === annee);
  if (existing) return { planning: existing, isNew: false };

  const nouveau: PlanningHebdo = {
    id: `${annee}-S${semaine}`,
    semaine,
    annee,
    dateDebut: dateToString(lundi),
    statut: "BROUILLON",
    cellules: genererPlanningVide(lundi, employes),
    creeLe: new Date().toISOString(),
    modifieLe: new Date().toISOString(),
  };
  return { planning: nouveau, isNew: true };
}

export function sauvegarderPlanning(planning: PlanningHebdo): void {
  const plannings = chargerPlannings();
  const idx = plannings.findIndex((p) => p.id === planning.id);
  const updated = { ...planning, modifieLe: new Date().toISOString() };
  if (idx >= 0) plannings[idx] = updated;
  else plannings.push(updated);
  sauvegarderPlannings(plannings);
}

// ============================================================
// STATISTIQUES DASHBOARD
// ============================================================
export interface StatsDashboard {
  // Alias Stats
  totalEmployesActifs: number;
  totalHeuresPlanifiees: number;
  conformiteContrats: number; // %
  nombreAlertes: number;
  couvertureParJour: { jour: string; total: number; parPoste: Record<Poste, number> }[];
  alertes: { employeId: string; nom: string; type: string; message: string }[];
}

export function calculerStats(planning: PlanningHebdo | null, employes: Employe[]): StatsDashboard {
  if (!planning) {
    return {
      totalEmployesActifs: employes.filter((e) => e.actif).length,
      totalHeuresPlanifiees: 0,
      conformiteContrats: 0,
      nombreAlertes: 0,
      couvertureParJour: JOURS_COURT.map((j) => ({
        jour: j,
        total: 0,
        parPoste: { "F&L": 0, SEC: 0, FRAIS: 0, CAISSE: 0 },
      })),
      alertes: [],
    };
  }

  const actifs = employes.filter((e) => e.actif);
  let totalHeures = 0;
  let conformes = 0;
  const alertes: StatsDashboard["alertes"] = [];

  actifs.forEach((emp) => {
    const heures = calculerHeuresEmploye(emp.id, planning.cellules);
    totalHeures += heures;
    
    // Ne valider que si l'employé a au moins une cellule remplie (non-REPOS)
    const aTravaille = planning.cellules.some((c) => {
      if (c.employeId !== emp.id) return false;
      const b = getBrique(c.brique);
      return b && b.type === "TRAVAIL";
    });
    
    if (aTravaille) {
      const validation = validerContrat(emp, heures);
      if (validation.ok) conformes++;
      else {
        alertes.push({
          employeId: emp.id,
          nom: emp.nom,
          type: "CONTRAT",
          message: validation.message,
        });
      }

      // Vérifier jours de repos seulement si l'employé a commencé à être planifié
      const joursRepos = compterJoursRepos(emp.id, planning.cellules);
      const joursTravailles = compterJoursTravailles(emp.id, planning.cellules);
      if (joursTravailles >= 5 && joursRepos < 2) {
        alertes.push({
          employeId: emp.id,
          nom: emp.nom,
          type: "REPOS",
          message: `⚠️ Seulement ${joursRepos} jour(s) de repos (min. 2 requis)`,
        });
      }
    }
  });

  // Couverture par jour
  const couvertureParJour = JOURS_COURT.map((jour, jourIdx) => {
    const parPoste: Record<Poste, number> = { "F&L": 0, SEC: 0, FRAIS: 0, CAISSE: 0 };
    let total = 0;
    planning.cellules
      .filter((c) => c.jour === jourIdx)
      .forEach((c) => {
        const b = getBrique(c.brique);
        if (b && b.type === "TRAVAIL" && c.poste) {
          parPoste[c.poste]++;
          total++;
        }
      });
    return { jour, total, parPoste };
  });

  // Compter seulement les employés qui ont été planifiés
  const emploiesPlanifies = actifs.filter((emp) =>
    planning.cellules.some((c) => {
      if (c.employeId !== emp.id) return false;
      const b = getBrique(c.brique);
      return b && b.type === "TRAVAIL";
    })
  ).length;

  return {
    totalEmployesActifs: actifs.length,
    totalHeuresPlanifiees: totalHeures,
    conformiteContrats: emploiesPlanifies > 0 ? Math.round((conformes / emploiesPlanifies) * 100) : 100,
    nombreAlertes: alertes.length,
    couvertureParJour,
    alertes,
  };
}
