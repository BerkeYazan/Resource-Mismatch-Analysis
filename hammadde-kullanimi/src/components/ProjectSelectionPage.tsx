import React, { useMemo } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  List,
  ListItem,
  Text,
  VStack,
  IconButton,
  Spacer,
  useToast,
  HStack,
  Icon,
  Center,
  Badge,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon, ViewIcon, InfoIcon } from "@chakra-ui/icons";
import {
  FaCheckCircle,
  FaWarehouse,
  FaCashRegister,
  FaClipboardList,
} from "react-icons/fa";
import { useData, AnalysisProject } from "../context/DataContext";

// Helper to format date to DD.MM.YYYY
const formatDateEuropean = (isoDateString: string): string => {
  try {
    return new Date(isoDateString).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Geçersiz Tarih";
  }
};

// Modernized progress indicator component
const ProgressIndicator = ({
  completedSteps,
}: {
  completedSteps: boolean[];
}) => {
  const stepsInfo = [
    { label: "Reçete", completed: completedSteps[0], icon: FaClipboardList },
    { label: "HAVI", completed: completedSteps[1], icon: FaWarehouse },
    { label: "AktifPOS", completed: completedSteps[2], icon: FaCashRegister },
  ];

  return (
    <VStack spacing={3} align="stretch" width="100%">
      {stepsInfo.map((step, index) => (
        <HStack key={index} spacing={2}>
          <Icon
            as={step.completed ? FaCheckCircle : step.icon}
            color={step.completed ? "green.500" : "gray.400"}
            boxSize={4}
          />
          <Text
            fontSize="sm"
            color={step.completed ? "green.600" : "gray.600"}
            fontWeight={step.completed ? "medium" : "normal"}
          >
            {step.label}
          </Text>
          <Box
            flex="1"
            height="2px"
            bg={step.completed ? "green.200" : "gray.200"}
          />
          <Badge
            colorScheme={step.completed ? "green" : "gray"}
            variant={step.completed ? "solid" : "outline"}
            borderRadius="full"
            px={2}
            fontSize="2xs"
            fontWeight="medium"
          >
            {step.completed ? "Yüklendi" : "Bekliyor"}
          </Badge>
        </HStack>
      ))}
    </VStack>
  );
};

const ProjectSelectionPage = () => {
  const { projects, selectProject, createProject, deleteProject } = useData();
  const toast = useToast();

  const handleCreateNewProject = () => {
    const newProjectId = createProject();
    selectProject(newProjectId);
    toast({
      title: "Yeni analiz oluşturuldu.",
      description: `Proje ID: ${newProjectId}`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleDeleteProject = (
    e: React.MouseEvent<HTMLButtonElement>,
    projectId: string
  ) => {
    e.stopPropagation();
    const projectToDelete = projects.find((p) => p.id === projectId);
    if (
      window.confirm(
        `'${
          projectToDelete?.name || projectId
        }' analizini silmek istediğinizden emin misiniz?`
      )
    ) {
      deleteProject(projectId);
      toast({
        title: "Analiz silindi.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const { inProgressProjects, finishedProjects } = useMemo(() => {
    const inProgress: AnalysisProject[] = [];
    const finished: AnalysisProject[] = [];
    projects.forEach((p) => {
      if (p.completedSteps[0] && p.completedSteps[1] && p.completedSteps[2]) {
        finished.push(p);
      } else {
        inProgress.push(p);
      }
    });
    finished.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    inProgress.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return { inProgressProjects: inProgress, finishedProjects: finished };
  }, [projects]);

  const renderProjectList = (projectList: AnalysisProject[], title: string) => (
    <Box w="full">
      <Heading
        as="h4"
        size="md"
        mb={6}
        fontWeight="medium"
        color="gray.700"
        borderBottom="2px"
        borderColor="gray.200"
        pb={2}
      >
        {title} ({projectList.length})
      </Heading>
      {projectList.length > 0 ? (
        <List spacing={4}>
          {projectList.map((project) => {
            const isFinished =
              project.completedSteps[0] &&
              project.completedSteps[1] &&
              project.completedSteps[2];
            const canViewAnalysis = isFinished;
            const listItemTargetStep = isFinished ? 3 : 0;

            return (
              <ListItem
                key={project.id}
                borderRadius="md"
                bg="white"
                boxShadow="sm"
                overflow="hidden"
                borderWidth="1px"
                borderColor="gray.100"
                _hover={{
                  boxShadow: "md",
                  borderColor: "gray.200",
                  transform: "translateY(-1px)",
                }}
                transition="all 0.2s"
                cursor="pointer"
                onClick={() => selectProject(project.id, listItemTargetStep)}
              >
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 300px" }}
                  gap={0}
                >
                  {/* Left section with project info */}
                  <GridItem p={6}>
                    <VStack align="start" spacing={3}>
                      <Text
                        fontWeight="semibold"
                        fontSize="xl"
                        color="gray.800"
                        noOfLines={1}
                      >
                        {project.name}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Oluşturulma: {formatDateEuropean(project.createdAt)}
                      </Text>
                      <Spacer h={3} />
                      <HStack spacing={3}>
                        <Button
                          size="sm"
                          leftIcon={<ViewIcon />}
                          colorScheme={canViewAnalysis ? "blue" : "gray"}
                          variant={canViewAnalysis ? "solid" : "outline"}
                          isDisabled={!canViewAnalysis}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectProject(project.id, 3);
                          }}
                        >
                          Analizi Gör
                        </Button>
                        <IconButton
                          aria-label="Projeyi Sil"
                          icon={<DeleteIcon />}
                          variant="ghost"
                          colorScheme="red"
                          size="sm"
                          onClick={(e) => handleDeleteProject(e, project.id)}
                        />
                      </HStack>
                    </VStack>
                  </GridItem>

                  {/* Right section with progress */}
                  <GridItem
                    bg="gray.50"
                    p={6}
                    borderLeftWidth={{ base: 0, md: "1px" }}
                    borderTopWidth={{ base: "1px", md: 0 }}
                    borderColor="gray.200"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <ProgressIndicator
                      completedSteps={project.completedSteps}
                    />
                  </GridItem>
                </Grid>
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Box p={8} bg="gray.50" borderRadius="md" textAlign="center">
          <Text color="gray.500" fontStyle="italic">
            Bu bölümde analiz bulunmuyor.
          </Text>
        </Box>
      )}
    </Box>
  );

  return (
    <Container maxW="container.lg" py={12}>
      <VStack spacing={10} align="stretch">
        <Heading
          as="h1"
          size="xl"
          textAlign="center"
          color="gray.800"
          fontWeight="bold"
        >
          Şube Bazında Hammadde Kullanım Analizi
        </Heading>

        <Center pb={4} pt={2}>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="yellow"
            size="lg"
            px={8}
            py={7}
            fontSize="md"
            borderRadius="md"
            boxShadow="md"
            onClick={handleCreateNewProject}
            _hover={{
              transform: "translateY(-2px)",
              boxShadow: "lg",
            }}
            transition="all 0.2s"
          >
            Yeni Analiz Başlat
          </Button>
        </Center>

        {projects.length > 0 && (
          <VStack spacing={12} align="stretch" w="full">
            {inProgressProjects.length > 0 &&
              renderProjectList(inProgressProjects, "Devam Eden Analizler")}

            {finishedProjects.length > 0 &&
              renderProjectList(finishedProjects, "Tamamlanan Analizler")}
          </VStack>
        )}

        {projects.length === 0 && (
          <Box
            p={10}
            bg="gray.50"
            borderRadius="md"
            textAlign="center"
            mt={6}
            boxShadow="sm"
          >
            <HStack spacing={3} color="gray.500" justify="center">
              <Icon as={InfoIcon} boxSize={5} />
              <Text>
                Yeni bir analiz başlatmak için yukarıdaki butonu kullan.
              </Text>
            </HStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
};

export default ProjectSelectionPage;
