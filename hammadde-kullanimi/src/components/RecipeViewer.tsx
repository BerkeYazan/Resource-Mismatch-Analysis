import { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Select,
  Text,
  Input,
  Tag,
  InputGroup,
  InputLeftElement,
  TableContainer,
  Spinner,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  useToast,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { RecipeItem, processUploadedRecipes } from "../recipe-service";
import FileUploader from "./FileUploader";
import { useData, useCurrentProjectData } from "../context/DataContext";

// Add this interface for the Excel data format coming from FileUploader
interface ExcelRow {
  [key: string]: string | number | Date | boolean | undefined;
}

// Update the component props to include onComplete and isStepCompleted
interface RecipeViewerProps {
  onComplete?: () => void;
  isStepCompleted?: boolean;
}

const RecipeViewer = ({
  onComplete,
  isStepCompleted = false,
}: RecipeViewerProps) => {
  // Get data and setters from context
  const { currentProjectId, setRecipeData } = useData();
  const { recipeData: initialRecipeData } = useCurrentProjectData(); // Load initial data from current project

  const [recipes, setRecipes] = useState<RecipeItem[]>([]); // Local state for display
  const [loading, setLoading] = useState(true); // Local loading state for initialization
  const [isUploading, setIsUploading] = useState(false); // Upload specific loading
  const [uploadError, setUploadError] = useState<string | null>(null);
  const toast = useToast();

  // Initialize local state from context data
  useEffect(() => {
    setRecipes(initialRecipeData);
    setLoading(false);
  }, [initialRecipeData]);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  // Handler for FileUploader's onDataLoaded prop
  const handleDataLoaded = (data: ExcelRow[]) => {
    setIsUploading(true);
    setUploadError(null);
    setLoading(true); // Indicate processing

    try {
      console.log(`RecipeViewer: Processing ${data.length} uploaded rows.`);
      const processedRecipes = processUploadedRecipes(data);
      console.log(
        `RecipeViewer: Processed ${processedRecipes.length} recipe items.`
      );

      if (processedRecipes.length > 0) {
        // Update local state for immediate UI feedback
        setRecipes(processedRecipes);

        // Update the project context data using the setter from useData
        if (currentProjectId) {
          console.log(
            `RecipeViewer: Saving ${processedRecipes.length} recipe items to project ${currentProjectId}`
          );
          setRecipeData(processedRecipes); // This saves to the current project context
        } else {
          console.warn(
            "RecipeViewer: No current project ID found to save recipes."
          );
        }

        toast({
          title: "Reçete yüklendi",
          description: `${processedRecipes.length} reçete öğesi başarıyla işlendi.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });

        // Mark step as complete via callback
        if (onComplete) {
          onComplete();
        }
      } else {
        setUploadError(
          "Yüklenen dosyada geçerli reçete verisi bulunamadı veya format hatalı."
        );
        throw new Error("Geçerli reçete verisi bulunamadı");
      }
    } catch (error) {
      console.error("Error processing recipe data:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Dosya işlenirken bir hata oluştu. Formatı kontrol edin.";
      setUploadError(message);
      toast({
        title: "Hata",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
      setLoading(false); // Finish processing indicator
    }
  };

  // Filter the recipes based on selected filters
  const filteredRecipes = recipes.filter((item) => {
    const productMatch =
      selectedProduct === "all" || item.product === selectedProduct;
    const searchMatch =
      !searchTerm ||
      item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ingredient.toLowerCase().includes(searchTerm.toLowerCase());

    return productMatch && searchMatch;
  });

  // Get unique products for filter dropdown
  const products = [...new Set(recipes.map((item) => item.product))].sort();

  // Group recipes by product
  const groupedRecipes: Record<string, RecipeItem[]> = {};
  filteredRecipes.forEach((recipe) => {
    if (!groupedRecipes[recipe.product]) {
      groupedRecipes[recipe.product] = [];
    }
    groupedRecipes[recipe.product].push(recipe);
  });

  // Render Loading state for initial load
  if (loading && recipes.length === 0 && !isUploading) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" color="brand.gold" thickness="3px" />
        <Text mt={4} fontSize="lg" color="text.secondary">
          Reçete verileri yükleniyor...
        </Text>
      </Box>
    );
  }

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
          {recipes.length === 0 && (
            <>
              <Heading mb={6} color="text.primary" size="lg">
                Ürün reçetelerini yükle
              </Heading>
              <Text mb={8} color="text.primary" fontSize="md">
                Excel formatında reçete dosyası yükleyin. Dosya "Ürün",
                "Hammadde", "Miktar" ve "Birim" sütunlarını içermelidir. Her
                satır bir ürünün bir hammaddesini temsil etmelidir.
              </Text>
            </>
          )}

          <FileUploader
            onDataLoaded={handleDataLoaded}
            fileType="recipe"
            isLoading={isUploading} // Use the upload-specific loading state here
            accept=".xlsx,.xls"
            initialSuccess={isStepCompleted || initialRecipeData.length > 0} // Base success on initial data
            initialFileName={
              initialRecipeData.length > 0 ? "Reçete Verisi" : ""
            }
          />

          {/* Add confirmation text here */}
          {recipes.length > 0 && (
            <Text mt={4} color="accent.primary" fontWeight="bold">
              {recipes.length} satır veri yüklendi ✓
            </Text>
          )}

          {uploadError && (
            <Text mt={2} color="red.500" fontSize="sm">
              {uploadError}
            </Text>
          )}
        </CardBody>
      </Card>

      {/* Show filters and results only if recipes exist */}
      {recipes.length === 0 && !loading ? (
        <Box
          textAlign="center"
          p={5}
          borderWidth="1px"
          borderRadius="lg"
          bg="bg.secondary"
        >
          <Text color="text.secondary">
            Başlamak için lütfen bir reçete dosyası yükleyin.
          </Text>
        </Box>
      ) : (
        <>
          {/* Filters section */}
          <Flex
            mb={8}
            p={5}
            borderWidth="1px"
            borderRadius="lg"
            borderColor="border.primary"
            bg="bg.secondary"
            direction={{ base: "column", md: "row" }}
            gap={4}
            align="flex-end"
          >
            <Box flex={1}>
              <Text mb={2} color="text.secondary" fontWeight="medium">
                Ürün
              </Text>
              <Select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                bg="bg.tertiary"
                borderColor="border.primary"
                _hover={{ borderColor: "brand.gold" }}
                _focus={{ borderColor: "brand.gold", boxShadow: "none" }}
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
                Arama
              </Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="text.tertiary" />
                </InputLeftElement>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ürün veya hammadde ara..."
                  bg="bg.tertiary"
                  borderColor="border.primary"
                  _hover={{ borderColor: "brand.gold" }}
                  _focus={{ borderColor: "brand.gold", boxShadow: "none" }}
                />
              </InputGroup>
            </Box>

            <Box>
              <Tag
                colorScheme="yellow"
                bg="brand.gold"
                color="white"
                px={3}
                py={2}
              >
                {Object.keys(groupedRecipes).length} ürün,{" "}
                {filteredRecipes.length} hammadde
              </Tag>
            </Box>
          </Flex>

          {/* Results Grid */}
          {loading ? (
            <Box textAlign="center" p={8}>
              <Spinner size="lg" />
            </Box>
          ) : Object.keys(groupedRecipes).length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {Object.entries(groupedRecipes).map(([product, items]) => (
                <Card
                  key={product}
                  borderRadius="lg"
                  overflow="hidden"
                  borderColor="border.primary"
                  boxShadow="sm"
                >
                  <CardHeader
                    bg="bg.tertiary"
                    py={3}
                    px={4}
                    borderBottom="1px solid"
                    borderColor="border.primary"
                  >
                    <Heading size="sm" color="text.primary">
                      {product}
                    </Heading>
                  </CardHeader>

                  <CardBody p={0}>
                    <TableContainer maxH="250px" overflowY="auto">
                      <Table variant="simple" size="sm">
                        <Thead position="sticky" top={0} zIndex={1}>
                          <Tr>
                            <Th
                              color="brand.gold"
                              bg="bg.secondary"
                              px={4}
                              py={3}
                            >
                              {" "}
                              Hammadde{" "}
                            </Th>
                            <Th
                              isNumeric
                              color="brand.gold"
                              bg="bg.secondary"
                              px={4}
                              py={3}
                            >
                              {" "}
                              Miktar{" "}
                            </Th>
                            <Th
                              color="brand.gold"
                              bg="bg.secondary"
                              px={4}
                              py={3}
                            >
                              {" "}
                              Birim{" "}
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {items.map((item, index) => (
                            <Tr key={`${product}-${item.ingredient}-${index}`}>
                              <Td px={4}>{item.ingredient}</Td>
                              <Td isNumeric px={4}>
                                {" "}
                                {item.amount.toLocaleString("tr-TR", {
                                  maximumFractionDigits: 2,
                                })}{" "}
                              </Td>
                              <Td px={4}>{item.unit}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <Box
              textAlign="center"
              p={5}
              borderWidth="1px"
              borderRadius="lg"
              bg="bg.secondary"
            >
              <Text color="text.secondary">
                Filtre kriterlerine uygun reçete bulunamadı.
              </Text>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default RecipeViewer;
