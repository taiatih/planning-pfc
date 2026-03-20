import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import {
  Employe, PlanningHebdo, CellulePlanning, Poste,
  chargerEmployes, sauvegarderEmployes,
  chargerPlannings, sauvegarderPlanning,
  trouverOuCreerPlanning, sauvegarderPlannings,
  getLundiDeSemaine, getNumeroSemaine, dateToString, addDays,
  calculerStats, StatsDashboard,
  copierPlanningVers, OptionsCopie, ResultatCopie,
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
  setCelluleNote: (employeId: string, jour: number, note: string) => void;
  sauvegarder: () => void;
  publier: () => void;
  creerAvenant: () => void;

  // Copie multi-semaine
  copierVers: (lundiCible: Date, options?: OptionsCopie) => ResultatCopie | null;

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
  isDirty: boolean;
  lastSaved: Date | null;
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-save : déclenche une sauvegarde 2s après la dernière modification
  const triggerAutoSave = useCallback((planning: PlanningHebdo) => {
    setIsDirty(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setIsSaving(true);
      sauvegarderPlanning(planning);
      setPlannings(chargerPlannings());
      setLastSaved(new Date());
      setIsDirty(false);
      setIsSaving(false);
    }, 2000);
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
      const updated = {
        ...prev,
        cellules: exists ? cellules : [...prev.cellules, { employeId, jour, brique, poste }],
        modifieLe: new Date().toISOString(),
      };
      triggerAutoSave(updated);
      return updated;
    });
  }, [triggerAutoSave]);

  // Remplace en masse plusieurs cellules (pour la suggestion automatique)
  const setCellulesMultiples = useCallback((nouvelles: CellulePlanning[]) => {
    setPlanningActuel((prev) => {
      if (!prev) return prev;
      const autresCellules = prev.cellules.filter(
        (c) => !nouvelles.some((n) => n.employeId === c.employeId && n.jour === c.jour)
      );
      const updated = {
        ...prev,
        cellules: [...autresCellules, ...nouvelles],
        modifieLe: new Date().toISOString(),
      };
      triggerAutoSave(updated);
      return updated;
    });
  }, [triggerAutoSave]);

  const setCelluleNote = useCallback((employeId: string, jour: number, note: string) => {
    setPlanningActuel((prev) => {
      if (!prev) return prev;
      const cellules = prev.cellules.map((c) =>
        c.employeId === employeId && c.jour === jour
          ? { ...c, note: note.trim() || undefined }
          : c
      );
      const exists = prev.cellules.some((c) => c.employeId === employeId && c.jour === jour);
      const updated = {
        ...prev,
        cellules: exists ? cellules : prev.cellules,
        modifieLe: new Date().toISOString(),
      };
      triggerAutoSave(updated);
      return updated;
    });
  }, [triggerAutoSave]);

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

  const copierVers = useCallback((lundiCible: Date, options?: OptionsCopie): ResultatCopie | null => {
    if (!planningActuel) return null;
    const resultat = copierPlanningVers(
      planningActuel,
      lundiCible,
      employes,
      options ?? { exclureAbsences: true, seulementSemaine: false, ecraser: true }
    );
    // Sauvegarder immédiatement le planning cible
    sauvegarderPlanning(resultat.planningCible);
    setPlannings(chargerPlannings());
    return resultat;
  }, [planningActuel, employes]);

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
        setCelluleNote,
        copierVers,
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
        isDirty,
        lastSaved,
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
