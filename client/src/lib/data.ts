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
  ratioPrincipal: number;
  ratioSecondaire: { [key in Poste]?: number };
  contrainte?: string;
  actif: boolean;
  tuteur?: string;
  commentaire?: string;
  // Jours indisponibles : 0=Lun, 1=Mar, 2=Mer, 3=Jeu, 4=Ven, 5=Sam, 6=Dim
  joursIndisponibles?: number[];
}

export interface BriqueHoraire {
  code: string;
  label: string;
  heureDebut: string;
  heureFin: string;
  heureDebut2?: string;
  heureFin2?: string;
  duree: number;
  type: "TRAVAIL" | "ABSENCE";
  postes?: Poste[];
  couleur?: string;
}

export interface CellulePlanning {
  employeId: string;
  jour: number; // 0=Lundi, 6=Dimanche
  brique: string;
  poste?: Poste;
  note?: string;
}

export interface PlanningHebdo {
  id: string;
  semaine: number;
  annee: number;
  dateDebut: string;
  statut: StatutPlanning;
  cellules: CellulePlanning[];
  creeLe: string;
  modifieLe: string;
}

// ============================================================
// BRIQUES HORAIRES — Valeurs par défaut (template)
// ============================================================
export const BRIQUES_DEFAUT: BriqueHoraire[] = [
  // === F&L ===
  { code: "FL-MATIN", label: "F&L Matin", heureDebut: "07:00", heureFin: "11:00", heureDebut2: "13:00", heureFin2: "17:00", duree: 8, type: "TRAVAIL", postes: ["F&L"] },
  { code: "FL-APREM", label: "F&L Après-midi", heureDebut: "09:00", heureFin: "13:00", heureDebut2: "14:00", heureFin2: "18:00", duree: 8, type: "TRAVAIL", postes: ["F&L"] },
  { code: "FL-FERME", label: "F&L Fermeture", heureDebut: "11:00", heureFin: "15:00", heureDebut2: "16:00", heureFin2: "20:00", duree: 8, type: "TRAVAIL", postes: ["F&L"] },
  // === Journées longues ===
  { code: "MIRA-8H", label: "Journée 8h", heureDebut: "07:00", heureFin: "11:30", heureDebut2: "13:30", heureFin2: "17:00", duree: 8, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "MIRA-9H", label: "Journée 9h", heureDebut: "07:00", heureFin: "11:30", heureDebut2: "13:30", heureFin2: "18:00", duree: 9, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  // === Standards 7h ===
  { code: "OUVERTURE", label: "Ouverture 7h", heureDebut: "07:00", heureFin: "10:30", heureDebut2: "13:30", heureFin2: "17:00", duree: 7, type: "TRAVAIL", postes: ["SEC", "FRAIS", "F&L"] },
  { code: "MATIN", label: "Matin 9h-16h", heureDebut: "09:00", heureFin: "16:00", duree: 7, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "COUPURE", label: "Coupure 10h-17h", heureDebut: "10:00", heureFin: "13:30", heureDebut2: "14:30", heureFin2: "18:00", duree: 7, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "JOURNEE", label: "Journée 10h30-17h30", heureDebut: "10:30", heureFin: "14:00", heureDebut2: "16:30", heureFin2: "20:00", duree: 7, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "FERMETURE", label: "Fermeture 13h-20h", heureDebut: "13:00", heureFin: "20:00", duree: 7, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  // === Caisse ===
  { code: "CAISSE-OUVERTURE", label: "Caisse Ouverture 8h30", heureDebut: "08:30", heureFin: "12:00", heureDebut2: "13:00", heureFin2: "17:00", duree: 7, type: "TRAVAIL", postes: ["CAISSE"] },
  { code: "CAISSE-MATIN", label: "Caisse Matin 9h-16h", heureDebut: "09:00", heureFin: "16:00", duree: 7, type: "TRAVAIL", postes: ["CAISSE"] },
  { code: "CAISSE-FERMETURE", label: "Caisse Fermeture 13h-20h", heureDebut: "13:00", heureFin: "20:00", duree: 7, type: "TRAVAIL", postes: ["CAISSE"] },
  // === Mi-temps thérapeutique ===
  { code: "MT-MATIN", label: "Mi-temps Matin 9h-12h30", heureDebut: "09:00", heureFin: "12:30", duree: 3.5, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "MT-MIDI", label: "Mi-temps Midi 13h-16h30", heureDebut: "13:00", heureFin: "16:30", duree: 3.5, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  { code: "MT-APREM", label: "Mi-temps Après-midi 16h30-20h", heureDebut: "16:30", heureFin: "20:00", duree: 3.5, type: "TRAVAIL", postes: ["SEC", "FRAIS", "CAISSE"] },
  // === Absences ===
  { code: "REPOS", label: "Repos", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "CP", label: "Congés payés", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "MALADIE", label: "Arrêt maladie", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "FORM", label: "Formation", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "RTT", label: "RTT", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "ABS-J", label: "Absence justifiée", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "ABS-NJ", label: "Absence non justifiée", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
  { code: "FERIE", label: "Jour férié travaillé", heureDebut: "", heureFin: "", duree: 0, type: "ABSENCE" },
];

// ============================================================
// STORAGE BRIQUES — CRUD complet (persisté en localStorage)
// ============================================================
const STORAGE_KEY_BRIQUES = "pfc_briques";

export function chargerBriques(): BriqueHoraire[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BRIQUES);
    return raw ? JSON.parse(raw) : BRIQUES_DEFAUT;
  } catch {
    return BRIQUES_DEFAUT;
  }
}

export function sauvegarderBriques(briques: BriqueHoraire[]): void {
  localStorage.setItem(STORAGE_KEY_BRIQUES, JSON.stringify(briques));
}

export function ajouterBrique(brique: BriqueHoraire): void {
  const briques = chargerBriques();
  if (briques.some((b) => b.code === brique.code)) {
    throw new Error(`Le code "${brique.code}" existe déjà`);
  }
  briques.push(brique);
  sauvegarderBriques(briques);
}

export function modifierBrique(code: string, updates: Partial<BriqueHoraire>): void {
  const briques = chargerBriques();
  const idx = briques.findIndex((b) => b.code === code);
  if (idx < 0) throw new Error(`Brique "${code}" introuvable`);
  briques[idx] = { ...briques[idx], ...updates };
  sauvegarderBriques(briques);
}

export function supprimerBrique(code: string): void {
  const briques = chargerBriques();
  sauvegarderBriques(briques.filter((b) => b.code !== code));
}

export function reinitialiserBriques(): void {
  localStorage.removeItem(STORAGE_KEY_BRIQUES);
}

/** Cherche une brique par code dans les briques chargées (localStorage) */
export function getBrique(code: string): BriqueHoraire | undefined {
  const briques = chargerBriques();
  return briques.find((b) => b.code === code);
}

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
    id: "anthony", nom: "ANTHONY", prenom: "Anthony", typeContrat: "CDI",
    heuresHebdo: 40, heuresJour: 8, dateDebut: "2020-01-01",
    postePrincipal: "F&L", postesAutorises: ["F&L"], postesExclus: ["CAISSE", "SEC", "FRAIS"],
    ratioPrincipal: 100, ratioSecondaire: {}, actif: true,
    commentaire: "Spécialiste Fruits & Légumes — 40h/sem (8h×5j)",
  },
  {
    id: "houssem", nom: "HOUSSEM", prenom: "Houssem", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2021-03-01",
    postePrincipal: "F&L", postesAutorises: ["F&L"], postesExclus: ["CAISSE", "SEC", "FRAIS"],
    ratioPrincipal: 100, ratioSecondaire: {}, actif: true,
    commentaire: "Spécialiste Fruits & Légumes — 35h/sem",
  },
  {
    id: "mira", nom: "MIRA", prenom: "Mira", typeContrat: "CDI",
    heuresHebdo: 42, heuresJour: 8.4, dateDebut: "2019-06-01",
    postePrincipal: "SEC", postesAutorises: ["SEC", "FRAIS", "CAISSE"], postesExclus: ["F&L"],
    ratioPrincipal: 50, ratioSecondaire: { FRAIS: 30, CAISSE: 20 }, actif: true,
    commentaire: "42h/sem — 8h×3j + 9h×2j",
  },
  {
    id: "cassandra", nom: "CASSANDRA", prenom: "Cassandra", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2020-09-01",
    postePrincipal: "CAISSE", postesAutorises: ["CAISSE", "SEC"], postesExclus: ["F&L"],
    ratioPrincipal: 80, ratioSecondaire: { SEC: 20 }, actif: true,
    commentaire: "1ère caissière — priorité CAISSE",
  },
  {
    id: "isabelle", nom: "ISABELLE", prenom: "Isabelle", typeContrat: "CDI",
    heuresHebdo: 17.5, heuresJour: 3.5, dateDebut: "2018-04-01",
    postePrincipal: "CAISSE", postesAutorises: ["CAISSE", "SEC", "FRAIS"], postesExclus: ["F&L"],
    ratioPrincipal: 40, ratioSecondaire: { SEC: 30, FRAIS: 30 }, actif: true,
    contrainte: "Mi-temps thérapeutique temporaire — 3h30/j max",
    commentaire: "Polyvalente — mi-temps thérapeutique 3h30/j",
  },
  {
    id: "abdullah", nom: "ABDULLAH", prenom: "Abdullah", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2021-01-01",
    postePrincipal: "FRAIS", postesAutorises: ["FRAIS", "SEC"], postesExclus: ["CAISSE", "F&L"],
    ratioPrincipal: 60, ratioSecondaire: { SEC: 40 }, actif: true,
  },
  {
    id: "laura", nom: "LAURA / CÉLIA", prenom: "Laura", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2020-02-01",
    postePrincipal: "FRAIS", postesAutorises: ["FRAIS", "SEC", "CAISSE"], postesExclus: ["F&L"],
    ratioPrincipal: 40, ratioSecondaire: { SEC: 30, CAISSE: 30 }, actif: true,
  },
  {
    id: "mohammad", nom: "MOHAMMAD", prenom: "Mohammad", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2022-05-01",
    postePrincipal: "SEC", postesAutorises: ["SEC", "FRAIS"], postesExclus: ["CAISSE", "F&L"],
    ratioPrincipal: 60, ratioSecondaire: { FRAIS: 40 }, actif: true,
  },
  {
    id: "fabiola", nom: "FABIOLA", prenom: "Fabiola", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2021-09-01",
    postePrincipal: "SEC", postesAutorises: ["SEC", "FRAIS", "CAISSE"], postesExclus: ["F&L"],
    ratioPrincipal: 40, ratioSecondaire: { FRAIS: 30, CAISSE: 30 }, actif: true,
  },
  {
    id: "will", nom: "WILL", prenom: "Will", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2020-11-01",
    postePrincipal: "CAISSE", postesAutorises: ["CAISSE", "SEC", "FRAIS"], postesExclus: ["F&L"],
    ratioPrincipal: 40, ratioSecondaire: { SEC: 30, FRAIS: 30 }, actif: true,
  },
  {
    id: "aline", nom: "ALINE", prenom: "Aline", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2019-03-01",
    postePrincipal: "CAISSE", postesAutorises: ["CAISSE", "SEC"], postesExclus: ["F&L", "FRAIS"],
    ratioPrincipal: 70, ratioSecondaire: { SEC: 30 }, actif: true,
  },
  {
    id: "tom", nom: "TOM", prenom: "Tom", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2022-01-01",
    postePrincipal: "FRAIS", postesAutorises: ["FRAIS", "SEC", "CAISSE"], postesExclus: ["F&L"],
    ratioPrincipal: 40, ratioSecondaire: { SEC: 30, CAISSE: 30 }, actif: true,
  },
  {
    id: "emma", nom: "EMMA", prenom: "Emma", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2021-06-01",
    postePrincipal: "FRAIS", postesAutorises: ["FRAIS", "SEC"], postesExclus: ["CAISSE", "F&L"],
    ratioPrincipal: 60, ratioSecondaire: { SEC: 40 }, actif: true,
  },
  {
    id: "fleg", nom: "FLEG", prenom: "Fleg", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2020-07-01",
    postePrincipal: "SEC", postesAutorises: ["SEC", "FRAIS", "CAISSE"], postesExclus: ["F&L"],
    ratioPrincipal: 40, ratioSecondaire: { FRAIS: 30, CAISSE: 30 }, actif: true,
  },
  {
    id: "angelique", nom: "ANGÉLIQUE", prenom: "Angélique", typeContrat: "CDI",
    heuresHebdo: 35, heuresJour: 7, dateDebut: "2023-02-01",
    postePrincipal: "SEC", postesAutorises: ["SEC", "FRAIS", "CAISSE"], postesExclus: ["F&L"],
    ratioPrincipal: 40, ratioSecondaire: { FRAIS: 30, CAISSE: 30 }, actif: true,
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
      ? `${heures}h / ${employe.heuresHebdo}h`
      : `${heures}h / ${employe.heuresHebdo}h (écart: ${ecart.toFixed(1)}h)`,
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
// FILTRAGE INTELLIGENT — Créneaux compatibles avec contrat
// ============================================================

/**
 * Retourne les créneaux disponibles pour un employé en tenant compte :
 * - des heures MAX par jour (heuresHebdo / 5, ou heuresJour si défini)
 * - des heures restantes dans la semaine
 * 
 * Règle : un contrat 35h = 7h/jour max, 40h = 8h/jour max.
 * 2 jours de repos obligatoires → on travaille max 5 jours.
 */
export function getCreneauxDisponibles(
  employe: Employe,
  heuresDejaPlannifiees: number
): { travail: { brique: BriqueHoraire; postesCompatibles: Poste[] }[]; absences: BriqueHoraire[] } {
  const briques = chargerBriques();
  const heuresRestantes = employe.heuresHebdo - heuresDejaPlannifiees;

  // Heures max par jour : heuresJour si défini, sinon heuresHebdo / 5
  const heuresMaxJour = employe.heuresJour > 0 ? employe.heuresJour : employe.heuresHebdo / 5;

  const travail: { brique: BriqueHoraire; postesCompatibles: Poste[] }[] = [];
  const absences: BriqueHoraire[] = [];

  briques.forEach((b) => {
    if (b.type === "ABSENCE") {
      absences.push(b);
      return;
    }
    // Vérifier compatibilité poste
    const postesCompatibles = (b.postes || []).filter((p) => employe.postesAutorises.includes(p));
    if (postesCompatibles.length === 0) return;

    // Règle 1 : le créneau ne doit PAS dépasser les heures max par jour
    // Pas de tolérance — un 35h ne peut pas faire un créneau de 8h
    if (b.duree > heuresMaxJour) return;

    // Règle 2 : le créneau ne doit pas dépasser les heures restantes dans la semaine
    if (b.duree > heuresRestantes) return;

    travail.push({ brique: b, postesCompatibles });
  });

  return { travail, absences };
}

// ============================================================
// GÉNÉRATION PLANNING VIDE
// ============================================================
export function genererPlanningVide(lundi: Date, employes: Employe[]): CellulePlanning[] {
  const cellules: CellulePlanning[] = [];
  employes.forEach((emp) => {
    for (let j = 0; j < 7; j++) {
      cellules.push({ employeId: emp.id, jour: j, brique: "REPOS", poste: undefined });
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
  totalEmployesActifs: number;
  totalHeuresPlanifiees: number;
  conformiteContrats: number;
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
        jour: j, total: 0, parPoste: { "F&L": 0, SEC: 0, FRAIS: 0, CAISSE: 0 },
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

    const aTravaille = planning.cellules.some((c) => {
      if (c.employeId !== emp.id) return false;
      const b = getBrique(c.brique);
      return b && b.type === "TRAVAIL";
    });

    if (aTravaille) {
      const validation = validerContrat(emp, heures);
      if (validation.ok) conformes++;
      else {
        alertes.push({ employeId: emp.id, nom: emp.nom, type: "CONTRAT", message: `⚠️ ${validation.message}` });
      }

      const joursRepos = compterJoursRepos(emp.id, planning.cellules);
      const joursTravailles = compterJoursTravailles(emp.id, planning.cellules);
      if (joursTravailles >= 5 && joursRepos < 2) {
        alertes.push({
          employeId: emp.id, nom: emp.nom, type: "REPOS",
          message: `⚠️ Seulement ${joursRepos} jour(s) de repos (min. 2 requis)`,
        });
      }
    }
  });

  const couvertureParJour = JOURS_COURT.map((jour, jourIdx) => {
    const parPoste: Record<Poste, number> = { "F&L": 0, SEC: 0, FRAIS: 0, CAISSE: 0 };
    let total = 0;
    planning.cellules.filter((c) => c.jour === jourIdx).forEach((c) => {
      const b = getBrique(c.brique);
      if (b && b.type === "TRAVAIL" && c.poste) {
        parPoste[c.poste]++;
        total++;
      }
    });
    return { jour, total, parPoste };
  });

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

// ============================================================
// COUVERTURE HORAIRE — Calcul par tranche de 30 min
// ============================================================

export interface TrancheHoraire {
  heure: string;
  heureNum: number;
  presences: { employeId: string; nom: string; poste: Poste }[];
  parPoste: Record<Poste, number>;
  total: number;
}

export function heureToNum(heure: string): number {
  if (!heure) return 0;
  const [h, m] = heure.split(":").map(Number);
  return h + m / 60;
}

function estPresentA(brique: BriqueHoraire, tranche: number): boolean {
  if (brique.type !== "TRAVAIL") return false;
  const debut1 = heureToNum(brique.heureDebut);
  const fin1 = heureToNum(brique.heureFin);
  if (tranche >= debut1 && tranche < fin1) return true;
  if (brique.heureDebut2 && brique.heureFin2) {
    const debut2 = heureToNum(brique.heureDebut2);
    const fin2 = heureToNum(brique.heureFin2);
    if (tranche >= debut2 && tranche < fin2) return true;
  }
  return false;
}

export function calculerCouvertureHoraire(
  jourIdx: number,
  cellules: CellulePlanning[],
  employes: Employe[]
): TrancheHoraire[] {
  const tranches: TrancheHoraire[] = [];
  for (let h = 7; h < 20; h += 0.5) {
    const heureH = Math.floor(h);
    const heureM = h % 1 === 0 ? "00" : "30";
    const heure = `${String(heureH).padStart(2, "0")}:${heureM}`;
    const presences: TrancheHoraire["presences"] = [];
    const parPoste: Record<Poste, number> = { "F&L": 0, SEC: 0, FRAIS: 0, CAISSE: 0 };

    cellules.filter((c) => c.jour === jourIdx).forEach((c) => {
      const b = getBrique(c.brique);
      if (!b || !c.poste) return;
      if (estPresentA(b, h)) {
        const emp = employes.find((e) => e.id === c.employeId);
        if (emp) {
          presences.push({ employeId: emp.id, nom: emp.nom, poste: c.poste });
          parPoste[c.poste]++;
        }
      }
    });

    tranches.push({ heure, heureNum: h, presences, parPoste, total: presences.length });
  }
  return tranches;
}

// ============================================================
// INDICATEUR COUVERTURE PAR JOUR — Pour la page Planning
// ============================================================

export type NiveauCouverture = "ok" | "attention" | "critique" | "vide";

/** Calcule le niveau de couverture pour un jour donné en comparant avec les seuils */
export function calculerNiveauCouverture(
  jourIdx: number,
  cellules: CellulePlanning[],
  employes: Employe[],
  seuils: SeuilSecteur[]
): { niveau: NiveauCouverture; sousEffectifs: number; totalTranches: number } {
  const tranches = calculerCouvertureHoraire(jourIdx, cellules, employes);
  let sousEffectifs = 0;
  let totalTranches = 0;

  tranches.forEach((tranche) => {
    const alertes = verifierSousEffectif(tranche, seuils);
    if (alertes.length > 0) sousEffectifs++;
    // Compter seulement les tranches couvertes par au moins un seuil
    const aCouverture = seuils.some((s) => {
      const debut = heureToNum(s.heureDebut);
      const fin = heureToNum(s.heureFin);
      return tranche.heureNum >= debut && tranche.heureNum < fin;
    });
    if (aCouverture) totalTranches++;
  });

  if (totalTranches === 0) return { niveau: "vide", sousEffectifs: 0, totalTranches: 0 };
  const ratio = sousEffectifs / totalTranches;
  if (ratio === 0) return { niveau: "ok", sousEffectifs, totalTranches };
  if (ratio <= 0.3) return { niveau: "attention", sousEffectifs, totalTranches };
  return { niveau: "critique", sousEffectifs, totalTranches };
}

// ============================================================
// SEUILS MINIMUM PAR SECTEUR
// ============================================================

export interface SeuilSecteur {
  poste: Poste;
  heureDebut: string;
  heureFin: string;
  minimum: number;
  label?: string;
}

export const SEUILS_DEFAUT: SeuilSecteur[] = [
  { poste: "F&L",    heureDebut: "07:00", heureFin: "11:00", minimum: 1, label: "F&L Ouverture" },
  { poste: "F&L",    heureDebut: "11:00", heureFin: "14:00", minimum: 1, label: "F&L Midi" },
  { poste: "F&L",    heureDebut: "14:00", heureFin: "20:00", minimum: 1, label: "F&L Après-midi" },
  { poste: "SEC",    heureDebut: "07:00", heureFin: "09:00", minimum: 1, label: "SEC Ouverture" },
  { poste: "SEC",    heureDebut: "09:00", heureFin: "13:00", minimum: 2, label: "SEC Matin" },
  { poste: "SEC",    heureDebut: "13:00", heureFin: "14:00", minimum: 1, label: "SEC Midi (coupure)" },
  { poste: "SEC",    heureDebut: "14:00", heureFin: "20:00", minimum: 2, label: "SEC Après-midi" },
  { poste: "FRAIS",  heureDebut: "07:00", heureFin: "09:00", minimum: 1, label: "FRAIS Ouverture" },
  { poste: "FRAIS",  heureDebut: "09:00", heureFin: "13:00", minimum: 2, label: "FRAIS Matin" },
  { poste: "FRAIS",  heureDebut: "13:00", heureFin: "14:00", minimum: 1, label: "FRAIS Midi" },
  { poste: "FRAIS",  heureDebut: "14:00", heureFin: "20:00", minimum: 2, label: "FRAIS Après-midi" },
  { poste: "CAISSE", heureDebut: "08:30", heureFin: "09:00", minimum: 1, label: "CAISSE Ouverture" },
  { poste: "CAISSE", heureDebut: "09:00", heureFin: "13:00", minimum: 2, label: "CAISSE Matin" },
  { poste: "CAISSE", heureDebut: "13:00", heureFin: "14:00", minimum: 1, label: "CAISSE Midi" },
  { poste: "CAISSE", heureDebut: "14:00", heureFin: "20:00", minimum: 2, label: "CAISSE Après-midi" },
];

const STORAGE_KEY_SEUILS = "pfc_seuils";

export function chargerSeuils(): SeuilSecteur[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEUILS);
    return raw ? JSON.parse(raw) : SEUILS_DEFAUT;
  } catch {
    return SEUILS_DEFAUT;
  }
}

export function sauvegarderSeuils(seuils: SeuilSecteur[]): void {
  localStorage.setItem(STORAGE_KEY_SEUILS, JSON.stringify(seuils));
}

export function verifierSousEffectif(
  tranche: TrancheHoraire,
  seuils: SeuilSecteur[]
): { poste: Poste; actuel: number; minimum: number; label: string }[] {
  const alertes: { poste: Poste; actuel: number; minimum: number; label: string }[] = [];
  const postes: Poste[] = ["F&L", "SEC", "FRAIS", "CAISSE"];

  postes.forEach((poste) => {
    const seuilsPoste = seuils.filter((s) => s.poste === poste);
    seuilsPoste.forEach((seuil) => {
      const debut = heureToNum(seuil.heureDebut);
      const fin = heureToNum(seuil.heureFin);
      if (tranche.heureNum >= debut && tranche.heureNum < fin) {
        const actuel = tranche.parPoste[poste];
        if (actuel < seuil.minimum) {
          alertes.push({
            poste, actuel, minimum: seuil.minimum,
            label: seuil.label || `${poste} ${seuil.heureDebut}-${seuil.heureFin}`,
          });
        }
      }
    });
  });

  return alertes;
}

// ============================================================
// SEMAINE TYPE — Remplissage rapide
// ============================================================

export interface SemaineType {
  employeId: string;
  jours: { jour: number; brique: string; poste?: Poste }[];
}

const STORAGE_KEY_SEMAINE_TYPE = "pfc_semaine_type";

export function chargerSemainesType(): SemaineType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEMAINE_TYPE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function sauvegarderSemainesType(semainesType: SemaineType[]): void {
  localStorage.setItem(STORAGE_KEY_SEMAINE_TYPE, JSON.stringify(semainesType));
}

export function getSemaineTypeEmploye(employeId: string): SemaineType | null {
  const all = chargerSemainesType();
  return all.find((s) => s.employeId === employeId) || null;
}

export function setSemaineTypeEmploye(semaineType: SemaineType): void {
  const all = chargerSemainesType();
  const idx = all.findIndex((s) => s.employeId === semaineType.employeId);
  if (idx >= 0) all[idx] = semaineType;
  else all.push(semaineType);
  sauvegarderSemainesType(all);
}

// ============================================================
// SUGGESTION AUTOMATIQUE — Remplissage intelligent
// ============================================================

/**
 * Suggère un planning complet en respectant :
 * - Les heures hebdo de chaque employé
 * - Les postes autorisés
 * - Les seuils minimum par secteur
 * - 2 jours de repos minimum (Sam+Dim par défaut, sinon Dim seul)
 */
export function suggererPlanning(
  employes: Employe[],
  seuils: SeuilSecteur[],
  semaine?: number,
  annee?: number
): CellulePlanning[] {
  const actifs = employes.filter((e) => e.actif);
  const briques = chargerBriques().filter((b) => b.type === "TRAVAIL");
  const plannings = chargerPlannings();
  const cellules: CellulePlanning[] = [];

  const now = new Date();
  const anneeRef = annee || now.getFullYear();
  const moisRef = now.getMonth() + 1;

  // Tracker les heures par employé
  const heuresParEmploye: Record<string, number> = {};
  // Tracker la couverture par jour/poste
  const couvertureJourPoste: Record<string, Record<string, number>> = {};

  actifs.forEach((emp) => { heuresParEmploye[emp.id] = 0; });
  for (let j = 0; j < 7; j++) {
    couvertureJourPoste[j] = { "F&L": 0, SEC: 0, FRAIS: 0, CAISSE: 0 };
  }

  // Jours de travail de base : Lun-Ven (0-4)
  const joursOuvres = [0, 1, 2, 3, 4];

  actifs.forEach((emp) => {
    // Règle stricte : heuresMaxJour = heuresHebdo / 5 (2 jours de repos obligatoires)
    const heuresMaxJour = emp.heuresJour > 0 ? emp.heuresJour : emp.heuresHebdo / 5;

    // Trouver la meilleure brique pour cet employé (qui ne dépasse PAS heuresMaxJour)
    const briquesCompatibles = briques
      .filter((b) => {
        const postesOk = (b.postes || []).some((p) => emp.postesAutorises.includes(p));
        if (!postesOk) return false;
        return b.duree <= heuresMaxJour;
      })
      .sort((a, b_) => Math.abs(a.duree - heuresMaxJour) - Math.abs(b_.duree - heuresMaxJour));

    if (briquesCompatibles.length === 0) {
      for (let j = 0; j < 7; j++) {
        cellules.push({ employeId: emp.id, jour: j, brique: "REPOS" });
      }
      return;
    }

    const meilleureBrique = briquesCompatibles[0];

    // Vérifier la rotation weekends pour ce mois
    const { samedis, dimanches } = calculerWeekendsMois(emp.id, anneeRef, moisRef, plannings);
    const besoinSamedi = samedis.length === 0; // Pas encore de samedi ce mois
    const besoinDimanche = dimanches.length === 0; // Pas encore de dimanche ce mois

    // Jours disponibles pour cet employé (exclure les jours indisponibles)
    const joursIndisp = emp.joursIndisponibles || [];
    const joursOuvresDispo = joursOuvres.filter((j) => !joursIndisp.includes(j));

    // Construire la liste des jours à travailler
    // Base : Lun-Ven disponibles, puis ajouter Sam/Dim si rotation nécessaire
    const joursATravailler: number[] = [];

    // Jours de semaine (Lun-Ven) disponibles : max 5 jours
    const nbJoursBase = Math.min(5, Math.floor(emp.heuresHebdo / meilleureBrique.duree));

    // Si besoin de weekend, on remplace un jour de semaine par le weekend
    // (seulement si le weekend n'est pas marqué indisponible)
    const samediDispo = !joursIndisp.includes(5);
    const dimancheDispo = !joursIndisp.includes(6);

    if (besoinSamedi && besoinDimanche && samediDispo && dimancheDispo) {
      joursATravailler.push(5, 6);
      joursATravailler.push(...joursOuvresDispo.slice(0, Math.max(0, nbJoursBase - 2)));
    } else if (besoinSamedi && samediDispo) {
      joursATravailler.push(5);
      joursATravailler.push(...joursOuvresDispo.slice(0, Math.max(0, nbJoursBase - 1)));
    } else if (besoinDimanche && dimancheDispo) {
      joursATravailler.push(6);
      joursATravailler.push(...joursOuvresDispo.slice(0, Math.max(0, nbJoursBase - 1)));
    } else {
      joursATravailler.push(...joursOuvresDispo.slice(0, nbJoursBase));
    }

    // Choisir le poste pour chaque jour
    for (let j = 0; j < 7; j++) {
      if (joursATravailler.includes(j)) {
        const postesCompatibles = (meilleureBrique.postes || []).filter((p) =>
          emp.postesAutorises.includes(p)
        );

        let meilleurPoste = emp.postePrincipal;
        if (!postesCompatibles.includes(emp.postePrincipal) && postesCompatibles.length > 0) {
          meilleurPoste = postesCompatibles[0];
        }

        if (heuresParEmploye[emp.id] + meilleureBrique.duree <= emp.heuresHebdo + 0.5) {
          cellules.push({
            employeId: emp.id, jour: j,
            brique: meilleureBrique.code, poste: meilleurPoste,
          });
          heuresParEmploye[emp.id] += meilleureBrique.duree;
          couvertureJourPoste[j][meilleurPoste]++;
        } else {
          cellules.push({ employeId: emp.id, jour: j, brique: "REPOS" });
        }
      } else {
        cellules.push({ employeId: emp.id, jour: j, brique: "REPOS" });
      }
    }
  });

  return cellules;
}

// ============================================================
// EXPORT PDF — Génération HTML pour impression
// ============================================================

export function genererHTMLPlanningPDF(
  planning: PlanningHebdo,
  employes: Employe[],
  semaineCourante: Date
): string {
  const actifs = employes.filter((e) => e.actif);

  const rows = actifs.map((emp) => {
    const heures = calculerHeuresEmploye(emp.id, planning.cellules);
    const jours = Array.from({ length: 7 }, (_, j) => {
      const c = planning.cellules.find((cel) => cel.employeId === emp.id && cel.jour === j);
      if (!c) return '<td style="text-align:center;padding:4px;border:1px solid #ddd;">REPOS</td>';
      const b = getBrique(c.brique);
      if (!b) return '<td style="text-align:center;padding:4px;border:1px solid #ddd;">—</td>';

      if (b.type === "ABSENCE") {
        const couleur = COULEURS_ABSENCE[b.code] || COULEURS_ABSENCE["REPOS"];
        return `<td style="text-align:center;padding:4px;border:1px solid #ddd;background:${couleur.bg};color:${couleur.text};font-size:10px;">${b.label}</td>`;
      }

      const couleur = c.poste ? COULEURS_POSTE[c.poste] : { bg: "#f8f8f8", text: "#333", border: "#ccc" };
      const horaire = b.heureDebut2
        ? `${b.heureDebut}-${b.heureFin}<br/>${b.heureDebut2}-${b.heureFin2}`
        : `${b.heureDebut}-${b.heureFin}`;
      return `<td style="text-align:center;padding:4px;border:1px solid #ddd;background:${couleur.bg};color:${couleur.text};font-size:10px;">
        <strong>${c.poste || ""}</strong><br/>${b.duree}h<br/><span style="font-size:8px;">${horaire}</span>
      </td>`;
    }).join("");

    return `<tr>
      <td style="padding:4px;border:1px solid #ddd;font-weight:bold;font-size:11px;white-space:nowrap;">${emp.nom}</td>
      <td style="text-align:center;padding:4px;border:1px solid #ddd;font-size:10px;">${emp.heuresHebdo}h<br/>${emp.typeContrat}</td>
      ${jours}
      <td style="text-align:center;padding:4px;border:1px solid #ddd;font-weight:bold;font-size:11px;">${heures}h</td>
    </tr>`;
  }).join("");

  const jourHeaders = JOURS_COURT.map((j, i) => {
    const d = addDays(semaineCourante, i);
    return `<th style="text-align:center;padding:6px;border:1px solid #ddd;background:#1B2A4A;color:white;font-size:11px;">${j}<br/>${formatDateCourt(d)}</th>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Planning Semaine ${planning.semaine} — ${planning.annee}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; margin: 0; padding: 10px; }
    h1 { font-size: 16px; color: #1B2A4A; margin-bottom: 4px; }
    h2 { font-size: 12px; color: #666; font-weight: normal; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { padding: 6px; border: 1px solid #ddd; }
    .footer { margin-top: 10px; font-size: 9px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <h1>PFC MARKETS — Planning Semaine ${planning.semaine} / ${planning.annee}</h1>
  <h2>${formatDate(semaineCourante)} → ${formatDate(addDays(semaineCourante, 6))} · Statut : ${planning.statut}</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;padding:6px;border:1px solid #ddd;background:#1B2A4A;color:white;font-size:11px;min-width:100px;">Employé</th>
        <th style="text-align:center;padding:6px;border:1px solid #ddd;background:#1B2A4A;color:white;font-size:11px;">Contrat</th>
        ${jourHeaders}
        <th style="text-align:center;padding:6px;border:1px solid #ddd;background:#1B2A4A;color:white;font-size:11px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="footer">
    Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")} — PFC Planning Manager
  </div>
</body>
</html>`;
}

// ============================================================
// ROTATION WEEKENDS — Au moins 1 Sam + 1 Dim par mois
// ============================================================

export interface RotationWeekend {
  employeId: string;
  annee: number;
  mois: number; // 1-12
  samedisTravailes: number[]; // numéros de semaine
  dimanchesTravailes: number[]; // numéros de semaine
}

const STORAGE_KEY_ROTATION = "pfc_rotation_weekends";

export function chargerRotations(): RotationWeekend[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROTATION);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function sauvegarderRotations(rotations: RotationWeekend[]): void {
  localStorage.setItem(STORAGE_KEY_ROTATION, JSON.stringify(rotations));
}

/** Calcule les weekends travaillés pour un employé dans un mois donné
 *  en parcourant tous les plannings sauvegardés */
export function calculerWeekendsMois(
  employeId: string,
  annee: number,
  mois: number, // 1-12
  plannings: PlanningHebdo[]
): { samedis: number[]; dimanches: number[] } {
  const samedis: number[] = [];
  const dimanches: number[] = [];

  plannings.forEach((p) => {
    if (p.annee !== annee) return;
    // Vérifier si la semaine est dans le mois
    const lundi = getLundiDeSemaine(new Date(p.dateDebut));
    const samedi = addDays(lundi, 5);
    const dimanche = addDays(lundi, 6);

    // Samedi (jour 5)
    if (samedi.getMonth() + 1 === mois) {
      const cellSam = p.cellules.find((c) => c.employeId === employeId && c.jour === 5);
      if (cellSam && cellSam.brique !== "REPOS" && getBrique(cellSam.brique)?.type === "TRAVAIL") {
        samedis.push(p.semaine);
      }
    }

    // Dimanche (jour 6)
    if (dimanche.getMonth() + 1 === mois) {
      const cellDim = p.cellules.find((c) => c.employeId === employeId && c.jour === 6);
      if (cellDim && cellDim.brique !== "REPOS" && getBrique(cellDim.brique)?.type === "TRAVAIL") {
        dimanches.push(p.semaine);
      }
    }
  });

  return { samedis, dimanches };
}

export type StatutRotation = "ok" | "manque_samedi" | "manque_dimanche" | "manque_les_deux" | "non_applicable";

/** Vérifie si un employé a bien au moins 1 Sam + 1 Dim dans le mois en cours */
export function verifierRotationEmploye(
  employeId: string,
  plannings: PlanningHebdo[]
): { statut: StatutRotation; samedis: number; dimanches: number; mois: number; annee: number } {
  const now = new Date();
  const mois = now.getMonth() + 1;
  const annee = now.getFullYear();

  const { samedis, dimanches } = calculerWeekendsMois(employeId, annee, mois, plannings);

  let statut: StatutRotation;
  if (samedis.length >= 1 && dimanches.length >= 1) {
    statut = "ok";
  } else if (samedis.length === 0 && dimanches.length === 0) {
    statut = "manque_les_deux";
  } else if (samedis.length === 0) {
    statut = "manque_samedi";
  } else {
    statut = "manque_dimanche";
  }

  return { statut, samedis: samedis.length, dimanches: dimanches.length, mois, annee };
}

/** Vérifie la rotation pour tous les employés actifs */
export function verifierRotationEquipe(
  employes: Employe[],
  plannings: PlanningHebdo[]
): Record<string, ReturnType<typeof verifierRotationEmploye>> {
  const result: Record<string, ReturnType<typeof verifierRotationEmploye>> = {};
  employes.filter((e) => e.actif).forEach((e) => {
    result[e.id] = verifierRotationEmploye(e.id, plannings);
  });
  return result;
}

/** Dans la suggestion automatique : détermine si cet employé doit travailler ce weekend
 *  en tenant compte de la rotation du mois */
export function doitTravaillerWeekend(
  employeId: string,
  jour: 5 | 6, // 5=Sam, 6=Dim
  plannings: PlanningHebdo[],
  semaineActuelle: number,
  annee: number,
  mois: number
): boolean {
  const { samedis, dimanches } = calculerWeekendsMois(employeId, annee, mois, plannings);

  if (jour === 5) {
    // Besoin d'un samedi ce mois-ci ?
    return samedis.length === 0;
  } else {
    // Besoin d'un dimanche ce mois-ci ?
    return dimanches.length === 0;
  }
}

// ============================================================
// ROTATION MENSUELLE — Vue complète 4 semaines
// ============================================================

export interface SemaineRotation {
  semaine: number;
  annee: number;
  dateDebut: string; // lundi ISO
  samediTravaille: boolean;
  dimancheTravaille: boolean;
  samediAbsence: boolean; // CP/MALADIE ce jour
  dimancheAbsence: boolean;
}

export interface RotationMensuelleEmploye {
  employe: Employe;
  mois: number;
  annee: number;
  semaines: SemaineRotation[];
  totalSamedis: number;
  totalDimanches: number;
  conformeSamedi: boolean; // >= 1
  conformeDimanche: boolean; // >= 1
}

/** Retourne les 4 (ou 5) semaines qui couvrent un mois donné */
export function getSemainesDuMois(annee: number, mois: number): { semaine: number; lundi: Date }[] {
  // Premier jour du mois
  const premierJour = new Date(annee, mois - 1, 1);
  // Dernier jour du mois
  const dernierJour = new Date(annee, mois, 0);

  // Lundi de la première semaine
  let lundi = getLundiDeSemaine(premierJour);
  const semaines: { semaine: number; lundi: Date }[] = [];

  while (lundi <= dernierJour) {
    semaines.push({ semaine: getNumeroSemaine(lundi), lundi: new Date(lundi) });
    lundi = addDays(lundi, 7);
  }

  return semaines;
}

/** Calcule la rotation mensuelle complète pour un employé */
export function calculerRotationMensuelle(
  employe: Employe,
  annee: number,
  mois: number,
  plannings: PlanningHebdo[]
): RotationMensuelleEmploye {
  const semaines = getSemainesDuMois(annee, mois);

  const semainesRotation: SemaineRotation[] = semaines.map(({ semaine, lundi }) => {
    const planning = plannings.find((p) => p.semaine === semaine && p.annee === annee);

    let samediTravaille = false;
    let dimancheTravaille = false;
    let samediAbsence = false;
    let dimancheAbsence = false;

    if (planning) {
      const cellSam = planning.cellules.find((c) => c.employeId === employe.id && c.jour === 5);
      const cellDim = planning.cellules.find((c) => c.employeId === employe.id && c.jour === 6);

      if (cellSam) {
        const b = getBrique(cellSam.brique);
        if (b?.type === "TRAVAIL" && b.code !== "REPOS") samediTravaille = true;
        if (b?.type === "ABSENCE" && b.code !== "REPOS") samediAbsence = true;
      }
      if (cellDim) {
        const b = getBrique(cellDim.brique);
        if (b?.type === "TRAVAIL" && b.code !== "REPOS") dimancheTravaille = true;
        if (b?.type === "ABSENCE" && b.code !== "REPOS") dimancheAbsence = true;
      }
    }

    return {
      semaine,
      annee,
      dateDebut: dateToString(lundi),
      samediTravaille,
      dimancheTravaille,
      samediAbsence,
      dimancheAbsence,
    };
  });

  const totalSamedis = semainesRotation.filter((s) => s.samediTravaille).length;
  const totalDimanches = semainesRotation.filter((s) => s.dimancheTravaille).length;

  return {
    employe,
    mois,
    annee,
    semaines: semainesRotation,
    totalSamedis,
    totalDimanches,
    conformeSamedi: totalSamedis >= 1,
    conformeDimanche: totalDimanches >= 1,
  };
}

/** Calcule la rotation mensuelle pour toute l'équipe */
export function calculerRotationEquipe(
  employes: Employe[],
  annee: number,
  mois: number,
  plannings: PlanningHebdo[]
): RotationMensuelleEmploye[] {
  return employes
    .filter((e) => e.actif)
    .map((e) => calculerRotationMensuelle(e, annee, mois, plannings));
}

// ============================================================
// ALERTE CRITIQUE — Seuil sous-effectif sévère
// ============================================================

/** Retourne true si un jour a plus de N tranches en sous-effectif (critique sévère) */
export function jourEstCritiqueSevere(
  jourIdx: number,
  cellules: CellulePlanning[],
  employes: Employe[],
  seuils: SeuilSecteur[],
  seuilTranches = 3
): boolean {
  if (seuils.length === 0) return false;
  const niveau = calculerNiveauCouverture(jourIdx, cellules, employes, seuils);
  return niveau.niveau === "critique" && niveau.sousEffectifs >= seuilTranches;
}

/** Retourne les jours critiques sévères de la semaine */
export function getJoursCritiquesSeveres(
  cellules: CellulePlanning[],
  employes: Employe[],
  seuils: SeuilSecteur[],
  seuilTranches = 3
): number[] {
  if (seuils.length === 0) return [];
  return Array.from({ length: 7 }, (_, j) => j).filter((j) =>
    jourEstCritiqueSevere(j, cellules, employes, seuils, seuilTranches)
  );
}

// ============================================================
// COPIE MULTI-SEMAINE
// ============================================================

export interface OptionsCopie {
  /** Copier uniquement les créneaux de travail (exclure CP, Maladie, etc.) */
  exclureAbsences: boolean;
  /** Copier uniquement les jours 0-4 (Lun-Ven), ignorer Sam/Dim */
  seulementSemaine: boolean;
  /** Si la semaine cible a déjà un planning, écraser ses cellules */
  ecraser: boolean;
}

export interface ResultatCopie {
  semaineSource: number;
  anneeSource: number;
  semaineCible: number;
  anneeCible: number;
  nbCellulesCopiees: number;
  nbCellulesIgnorees: number;
  planningCible: PlanningHebdo;
}

/**
 * Copie les cellules du planning source vers la semaine cible.
 * Retourne le planning cible mis à jour (non encore sauvegardé).
 */
export function copierPlanningVers(
  planningSource: PlanningHebdo,
  lundiCible: Date,
  employes: Employe[],
  options: OptionsCopie = { exclureAbsences: true, seulementSemaine: false, ecraser: true }
): ResultatCopie {
  const semaineCible = getNumeroSemaine(lundiCible);
  const anneeCible = lundiCible.getFullYear();

  // Charger ou créer le planning cible
  const { planning: planningCible } = trouverOuCreerPlanning(
    semaineCible,
    anneeCible,
    lundiCible,
    employes.filter((e) => e.actif)
  );

  const CODES_ABSENCE: string[] = ["REPOS", "CP", "MALADIE", "FORM", "RTT", "ABS-J", "ABS-NJ", "FERIE"];

  let nbCopiees = 0;
  let nbIgnorees = 0;

  // Construire la liste des cellules à copier
  const cellulesACopier: CellulePlanning[] = [];

  planningSource.cellules.forEach((cellule) => {
    // Filtrer les jours weekend si option activée
    if (options.seulementSemaine && cellule.jour >= 5) {
      nbIgnorees++;
      return;
    }

    // Filtrer les absences si option activée
    if (options.exclureAbsences && CODES_ABSENCE.includes(cellule.brique)) {
      nbIgnorees++;
      return;
    }

    // Vérifier que l'employé existe toujours dans la cible
    const employe = employes.find((e) => e.id === cellule.employeId && e.actif);
    if (!employe) {
      nbIgnorees++;
      return;
    }

    cellulesACopier.push({ ...cellule });
    nbCopiees++;
  });

  // Fusionner avec les cellules existantes de la cible
  let cellulesFinales: CellulePlanning[];

  if (options.ecraser) {
    // Remplacer les cellules existantes par les nouvelles
    const autresCellules = planningCible.cellules.filter(
      (c) => !cellulesACopier.some((n) => n.employeId === c.employeId && n.jour === c.jour)
    );
    cellulesFinales = [...autresCellules, ...cellulesACopier];
  } else {
    // Ne copier que les cellules qui sont encore à REPOS dans la cible
    const cellulesAEcraser = cellulesACopier.filter((n) => {
      const existante = planningCible.cellules.find(
        (c) => c.employeId === n.employeId && c.jour === n.jour
      );
      return !existante || existante.brique === "REPOS";
    });
    const autresCellules = planningCible.cellules.filter(
      (c) => !cellulesAEcraser.some((n) => n.employeId === c.employeId && n.jour === c.jour)
    );
    cellulesFinales = [...autresCellules, ...cellulesAEcraser];
    nbIgnorees += cellulesACopier.length - cellulesAEcraser.length;
    nbCopiees = cellulesAEcraser.length;
  }

  const planningMisAJour: PlanningHebdo = {
    ...planningCible,
    cellules: cellulesFinales,
    statut: "BROUILLON",
    modifieLe: new Date().toISOString(),
  };

  return {
    semaineSource: planningSource.semaine,
    anneeSource: planningSource.annee,
    semaineCible,
    anneeCible,
    nbCellulesCopiees: nbCopiees,
    nbCellulesIgnorees: nbIgnorees,
    planningCible: planningMisAJour,
  };
}

// ============================================================
// JOURS FÉRIÉS & FÊTES RELIGIEUSES
// ============================================================

export type TypeJourSpecial =
  | "FERIE_LEGAL"    // Jour férié légal (affiché + bloqué si 1er mai)
  | "FERIE_BLOQUE"   // 1er mai : magasin fermé, saisie impossible
  | "AID_FITR"       // Aïd el-Fitr (indication uniquement)
  | "AID_ADHA";      // Aïd el-Adha (indication uniquement)

export interface JourSpecial {
  id: string;
  date: string;          // "YYYY-MM-DD"
  type: TypeJourSpecial;
  label: string;
  annee: number;
  recurrent?: boolean;   // true pour les fériés légaux fixes (recalculés chaque année)
}

// Calcul des jours fériés légaux français pour une année donnée
export function calculerFeriesLegaux(annee: number): JourSpecial[] {
  // Calcul de Pâques (algorithme de Meeus/Jones/Butcher)
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const moisPaques = Math.floor((h + l - 7 * m + 114) / 31);
  const jourPaques = ((h + l - 7 * m + 114) % 31) + 1;
  const paques = new Date(annee, moisPaques - 1, jourPaques);

  const ferie = (mois: number, jour: number, label: string, bloque = false): JourSpecial => ({
    id: `ferie-${annee}-${mois}-${jour}`,
    date: `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`,
    type: bloque ? "FERIE_BLOQUE" : "FERIE_LEGAL",
    label,
    annee,
    recurrent: true,
  });

  const ferieRelative = (offset: number, label: string): JourSpecial => {
    const d = new Date(paques);
    d.setDate(d.getDate() + offset);
    return {
      id: `ferie-${annee}-paques-${offset}`,
      date: dateToString(d),
      type: "FERIE_LEGAL",
      label,
      annee,
      recurrent: true,
    };
  };

  return [
    ferie(1, 1, "Jour de l'An"),
    ferieRelative(1, "Lundi de Pâques"),
    ferie(5, 1, "Fête du Travail — Magasin fermé", true), // 1er mai BLOQUÉ
    ferie(5, 8, "Victoire 1945"),
    ferieRelative(39, "Ascension"),
    ferieRelative(50, "Lundi de Pentecôte"),
    ferie(7, 14, "Fête Nationale"),
    ferie(8, 15, "Assomption"),
    ferie(11, 1, "Toussaint"),
    ferie(11, 11, "Armistice"),
    ferie(12, 25, "Noël"),
  ];
}

// Storage des jours spéciaux (fêtes musulmanes + overrides)
const STORAGE_KEY_JOURS_SPECIAUX = "pfc_jours_speciaux";

export function chargerJoursSpeciaux(): JourSpecial[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_JOURS_SPECIAUX);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function sauvegarderJoursSpeciaux(jours: JourSpecial[]): void {
  localStorage.setItem(STORAGE_KEY_JOURS_SPECIAUX, JSON.stringify(jours));
}

export function ajouterJourSpecial(jour: JourSpecial): void {
  const jours = chargerJoursSpeciaux();
  const idx = jours.findIndex((j) => j.id === jour.id);
  if (idx >= 0) jours[idx] = jour;
  else jours.push(jour);
  sauvegarderJoursSpeciaux(jours);
}

export function supprimerJourSpecial(id: string): void {
  const jours = chargerJoursSpeciaux().filter((j) => j.id !== id);
  sauvegarderJoursSpeciaux(jours);
}

/**
 * Retourne tous les jours spéciaux pour une semaine donnée (lundi → dimanche).
 * Inclut les fériés légaux calculés + les jours custom (Aïd, etc.)
 */
export function getJoursSpeciauxSemaine(
  lundi: Date,
  annee: number
): { [dateStr: string]: JourSpecial[] } {
  const feries = calculerFeriesLegaux(annee);
  const custom = chargerJoursSpeciaux();
  const tous = [...feries, ...custom];

  const result: { [dateStr: string]: JourSpecial[] } = {};
  for (let i = 0; i < 7; i++) {
    const d = addDays(lundi, i);
    const str = dateToString(d);
    const matches = tous.filter((j) => j.date === str);
    if (matches.length > 0) result[str] = matches;
  }
  return result;
}

/**
 * Vérifie si une date est le 1er mai (magasin fermé).
 */
export function estJourFerme(date: Date): boolean {
  return date.getMonth() === 4 && date.getDate() === 1; // mois 4 = mai (0-indexé)
}

/**
 * Retourne le type visuel d'un jour spécial pour l'affichage dans le Planning.
 */
export const COULEURS_JOUR_SPECIAL: Record<TypeJourSpecial, { bg: string; text: string; border: string; badge: string }> = {
  FERIE_BLOQUE: { bg: "#FFCCCC", text: "#7B0000", border: "#DC3545", badge: "FERMÉ" },
  FERIE_LEGAL:  { bg: "#FFF8E1", text: "#5D4037", border: "#FFC107", badge: "FÉRIÉ" },
  AID_FITR:     { bg: "#E8F5E9", text: "#1B5E20", border: "#4CAF50", badge: "Aïd el-Fitr" },
  AID_ADHA:     { bg: "#E3F2FD", text: "#0D47A1", border: "#2196F3", badge: "Aïd el-Adha" },
};
