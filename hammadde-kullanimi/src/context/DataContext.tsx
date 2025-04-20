import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { HAVIEntryForAnalysis } from "../havi-processor";
import { RecipeItem } from "../recipe-service";
import { v4 as uuidv4 } from "uuid"; // Install uuid: npm install uuid @types/uuid

// Define the structure for a single analysis project
export interface AnalysisProject {
  id: string;
  name: string;
  createdAt: string;
  haviData: HAVIEntryForAnalysis[];
  aktifPosData: any[]; // Replace with your actual type if available
  recipeData: RecipeItem[];
  completedSteps: boolean[]; // Track step completion per project
}

// Define the context type
interface DataContextType {
  projects: AnalysisProject[];
  currentProjectId: string | null;
  currentProject: AnalysisProject | null;
  targetStep: number | null; // Add state for target step
  selectProject: (projectId: string | null, targetStep?: number) => void; // Update signature
  clearTargetStep: () => void; // Add function to clear target step
  createProject: (name?: string) => string;
  deleteProject: (projectId: string) => void;
  updateProjectData: (
    projectId: string,
    dataType: "havi" | "aktifpos" | "recipe",
    data: any[]
  ) => void;
  updateProjectStepCompletion: (
    projectId: string,
    stepIndex: number,
    isCompleted: boolean
  ) => void;

  // Keep setters for convenience within components, but they operate on the current project
  setHaviData: (data: HAVIEntryForAnalysis[]) => void;
  setAktifPosData: (data: any[]) => void;
  setRecipeData: (data: RecipeItem[]) => void;
}

// Function to generate the localStorage key for a project
const getProjectStorageKey = (projectId: string): string =>
  `analysisProject_${projectId}`;

// Helper to format date to DD.MM.YYYY HH:MM
const formatDateTimeEuropean = (date: Date): string => {
  try {
    const datePart = date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timePart = date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} ${timePart}`;
  } catch (e) {
    return "Geçersiz Zaman";
  }
};

// Create context with default values
const DataContext = createContext<DataContextType>({
  projects: [],
  currentProjectId: null,
  currentProject: null,
  targetStep: null, // Default target step
  selectProject: () => {},
  clearTargetStep: () => {}, // Default clear function
  createProject: () => "",
  deleteProject: () => {},
  updateProjectData: () => {},
  updateProjectStepCompletion: () => {},
  setHaviData: () => {},
  setAktifPosData: () => {},
  setRecipeData: () => {},
});

// Create a provider component
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<AnalysisProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [targetStep, setTargetStep] = useState<number | null>(null); // State for target step
  const [isInitialized, setIsInitialized] = useState(false);

  // Load projects from localStorage on initial mount
  useEffect(() => {
    const loadedProjects: AnalysisProject[] = [];
    try {
      // Iterate through all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("analysisProject_")) {
          const storedProject = localStorage.getItem(key);
          if (storedProject) {
            try {
              const parsedProject = JSON.parse(storedProject);
              // Basic validation: check for id and name
              if (parsedProject && parsedProject.id && parsedProject.name) {
                loadedProjects.push(parsedProject as AnalysisProject);
              } else {
                console.warn(`Invalid project data found for key: ${key}`);
                // Optionally remove invalid item: localStorage.removeItem(key);
              }
            } catch (parseError) {
              console.error(
                `Error parsing project data for key ${key}:`,
                parseError
              );
              // Optionally remove corrupted item: localStorage.removeItem(key);
            }
          }
        }
      }
      // Sort projects by creation date (newest first)
      loadedProjects.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setProjects(loadedProjects);
    } catch (error) {
      console.error("Error loading projects from localStorage:", error);
      setProjects([]);
    } finally {
      setIsInitialized(true);
    }

    // Clean up old top-level keys if they exist (optional, run once)
    localStorage.removeItem("analysisProjects"); // Remove the old array key
    localStorage.removeItem("haviData");
    localStorage.removeItem("aktifPosData");
    localStorage.removeItem("recipeData");
    localStorage.removeItem("uploadedRecipes");
    localStorage.removeItem("currentUploadedFile");
    localStorage.removeItem("fileUploadHistory");
  }, []);

  // Helper function to save a single project to localStorage
  const saveProject = (project: AnalysisProject) => {
    if (!project || !project.id) return;
    try {
      const key = getProjectStorageKey(project.id);
      localStorage.setItem(key, JSON.stringify(project));
    } catch (error) {
      console.error(
        `Error saving project ${project.id} to localStorage:`,
        error
      );
    }
  };

  // Function to select a project and optionally set a target step
  const selectProject = useCallback(
    (projectId: string | null, step: number | undefined = undefined) => {
      setCurrentProjectId(projectId);
      setTargetStep(step !== undefined ? step : null); // Set target step or null
    },
    []
  );

  // Function to clear the target step (called by wizard component after navigation)
  const clearTargetStep = useCallback(() => {
    setTargetStep(null);
  }, []);

  // Function to create a new project
  const createProject = useCallback((name?: string): string => {
    const newProjectId = uuidv4();
    const now = new Date();
    const newProject: AnalysisProject = {
      id: newProjectId,
      name: name || `Analiz ${formatDateTimeEuropean(now)}`, // Use European date/time format
      createdAt: now.toISOString(),
      haviData: [],
      aktifPosData: [],
      recipeData: [],
      completedSteps: [false, false, false, false],
    };
    setProjects((prev) => [newProject, ...prev]); // Add to beginning for newest first
    saveProject(newProject); // Save the new project immediately
    return newProjectId;
  }, []);

  // Function to delete a project
  const deleteProject = useCallback(
    (projectId: string) => {
      const key = getProjectStorageKey(projectId);
      localStorage.removeItem(key); // Remove from storage
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }
    },
    [currentProjectId]
  );

  // Generic function to update data within a specific project
  const updateProjectData = useCallback(
    (
      projectId: string,
      dataType: "havi" | "aktifpos" | "recipe",
      data: any[]
    ) => {
      let updatedProject: AnalysisProject | null = null;
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id === projectId) {
            const changes = { ...project };
            switch (dataType) {
              case "havi":
                changes.haviData = data as HAVIEntryForAnalysis[];
                break;
              case "aktifpos":
                changes.aktifPosData = data;
                break;
              case "recipe":
                changes.recipeData = data as RecipeItem[];
                break;
            }
            updatedProject = changes; // Store the updated project
            return changes;
          }
          return project;
        })
      );
      if (updatedProject) {
        saveProject(updatedProject); // Save the updated project
      }
    },
    [] // Removed 'projects' dependency if updates don't depend on reading the whole array
  );

  // Function to update step completion status for a project
  const updateProjectStepCompletion = useCallback(
    (projectId: string, stepIndex: number, isCompleted: boolean) => {
      let updatedProject: AnalysisProject | null = null;
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id === projectId) {
            const newCompletedSteps = [...project.completedSteps];
            if (stepIndex >= 0 && stepIndex < newCompletedSteps.length) {
              newCompletedSteps[stepIndex] = isCompleted;
            }
            updatedProject = { ...project, completedSteps: newCompletedSteps };
            return updatedProject;
          }
          return project;
        })
      );
      if (updatedProject) {
        saveProject(updatedProject); // Save the updated project
      }
    },
    [] // Removed 'projects' dependency
  );

  // Convenience setters that operate on the current project
  const setHaviData = useCallback(
    (data: HAVIEntryForAnalysis[]) => {
      if (currentProjectId) {
        updateProjectData(currentProjectId, "havi", data);
        updateProjectStepCompletion(currentProjectId, 1, data.length > 0); // Mark step 1 complete if data exists
      }
    },
    [currentProjectId, updateProjectData, updateProjectStepCompletion]
  );

  const setAktifPosData = useCallback(
    (data: any[]) => {
      if (currentProjectId) {
        updateProjectData(currentProjectId, "aktifpos", data);
        updateProjectStepCompletion(currentProjectId, 2, data.length > 0); // Mark step 2 complete if data exists
      }
    },
    [currentProjectId, updateProjectData, updateProjectStepCompletion]
  );

  const setRecipeData = useCallback(
    (data: RecipeItem[]) => {
      if (currentProjectId) {
        updateProjectData(currentProjectId, "recipe", data);
        updateProjectStepCompletion(currentProjectId, 0, data.length > 0); // Mark step 0 complete if data exists
      }
    },
    [currentProjectId, updateProjectData, updateProjectStepCompletion]
  );

  // Find the current project object based on the ID
  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId) || null,
    [projects, currentProjectId]
  );

  // Create the context value
  const contextValue: DataContextType = {
    projects,
    currentProjectId,
    currentProject,
    targetStep, // Expose targetStep
    selectProject,
    clearTargetStep, // Expose clearTargetStep
    createProject,
    deleteProject,
    updateProjectData,
    updateProjectStepCompletion,
    // Pass convenience setters
    setHaviData,
    setAktifPosData,
    setRecipeData,
  };

  // Render loading state or children based on initialization
  return (
    <DataContext.Provider value={contextValue}>
      {!isInitialized ? null : children}{" "}
      {/* Render null or a loader until initialized */}
    </DataContext.Provider>
  );
};

// Custom hook to use the data context
export const useData = () => useContext(DataContext);

// Helper function to get current project data safely
export const useCurrentProjectData = () => {
  const { currentProject } = useData();
  return {
    project: currentProject,
    haviData: currentProject?.haviData || [],
    aktifPosData: currentProject?.aktifPosData || [],
    recipeData: currentProject?.recipeData || [],
    completedSteps: currentProject?.completedSteps || [
      false,
      false,
      false,
      false,
    ],
  };
};
