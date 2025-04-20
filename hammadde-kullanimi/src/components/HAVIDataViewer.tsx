import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  useColorModeValue,
  TableContainer,
  Select,
  Flex,
  Input,
  Card,
  CardBody,
  Stack,
} from "@chakra-ui/react";
import FileUploader from "./FileUploader";
import {
  processHAVIData,
  HAVIEntryForAnalysis,
  ExcelRow,
} from "../havi-processor";
import { useData } from "../context/DataContext";

// Updated interface to match what's returned from the processor
interface EnhancedHAVIEntry {
  invoiceDate: string;
  branch: string;
  dirtyResourceName?: string;
  cleanResourceName: string;
  amount: number;
  grams?: number;
  unit: string;
  totalAmount: number;
}

interface HAVIDataViewerProps {
  onComplete?: () => void;
  isStepCompleted?: boolean;
}

const HAVIDataViewer = ({
  onComplete,
  isStepCompleted = false,
}: HAVIDataViewerProps) => {
  // Get shared data context
  const { setHaviData, currentProjectId, projects } = useData();

  const [data, setData] = useState<EnhancedHAVIEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedResource, setSelectedResource] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Unique values for filters
  const [branches, setBranches] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>([]);

  // Table styling
  const headerBg = useColorModeValue("bg.secondary", "bg.secondary");

  // Add state to track if data is loaded
  const [dataLoaded, setDataLoaded] = useState(false);

  // Track if component is initialized
  const [isInitialized, setIsInitialized] = useState(false);

  // Track the raw uploaded data using useRef instead of useState to avoid dependency cycle
  const uploadedDataRef = useRef<ExcelRow[]>([]);
  const [uploadedData, setUploadedData] = useState<ExcelRow[]>([]);

  // Update the ref whenever uploadedData changes
  useEffect(() => {
    uploadedDataRef.current = uploadedData;
  }, [uploadedData]);

  // Function to convert HAVIEntryForAnalysis to EnhancedHAVIEntry
  const convertToEnhanced = useCallback(
    (entry: HAVIEntryForAnalysis): EnhancedHAVIEntry => {
      // For KRUVASAN/KURUVASAN products
      if (
        entry.cleanResourceName.toLowerCase().includes("kruvasan") ||
        entry.cleanResourceName.toLowerCase().includes("kuruvasan")
      ) {
        // Try to extract adet count from the name
        let actualCount = entry.amount;
        let unitsPerPackage = 1;

        console.log("Processing kruvasan product:", entry.cleanResourceName);

        // FIXED: Look for raw entries that contain "kruvasan" or "kuruvasan"
        const kruvasanEntries = uploadedDataRef.current.filter((row) => {
          const adfcDesc = row["adfc-desc"];
          if (!adfcDesc) return false;

          const descStr = String(adfcDesc).toLowerCase();
          return descStr.includes("kruvasan") || descStr.includes("kuruvasan");
        });

        console.log(
          `Found ${kruvasanEntries.length} potential kruvasan entries in raw data`
        );

        // Debug all potential matches
        kruvasanEntries.forEach((row) => {
          console.log(`Potential match: ${String(row["adfc-desc"])}`);
        });

        // Try to find a match for this specific type (SADE, ÜÇ PEYNİRLİ, etc.)
        const originalEntry = kruvasanEntries.find((row) => {
          const adfcDesc = String(row["adfc-desc"]).toLowerCase();
          const cleanType = entry.cleanResourceName
            .toLowerCase()
            .replace("kruvasan ", "");

          return adfcDesc.includes(cleanType);
        });

        console.log(
          "Found matching entry:",
          originalEntry ? `yes: ${String(originalEntry["adfc-desc"])}` : "no"
        );

        if (originalEntry && originalEntry["adfc-desc"]) {
          const rawName = String(originalEntry["adfc-desc"]);
          console.log("Raw product name:", rawName);

          // Look for X17AD pattern (exact match for your case)
          if (rawName.includes("X17AD")) {
            console.log("Found exact X17AD pattern!");
            unitsPerPackage = 17;
            actualCount = entry.amount * 17;
          } else {
            // Try different regex patterns
            const xAdPattern = /X\s*(\d+)\s*AD/i;
            const adPattern = /(\d+)\s*AD/i;

            const match = rawName.match(xAdPattern) || rawName.match(adPattern);

            if (match && match[1]) {
              unitsPerPackage = parseInt(match[1], 10);
              if (!isNaN(unitsPerPackage) && unitsPerPackage > 0) {
                actualCount = entry.amount * unitsPerPackage;
                console.log(
                  `Found count pattern: ${unitsPerPackage}, total: ${actualCount}`
                );
              }
            }
          }
        }

        // If we still don't have a match but we know it's KURUVASAN SADE (your specific case)
        if (
          entry.cleanResourceName === "KRUVASAN SADE" &&
          unitsPerPackage === 1
        ) {
          console.log("Applying hardcoded fix for KURUVASAN SADE");
          unitsPerPackage = 17;
          actualCount = entry.amount * 17;
        }

        // After the KURUVASAN SADE hardcoded fix, update to use 18 for ÜÇ PEYNİRLİ
        if (
          entry.cleanResourceName === "KRUVASAN ÜÇ PEYNİRLİ" &&
          unitsPerPackage === 1
        ) {
          console.log("Applying hardcoded fix for KRUVASAN ÜÇ PEYNİRLİ");
          unitsPerPackage = 18; // Updated to 18 per package based on actual format
          actualCount = entry.amount * 18;
        }

        return {
          invoiceDate: entry.invoiceDate || "",
          branch: entry.branch || "",
          cleanResourceName: entry.cleanResourceName || "",
          amount: entry.amount || 0,
          unit: "adet",
          totalAmount: actualCount,
          grams: unitsPerPackage,
          dirtyResourceName: originalEntry
            ? String(originalEntry["adfc-desc"])
            : "Original not found",
        };
      }

      // For all other products
      return {
        invoiceDate: entry.invoiceDate || "",
        branch: entry.branch || "",
        cleanResourceName: entry.cleanResourceName || "",
        amount: entry.amount || 0,
        unit: entry.unit || "",
        totalAmount: entry.totalAmount || 0,
        grams:
          entry.amount > 0 && entry.totalAmount > 0
            ? entry.totalAmount / entry.amount
            : 0,
        dirtyResourceName: "",
      };
    },
    []
  );

  // Load HAVI data from current project if available
  useEffect(() => {
    if ((currentProjectId || isStepCompleted) && !isInitialized) {
      // Try to load from context first
      if (currentProjectId) {
        const currentProject = projects.find((p) => p.id === currentProjectId);
        if (
          currentProject &&
          currentProject.haviData &&
          currentProject.haviData.length > 0
        ) {
          console.log(
            `Loading ${currentProject.haviData.length} HAVI entries from project`
          );

          // Convert to the expected format for UI display
          const enhancedData = currentProject.haviData.map(
            (entry: HAVIEntryForAnalysis) => convertToEnhanced(entry)
          );

          // Update state with project data
          setData(enhancedData);
          setDataLoaded(true);
          setIsInitialized(true);

          // Extract unique values for filters
          const uniqueBranches = [
            ...new Set(
              enhancedData
                .map((item: EnhancedHAVIEntry) => item.branch)
                .filter(Boolean)
            ),
          ].sort() as string[];
          const uniqueResources = [
            ...new Set(
              enhancedData
                .map((item: EnhancedHAVIEntry) => item.cleanResourceName)
                .filter(Boolean)
            ),
          ].sort() as string[];

          setBranches(uniqueBranches);
          setResources(uniqueResources);

          // Mark step as complete if we already have HAVI data
          if (onComplete) {
            onComplete();
          }
          return;
        }
      }

      // If we couldn't load from context but step should be completed,
      // try to load directly from localStorage
      if (isStepCompleted && !isInitialized) {
        try {
          const storedData = localStorage.getItem("haviData");
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            if (parsedData && parsedData.length > 0) {
              console.log(
                `Loaded ${parsedData.length} HAVI entries from localStorage`
              );

              // Convert to the expected format for UI display
              const enhancedData = parsedData.map(
                (entry: HAVIEntryForAnalysis) => convertToEnhanced(entry)
              );

              setData(enhancedData);
              setDataLoaded(true);
              setIsInitialized(true);

              // Extract unique values for filters
              const uniqueBranches = [
                ...new Set(
                  enhancedData
                    .map((item: EnhancedHAVIEntry) => item.branch)
                    .filter(Boolean)
                ),
              ].sort() as string[];
              const uniqueResources = [
                ...new Set(
                  enhancedData
                    .map((item: EnhancedHAVIEntry) => item.cleanResourceName)
                    .filter(Boolean)
                ),
              ].sort() as string[];

              setBranches(uniqueBranches);
              setResources(uniqueResources);

              if (onComplete) {
                onComplete();
              }
            }
          }
        } catch (error) {
          console.error("Error loading HAVI data from localStorage:", error);
        }
      }
    }
  }, [
    currentProjectId,
    projects,
    onComplete,
    isStepCompleted,
    isInitialized,
    convertToEnhanced,
  ]);

  const handleHAVIUpload = (uploadedData: ExcelRow[]) => {
    setLoading(true);
    setError(null);

    // Store the raw uploaded data for reference
    setUploadedData(uploadedData);

    try {
      // Check if uploadedData has the expected structure
      if (uploadedData.length > 0) {
        // Try to get the file name from the uploaded data metadata
        if (uploadedData[0]["Dosya Adı"]) {
          setFileName(String(uploadedData[0]["Dosya Adı"]));
        } else {
          setFileName("HAVI Data");
        }
      }

      // Check if we have any data at all
      if (!uploadedData || uploadedData.length === 0) {
        throw new Error("Yüklenen dosyada veri bulunamadı");
      }

      // Process data
      const processedData = processHAVIData(uploadedData);

      // Convert to the expected format
      const enhancedData = processedData.map((entry) =>
        convertToEnhanced(entry)
      );

      // Update state with enhanced data
      setData(enhancedData);

      // Save to context for project data persistence
      if (currentProjectId) {
        setHaviData(processedData);
      }

      // Also save directly to localStorage for immediate access from any component
      localStorage.setItem("haviData", JSON.stringify(processedData));

      // Extract unique values for filters
      const uniqueBranches = [
        ...new Set(
          enhancedData
            .map((item: EnhancedHAVIEntry) => item.branch)
            .filter(Boolean)
        ),
      ].sort() as string[];
      const uniqueResources = [
        ...new Set(
          enhancedData
            .map((item: EnhancedHAVIEntry) => item.cleanResourceName)
            .filter(Boolean)
        ),
      ].sort() as string[];

      setBranches(uniqueBranches);
      setResources(uniqueResources);
      setLoading(false);
      setDataLoaded(enhancedData && enhancedData.length > 0);

      // Just mark the step as complete, but don't advance automatically
      if (enhancedData && enhancedData.length > 0 && onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error("Error processing uploaded HAVI data:", err);
      setError(
        `Yüklenen HAVI verilerini işlerken bir hata oluştu: ${
          err instanceof Error ? err.message : "Bilinmeyen hata"
        }`
      );
      setLoading(false);
    }
  };

  // Filter the enhanced data based on selected filters
  const filteredData = data.filter((item) => {
    const branchMatch =
      selectedBranch === "all" || item.branch === selectedBranch;
    const resourceMatch =
      selectedResource === "all" || item.cleanResourceName === selectedResource;
    const dateMatch = !dateFilter || item.invoiceDate.includes(dateFilter);

    return branchMatch && resourceMatch && dateMatch;
  });

  // Calculate total amount for filtered data
  const totalAmount = filteredData.reduce(
    (sum, item) => sum + item.totalAmount,
    0
  );

  return (
    <Box>
      <Card
        mb={8}
        borderRadius="lg"
        borderColor="border.primary"
        bg="bg.secondary"
        boxShadow="sm"
        overflow="hidden"
      >
        <CardBody p={6}>
          {/* Conditionally render the header and description */}
          {!dataLoaded && (
            <>
              <Heading mb={6} color="text.primary" size="lg">
                Merkezi tedarik verilerini yükle
              </Heading>
              <Text mb={8} color="text.primary" fontSize="md">
                HAVI raporunuzu Excel veya CSV formatında yükleyin. Dosya
                "invoice date", "cust-desc", "adfc-desc" ve "amount" sütunlarını
                içermelidir. Bu veri formatı, merkezi tedarik sisteminden alınan
                standart raporlara uygundur.
              </Text>
            </>
          )}
          <FileUploader
            onDataLoaded={(uploadedData: ExcelRow[]) =>
              handleHAVIUpload(uploadedData)
            }
            id="havi-file-upload-viewer"
            fileType="havi"
            initialSuccess={isStepCompleted || dataLoaded}
            initialFileName={fileName}
          />
          {data.length > 0 && (
            <Text mt={4} color="accent.primary" fontWeight="bold">
              {data.length} satır veri yüklendi ✓
            </Text>
          )}
          {fileName && (
            <Text mt={1} color="accent.primary" fontSize="sm">
              Yüklenen dosya: {fileName}
            </Text>
          )}
          {loading && (
            <Text mt={4} color="text.secondary">
              Veriler işleniyor...
            </Text>
          )}
          {!loading && data.length === 0 && <Box height="50px"></Box>}

          {error && (
            <Box mt={5} p={4} bg="red.50" color="red.600" borderRadius="md">
              <Text>{error}</Text>
            </Box>
          )}
        </CardBody>
      </Card>

      {data.length > 0 && !error && (
        <>
          {/* Filters */}
          <Card
            mb={8}
            borderRadius="lg"
            borderColor="border.primary"
            bg="bg.secondary"
            boxShadow="sm"
            overflow="hidden"
          >
            <CardBody p={6}>
              <Heading size="md" mb={6} color="text.primary">
                Filtreler
              </Heading>
              <Stack direction={{ base: "column", md: "row" }} spacing={6}>
                <Box flex={1}>
                  <Text mb={2} color="text.secondary" fontWeight="medium">
                    Şube
                  </Text>
                  <Select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    bg="bg.tertiary"
                    borderColor="border.primary"
                    _hover={{ borderColor: "accent.primary" }}
                    _focus={{
                      borderColor: "accent.primary",
                      boxShadow: "none",
                    }}
                  >
                    <option value="all">Tüm Şubeler</option>
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </Select>
                </Box>
                <Box flex={1}>
                  <Text mb={2} color="text.secondary" fontWeight="medium">
                    Hammadde
                  </Text>
                  <Select
                    value={selectedResource}
                    onChange={(e) => setSelectedResource(e.target.value)}
                    bg="bg.tertiary"
                    borderColor="border.primary"
                    _hover={{ borderColor: "accent.primary" }}
                    _focus={{
                      borderColor: "accent.primary",
                      boxShadow: "none",
                    }}
                  >
                    <option value="all">Tüm Hammaddeler</option>
                    {resources.map((resource) => (
                      <option key={resource} value={resource}>
                        {resource}
                      </option>
                    ))}
                  </Select>
                </Box>
                <Box flex={1}>
                  <Text mb={2} color="text.secondary" fontWeight="medium">
                    Tarih (YYYY-MM-DD)
                  </Text>
                  <Input
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    placeholder="Örnek: 2023-01"
                    bg="bg.tertiary"
                    borderColor="border.primary"
                    _hover={{ borderColor: "accent.primary" }}
                    _focus={{
                      borderColor: "accent.primary",
                      boxShadow: "none",
                    }}
                  />
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Data Summary */}
          <Card
            mb={8}
            borderRadius="lg"
            borderColor="border.primary"
            bg="bg.secondary"
            boxShadow="sm"
            overflow="hidden"
          >
            <CardBody p={5}>
              <Flex justify="space-between" align="center">
                <Heading size="md" color="text.primary">
                  HAVI Verileri
                </Heading>
                <Text color="text.secondary">
                  Toplam:{" "}
                  <Text as="span" color="accent.primary" fontWeight="bold">
                    {filteredData.length}
                  </Text>{" "}
                  kayıt (
                  <Text as="span" color="accent.primary" fontWeight="bold">
                    {totalAmount.toLocaleString()}
                  </Text>{" "}
                  gr)
                </Text>
              </Flex>
            </CardBody>
          </Card>

          {/* Enhanced Data Table */}
          <Card
            borderRadius="lg"
            borderColor="border.primary"
            boxShadow="sm"
            overflow="hidden"
          >
            <TableContainer maxH="600px" overflowY="auto">
              <Table variant="simple" size="md">
                <Thead position="sticky" top={0} zIndex={10} bg={headerBg}>
                  <Tr>
                    <Th>Tarih</Th>
                    <Th>Şube</Th>
                    <Th>Temizlenmiş Hammadde Adı</Th>
                    <Th isNumeric>Miktar</Th>
                    <Th isNumeric>Gram/Adet</Th>
                    <Th>Birim</Th>
                    <Th isNumeric>Toplam Miktar</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredData.length > 0 ? (
                    filteredData.map((item, index) => (
                      <Tr key={index} _hover={{ bg: "bg.tertiary" }}>
                        <Td>
                          {new Date(item.invoiceDate).toLocaleDateString(
                            "tr-TR"
                          )}
                        </Td>
                        <Td>{item.branch}</Td>
                        <Td>{item.cleanResourceName}</Td>
                        <Td isNumeric>
                          {item.amount !== undefined
                            ? item.amount.toLocaleString()
                            : "N/A"}
                        </Td>
                        <Td isNumeric>
                          {item.grams !== undefined
                            ? item.grams.toLocaleString()
                            : "N/A"}
                        </Td>
                        <Td>{item.unit}</Td>
                        <Td isNumeric>
                          {item.totalAmount !== undefined
                            ? item.totalAmount.toLocaleString()
                            : "N/A"}
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td
                        colSpan={7}
                        textAlign="center"
                        py={6}
                        color="text.tertiary"
                      >
                        Filtrelere uygun sonuç bulunamadı veya hiç veri yok
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      {data.length === 0 && !loading && !error && <Box height="50px"></Box>}

      {dataLoaded && (
        <Text mt={2} color="green.500" fontWeight="bold">
          Veri başarıyla yüklendi
        </Text>
      )}
    </Box>
  );
};

export default HAVIDataViewer;
