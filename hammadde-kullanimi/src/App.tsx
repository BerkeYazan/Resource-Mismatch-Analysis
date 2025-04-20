import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Stepper,
  Step,
  StepIndicator,
  StepNumber,
  StepTitle,
  StepSeparator,
  useSteps,
  Image,
  Button,
  Flex,
  Spacer,
} from "@chakra-ui/react";
import RecipeViewer from "./components/RecipeViewer";
import HAVIDataViewer from "./components/HAVIDataViewer";
import AktifPOSDataViewer from "./components/AktifPOSDataViewer";
import Analysis from "./components/Analysis";
import "./App.css";
import { ChakraProvider } from "@chakra-ui/react";
import theme from "./theme";
import { useEffect } from "react";
import { DataProvider, useData } from "./context/DataContext";
import ProjectSelectionPage from "./components/ProjectSelectionPage";
import { FaCheck } from "react-icons/fa";
// Import the logo - adjust path as needed
import chocolabsLogo from "./assets/chocolabs.png";

// Define the steps for our wizard with simplified titles
const steps = [
  { title: "Ürün Reçeteleri" },
  { title: "HAVI" },
  { title: "AktifPOS" },
  { title: "Analiz" },
];

// Main App component structure
function AppContent() {
  const {
    currentProjectId,
    currentProject,
    selectProject,
    updateProjectStepCompletion,
    targetStep,
    clearTargetStep,
  } = useData();

  // Manage active step state locally within the wizard context
  const { activeStep, setActiveStep } = useSteps({
    index: 0, // Start at step 0 by default
    count: steps.length,
  });

  // Effect 1: Handle ONLY direct navigation via targetStep
  useEffect(() => {
    // Check if a specific step navigation is requested
    if (targetStep !== null && targetStep >= 0 && targetStep < steps.length) {
      console.log(`Effect 1: Navigation requested to step: ${targetStep}`);
      // Set the active step based on the target
      setActiveStep(targetStep);
      // Clear the target step immediately after using it so this effect doesn't loop infinitely
      // and so subsequent project selections start fresh unless specified otherwise.
      clearTargetStep();
    }
    // This effect ONLY depends on targetStep changes (and related functions/constants)
  }, [targetStep, setActiveStep, clearTargetStep, steps.length]);

  // Effect 2: Handle ONLY project deselection
  useEffect(() => {
    if (!currentProjectId) {
      // If no project is selected (user navigated back or deleted), reset step to 0
      console.log("Effect 2: Project deselected. Setting step to 0.");
      setActiveStep(0);
    }
    // This effect ONLY depends on the currentProjectId changing
  }, [currentProjectId, setActiveStep]);

  // Handle step completion - now updates the specific project
  const completeStep = (stepIndex: number) => {
    if (currentProjectId) {
      updateProjectStepCompletion(currentProjectId, stepIndex, true);
    }
  };

  // Handle step click - revert to allowing backward navigation freely
  const handleStepClick = (index: number) => {
    if (!currentProject) return;

    // Allow clicking the first step always.
    // Allow clicking any step index less than or equal to the current active step (going back).
    // Allow clicking the next step only if the previous step is marked as completed.
    const canClick =
      index === 0 ||
      index <= activeStep ||
      currentProject.completedSteps[index - 1];

    if (canClick) {
      setActiveStep(index);
    }
  };

  // Render the current step content
  const renderStepContent = () => {
    if (!currentProject) return null; // Should not happen if rendered

    const isStepCompleted = (index: number) =>
      currentProject.completedSteps[index] ?? false;

    switch (activeStep) {
      case 0:
        return (
          <RecipeViewer
            onComplete={() => completeStep(0)}
            isStepCompleted={isStepCompleted(0)}
          />
        );
      case 1:
        return (
          <HAVIDataViewer
            onComplete={() => completeStep(1)}
            isStepCompleted={isStepCompleted(1)}
          />
        );
      case 2:
        return (
          <AktifPOSDataViewer
            onComplete={() => completeStep(2)}
            isStepCompleted={isStepCompleted(2)}
          />
        );
      case 3:
        // Mark analysis step as 'complete' when viewed? Or based on data presence?
        // For now, it doesn't have an explicit completion trigger
        // Let's mark it complete automatically when viewed, if the previous step is done
        if (
          currentProject.completedSteps[2] &&
          !currentProject.completedSteps[3]
        ) {
          completeStep(3);
        }
        return <Analysis />;
      default:
        return null;
    }
  };

  // If no project is selected, show the selection page
  if (!currentProjectId || !currentProject) {
    return <ProjectSelectionPage />;
  }

  // Otherwise, show the Wizard UI for the selected project
  return (
    <Container maxW="container.xl" className="main-container">
      <VStack spacing={10} align="stretch">
        {/* Project Header */}
        <Flex align="center" mb={4}>
          <Box>
            <Heading
              as="h1"
              fontSize={{ base: "xl", md: "2xl" }}
              fontWeight="700"
              color="gray.800"
            >
              {currentProject.name}
            </Heading>
            <Text fontSize="sm" color="gray.600">
              Analiz Projesi
            </Text>
          </Box>
          <Spacer />
          <Button
            size="sm"
            variant="outline"
            onClick={() => selectProject(null)}
          >
            Proje Seçimine Dön
          </Button>
        </Flex>

        {/* Stepper */}
        <Box>
          <Stepper index={activeStep} colorScheme="yellow" mb={8}>
            {steps.map((step, index) => {
              const isCompleted = currentProject.completedSteps[index] ?? false;
              const isPreviousStepCompleted =
                index === 0 || currentProject.completedSteps[index - 1];
              const isClickable =
                index === 0 || index <= activeStep || isPreviousStepCompleted;

              return (
                <Step
                  key={index}
                  onClick={() => handleStepClick(index)}
                  className={
                    isClickable ? "step-clickable" : "step-not-clickable"
                  }
                >
                  <StepIndicator>
                    {isCompleted ? <FaCheck color="black" /> : <StepNumber />}
                  </StepIndicator>
                  <Box flexShrink="0">
                    <StepTitle>{step.title}</StepTitle>
                  </Box>
                  <StepSeparator />
                </Step>
              );
            })}
          </Stepper>

          {/* Step Content */}
          <Box
            mt={6}
            borderWidth="1px"
            borderRadius="lg"
            p={6}
            borderColor="border.primary"
            bg="bg.secondary"
          >
            {renderStepContent()}
          </Box>
        </Box>
      </VStack>
    </Container>
  );
}

// Root App component providing context and theme
function App() {
  return (
    <ChakraProvider theme={theme}>
      <DataProvider>
        {/* Header Bar */}
        <Box className="header-bar">
          <Box
            className="logo-container"
            width="100%"
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Image
              src={chocolabsLogo}
              alt="Chocolabs Logo"
              className="logo-image"
            />
          </Box>
        </Box>
        {/* Main Content Area */}
        <AppContent />
      </DataProvider>
    </ChakraProvider>
  );
}

export default App;
