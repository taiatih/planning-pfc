import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  Employe, PlanningHebdo, CellulePlanning, Poste,
  chargerEmployes, sauvegarderEmployes,
  chargerPlannings, sauvegarderPlanning,
  trouverOuCreerPlanning, sauvegarderPlannings,
  getLundiDeSemaine, getNumeroSemaine, dateToString, addDays,
  calculerStats, StatsDashboard,
} from "@/lib/data";

interface PlanningContextType {
  // Données
  employes: Employe[];
  plannings: PlanningHebdo[];
  planningActuel: PlanningHebdo | null;
  semaineCourante: Date; // lundi de la semaine
  stats: StatsDashboard;

  // Navigation
  allerSemaine: (lundi: Date) => void;
  semaineSuivante: () => void;
  semainePrecedente: () => void;

  // Édition planning
  setCellule: (employeId: string, jour: number, brique: string, poste?: Poste) => void;
  setCellulesMultiples: (cellules: CellulePlanning[]) => void;
  sauvegarder: () => void;
  publier: () => void;
  creerAvenant: () => void;

  // Gestion employés
  ajouterEmploye: (emp: Employe) => void;
  modifierEmploye: (emp: Employe) => void;
  desactiverEmploye: (id: string) => void;

  // UI
  employeSelectionne: string | null;
  setEmployeSelectionne: (id: string | null) => void;
  celluleSelectionnee: { employeId: string; jour: number } | null;
  setCelluleSelectionnee: (c: { employeId: string; jour: number } | null) => void;
  isSaving: boolean;
}

const PlanningContext = createContext<PlanningContextType | null>(null);

export function PlanningProvider({ children }: { children: React.ReactNode }) {
  const [employes, setEmployes] = useState<Employe[]>(() => chargerEmployes());
  const [plannings, setPlannings] = useState<PlanningHebdo[]>(() => chargerPlannings());
  const [semaineCourante, setSemaineCourante] = useState<Date>(() => getLundiDeSemaine(new Date()));
  const [planningActuel, setPlanningActuel] = useState<PlanningHebdo | null>(null);
  const [employeSelectionne, setEmployeSelectionne] = useState<string | null>(null);
  const [celluleSelectionnee, setCelluleSelectionnee] = useState<{ employeId: string; jour: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Charger ou créer le planning de la semaine courante
  useEffect(() => {
    const semaine = getNumeroSemaine(semaineCourante);
    const annee = semaineCourante.getFullYear();
    const { planning } = trouverOuCreerPlanning(semaine, annee, semaineCourante, employes.filter((e) => e.actif));
    setPlanningActuel(planning);
  }, [semaineCourante, employes]);

  const stats = calculerStats(planningActuel, employes);

  const allerSemaine = useCallback((lundi: Date) => {
    setSemaineCourante(lundi);
    setCelluleSelectionnee(null);
  }, []);

  const semaineSuivante = useCallback(() => {
    setSemaineCourante((prev) => addDays(prev, 7));
  }, []);

  const semainePrecedente = useCallback(() => {
    setSemaineCourante((prev) => addDays(prev, -7));
  }, []);

  const setCellule = useCallback((employeId: string, jour: number, brique: string, poste?: Poste) => {
    setPlanningActuel((prev) => {
      if (!prev) return prev;
      const cellules = prev.cellules.map((c) =>
        c.employeId === employeId && c.jour === jour
          ? { ...c, brique, poste }
          : c
      );
      const exists = prev.cellules.some((c) => c.employeId === employeId && c.jour === jour);
      return {
        ...prev,
        cellules: exists ? cellules : [...prev.cellules, { employeId, jour, brique, poste }],
        modifieLe: new Date().toISOString(),
      };
    });
  }, []);

  // Remplace en masse plusieurs cellules (pour la suggestion automatique)
  const setCellulesMultiples = useCallback((nouvelles: CellulePlanning[]) => {
    setPlanningActuel((prev) => {
      if (!prev) return prev;
      // Partir des cellules existantes, écraser celles qui sont dans 'nouvelles'
      const autresCellules = prev.cellules.filter(
        (c) => !nouvelles.some((n) => n.employeId === c.employeId && n.jour === c.jour)
      );
      return {
        ...prev,
        cellules: [...autresCellules, ...nouvelles],
        modifieLe: new Date().toISOString(),
      };
    });
  }, []);

  const sauvegarder = useCallback(() => {
    if (!planningActuel) return;
    setIsSaving(true);
    setTimeout(() => {
      sauvegarderPlanning(planningActuel);
      setPlannings(chargerPlannings());
      setIsSaving(false);
    }, 300);
  }, [planningActuel]);

  const publier = useCallback(() => {
    if (!planningActuel) return;
    const updated = { ...planningActuel, statut: "PUBLIE" as const, modifieLe: new Date().toISOString() };
    setPlanningActuel(updated);
    sauvegarderPlanning(updated);
    setPlannings(chargerPlannings());
  }, [planningActuel]);

  const creerAvenant = useCallback(() => {
    if (!planningActuel) return;
    const updated = { ...planningActuel, statut: "AVENANT" as const, modifieLe: new Date().toISOString() };
    setPlanningActuel(updated);
    sauvegarderPlanning(updated);
    setPlannings(chargerPlannings());
  }, [planningActuel]);

  const ajouterEmploye = useCallback((emp: Employe) => {
    setEmployes((prev) => {
      const updated = [...prev, emp];
      sauvegarderEmployes(updated);
      return updated;
    });
  }, []);

  const modifierEmploye = useCallback((emp: Employe) => {
    setEmployes((prev) => {
      const updated = prev.map((e) => (e.id === emp.id ? emp : e));
      sauvegarderEmployes(updated);
      return updated;
    });
  }, []);

  const desactiverEmploye = useCallback((id: string) => {
    setEmployes((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, actif: false } : e));
      sauvegarderEmployes(updated);
      return updated;
    });
  }, []);

  return (
    <PlanningContext.Provider
      value={{
        employes,
        plannings,
        planningActuel,
        semaineCourante,
        stats,
        allerSemaine,
        semaineSuivante,
        semainePrecedente,
        setCellule,
        setCellulesMultiples,
        sauvegarder,
        publier,
        creerAvenant,
        ajouterEmploye,
        modifierEmploye,
        desactiverEmploye,
        employeSelectionne,
        setEmployeSelectionne,
        celluleSelectionnee,
        setCelluleSelectionnee,
        isSaving,
      }}
    >
      {children}
    </PlanningContext.Provider>
  );
}

export function usePlanning() {
  const ctx = useContext(PlanningContext);
  if (!ctx) throw new Error("usePlanning must be used within PlanningProvider");
  return ctx;
}
