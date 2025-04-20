import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Flex,
  Input,
  TableContainer,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import FileUploader from "./FileUploader";
import RecipePopover from "./RecipePopover";
import { processAktifPOSData } from "../aktifpos-processor";
import { useData } from "../context/DataContext";

interface AktifPOSEntry {
  date: string;
  branch: string;
  product: string;
  amount: number;
}

// Define a type for the raw data from file upload
interface RawDataRecord {
  [key: string]: string | number | boolean | Date | undefined;
}

interface AktifPOSDataViewerProps {
  onComplete?: () => void;
  isStepCompleted?: boolean;
}

const AktifPOSDataViewer = ({
  onComplete,
  isStepCompleted = false,
}: AktifPOSDataViewerProps) => {
  const [data, setData] = useState<AktifPOSEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentProjectId, projects, setAktifPosData } = useData();

  // Restore filters state
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Restore unique values state
  const [branches, setBranches] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);

  // Restore table styling
  const headerBg = useColorModeValue("bg.secondary", "bg.secondary");

  // Track if component is initialized
  const [isInitialized, setIsInitialized] = useState(false);

  // Load AktifPOS data from current project if available
  useEffect(() => {
    if ((currentProjectId || isStepCompleted) && !isInitialized) {
      // Try to load from context first
      if (currentProjectId) {
        const currentProject = projects.find((p) => p.id === currentProjectId);
        if (
          currentProject &&
          currentProject.aktifPosData &&
          currentProject.aktifPosData.length > 0
        ) {
          console.log(
            `Loading ${currentProject.aktifPosData.length} AktifPOS entries from project`
          );

          // Update state with project data
          setData(currentProject.aktifPosData);
          setIsInitialized(true);

          // Restore filter value extraction
          const uniqueBranches = [
            ...new Set(
              currentProject.aktifPosData
                .map((item: AktifPOSEntry) => item.branch)
                .filter(Boolean)
            ),
          ].sort() as string[];
          const uniqueProducts = [
            ...new Set(
              currentProject.aktifPosData
                .map((item: AktifPOSEntry) => item.product)
                .filter(Boolean)
            ),
          ].sort() as string[];

          setBranches(uniqueBranches);
          setProducts(uniqueProducts);

          // Restore saving to localStorage
          localStorage.setItem(
            "aktifPosData",
            JSON.stringify(currentProject.aktifPosData)
          );

          // Mark step as complete if we already have AktifPOS data
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
          const storedData = localStorage.getItem("aktifPosData");
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            if (parsedData && parsedData.length > 0) {
              console.log(
                `Loaded ${parsedData.length} AktifPOS entries from localStorage`
              );

              setData(parsedData);
              setIsInitialized(true);

              // Restore filter value extraction
              const uniqueBranches = [
                ...new Set(
                  parsedData
                    .map((item: AktifPOSEntry) => item.branch)
                    .filter(Boolean)
                ),
              ].sort() as string[];
              const uniqueProducts = [
                ...new Set(
                  parsedData
                    .map((item: AktifPOSEntry) => item.product)
                    .filter(Boolean)
                ),
              ].sort() as string[];

              setBranches(uniqueBranches);
              setProducts(uniqueProducts);

              if (onComplete) {
                onComplete();
              }
            }
          }
        } catch (error) {
          console.error(
            "Error loading AktifPOS data from localStorage:",
            error
          );
        }
      }
    }
  }, [currentProjectId, projects, onComplete, isStepCompleted, isInitialized]);

  const handleAktifPOSUpload = (uploadedData: RawDataRecord[]) => {
    // Restore loading and error state updates
    setLoading(true);
    setError(null);

    try {
      console.log(`AktifPOS upload: received ${uploadedData.length} rows`);

      // Check if data is already in the expected format
      const isAlreadyProcessed =
        uploadedData.length > 0 &&
        uploadedData[0] !== undefined &&
        "date" in uploadedData[0] &&
        "branch" in uploadedData[0] &&
        "product" in uploadedData[0] &&
        "amount" in uploadedData[0];

      // Process the data only if it's not already in the expected format
      let processedData;
      if (isAlreadyProcessed) {
        console.log(
          "Data is already in the expected format, skipping processing"
        );
        processedData = uploadedData as unknown as AktifPOSEntry[];
      } else {
        // Process the data using the specialized processor
        processedData = processAktifPOSData(uploadedData);
      }

      console.log(`Processed ${processedData.length} AktifPOS records`);
      console.log("Sample processed data:", processedData.slice(0, 3));

      // Set empty data first to force UI refresh
      setData([]);

      // Set the processed data after a small delay
      setTimeout(() => {
        setData(processedData);
        // Restore setLoading call
        setLoading(false);
        console.log("AktifPOS data updated in state");

        // Restore setBranches and setProducts calls
        const uniqueBranches = [
          ...new Set(
            processedData
              .map((item: AktifPOSEntry) => item.branch)
              .filter(Boolean)
          ),
        ].sort() as string[];
        const uniqueProducts = [
          ...new Set(
            processedData
              .map((item: AktifPOSEntry) => item.product)
              .filter(Boolean)
          ),
        ].sort() as string[];

        setBranches(uniqueBranches);
        setProducts(uniqueProducts);

        console.log(`Unique branches: ${uniqueBranches.length}`);
        console.log(`Unique products: ${uniqueProducts.length}`);

        // Restore saving to localStorage
        localStorage.setItem("aktifPosData", JSON.stringify(processedData));

        // Save data to the current project
        if (currentProjectId) {
          setAktifPosData(processedData);
        }

        // Just mark the step as complete, but don't advance automatically
        if (processedData && processedData.length > 0 && onComplete) {
          onComplete();
        }
      }, 50);
    } catch (err) {
      console.error("Error processing uploaded AktifPOS data:", err);
      // Restore setError call
      setError(
        `Veri işleme hatası: ${
          err instanceof Error ? err.message : "Bilinmeyen hata"
        }`
      );
      // Restore setLoading call
      setLoading(false);
    }
  };

  // Restore filteredData calculation
  const filteredData = data.filter((item) => {
    const branchMatch =
      selectedBranch === "all" || item.branch === selectedBranch;
    const productMatch =
      selectedProduct === "all" || item.product === selectedProduct;
    const dateMatch = !dateFilter || item.date.includes(dateFilter);

    return branchMatch && productMatch && dateMatch;
  });

  // Restore totalAmount calculation
  const totalAmount = filteredData.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  // Restore the useEffect for logging data changes
  useEffect(() => {
    console.log(`AktifPOS data state changed, now has ${data.length} rows`);
    if (data.length > 0) {
      console.log("First row of AktifPOS data:", data[0]);
    }
  }, [data]);

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
          {data.length === 0 && (
            <>
              <Heading mb={6} color="text.primary" size="lg">
                Satış verilerini yükle
              </Heading>
              <Text mb={8} color="text.primary" fontSize="md">
                AktifPOS verilerinizi Excel veya CSV formatında yükleyin. Dosya
                "Tarih", "Şube", "Ürün" ve "Miktar" sütunlarını içermelidir.
                Tarih formatı "DD.MM.YYYY" şeklinde olmalıdır. Şube adları HAVI
                verilerindeki şube adlarıyla eşleşmelidir.
              </Text>
            </>
          )}
          <FileUploader
            onDataLoaded={(loadedData: RawDataRecord[]) => {
              try {
                console.log(
                  `AktifPOS FileUploader onDataLoaded called with ${
                    loadedData?.length || 0
                  } rows`
                );

                // Make sure we have valid data
                if (!loadedData || !Array.isArray(loadedData)) {
                  console.error(
                    "AktifPOS received invalid data format:",
                    loadedData
                  );
                  return;
                }

                handleAktifPOSUpload(loadedData);
              } catch (error) {
                console.error(
                  "Error in AktifPOS onDataLoaded callback:",
                  error
                );
                // Restore setError call
                setError(
                  `Veri işleme hatası: ${
                    error instanceof Error ? error.message : "Bilinmeyen hata"
                  }`
                );
              }
            }}
            id="aktifpos-file-upload-viewer"
            fileType="aktifpos"
            initialSuccess={isStepCompleted || data.length > 0}
            initialFileName={data.length > 0 ? "AktifPOS Verisi" : ""}
          />
          {/* Add confirmation text here */}
          {data.length > 0 && (
            <Text mt={4} color="accent.primary" fontWeight="bold">
              {data.length} satır veri yüklendi ✓
            </Text>
          )}
        </CardBody>
      </Card>

      {/* Restore Filters Card */}
      {data.length > 0 && !error && (
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
                  _focus={{ borderColor: "accent.primary", boxShadow: "none" }}
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
                  Ürün
                </Text>
                <Select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  bg="bg.tertiary"
                  borderColor="border.primary"
                  _hover={{ borderColor: "accent.primary" }}
                  _focus={{ borderColor: "accent.primary", boxShadow: "none" }}
                >
                  <option value="all">Tüm Ürünler</option>
                  {products.map((product) => (
                    <option key={product} value={product}>
                      {product}
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
                  _focus={{ borderColor: "accent.primary", boxShadow: "none" }}
                />
              </Box>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* Restore Data Summary Card */}
      {data.length > 0 && !error && (
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
                AktifPOS Satış Verileri
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
                adet)
              </Text>
            </Flex>
          </CardBody>
        </Card>
      )}

      {/* Restore Data Table */}
      {data.length > 0 && !error && (
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
                  <Th>Ürün</Th>
                  <Th isNumeric>Miktar</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <Tr key={index} _hover={{ bg: "bg.tertiary" }}>
                      <Td>{new Date(item.date).toLocaleDateString("tr-TR")}</Td>
                      <Td>{item.branch}</Td>
                      <Td>
                        <RecipePopover productName={item.product} />
                      </Td>
                      <Td isNumeric>{item.amount.toLocaleString()}</Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td
                      colSpan={4}
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
      )}

      {/* Display loading or error messages */}
      {loading && (
        <Text mt={4} color="text.secondary">
          Veriler işleniyor...
        </Text>
      )}
      {!loading && data.length === 0 && !error && (
        <Box height="50px">
          {/* Add some space when there is no data and not loading */}
        </Box>
      )}
      {error && (
        <Box mt={5} p={4} bg="red.50" color="red.600" borderRadius="md">
          <Text>{error}</Text>
        </Box>
      )}
    </Box>
  );
};

export default AktifPOSDataViewer;
