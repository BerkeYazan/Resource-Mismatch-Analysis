import { useState, useEffect } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Text,
  TableContainer,
  useColorModeValue,
  Spinner,
  Tag,
  Card,
  CardBody,
  Flex,
} from "@chakra-ui/react";
import { getRecipeMap } from "../recipe-service";

interface AktifPOSEntry {
  date: string;
  branch: string;
  product: string;
  amount: number;
}

interface IngredientTotal {
  ingredient: string;
  totalAmount: number;
  unit: string;
}

interface IngredientTotalsProps {
  posData: AktifPOSEntry[];
}

const IngredientTotals = ({ posData }: IngredientTotalsProps) => {
  const [ingredients, setIngredients] = useState<IngredientTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [ingredientCount, setIngredientCount] = useState(0);

  const headerBg = useColorModeValue("bg.secondary", "bg.secondary");

  useEffect(() => {
    const calculateIngredientTotals = async () => {
      if (!posData || posData.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get recipe mapping from our service
        const recipeMap = await getRecipeMap();

        // Track products with recipes for reporting
        const productsWithRecipes = new Set<string>();

        // Aggregate ingredients across all products
        const ingredientTotals: Record<string, IngredientTotal> = {};

        // Process each POS entry
        posData.forEach((entry) => {
          const { product, amount } = entry;
          if (!amount) return;

          // Check if we have a recipe for this product
          if (recipeMap[product] && recipeMap[product].length > 0) {
            productsWithRecipes.add(product);

            // Add up ingredients based on recipe and quantity
            recipeMap[product].forEach((recipeItem) => {
              const { ingredient, amount: recipeAmount, unit } = recipeItem;
              const totalAmount = recipeAmount * entry.amount;

              if (!ingredientTotals[ingredient]) {
                ingredientTotals[ingredient] = {
                  ingredient,
                  totalAmount: totalAmount,
                  unit,
                };
              } else {
                ingredientTotals[ingredient].totalAmount += totalAmount;
              }
            });
          }
        });

        // Convert to array and sort by ingredient name
        const ingredientsList = Object.values(ingredientTotals)
          .map((item) => ({
            ...item,
            totalAmount: parseFloat(item.totalAmount.toFixed(2)), // Round to 2 decimal places
          }))
          .sort((a, b) => a.ingredient.localeCompare(b.ingredient));

        setIngredients(ingredientsList);
        setProductCount(productsWithRecipes.size);
        setIngredientCount(ingredientsList.length);
      } catch (error) {
        console.error("Error calculating ingredient totals:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateIngredientTotals();
  }, [posData]);

  if (loading) {
    return (
      <Box textAlign="center" p={8}>
        <Spinner size="xl" color="accent.primary" thickness="3px" />
        <Text mt={4} color="text.secondary">
          Hammadde hesaplamaları yapılıyor...
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
        <CardBody p={5}>
          <Flex justify="space-between" align="center">
            <Heading size="md" color="text.primary">
              Hammadde Kullanım Toplamları
            </Heading>
            <Flex gap={4}>
              <Tag
                colorScheme="gray"
                bg="accent.primary"
                color="white"
                px={3}
                py={2}
              >
                {productCount} ürün
              </Tag>
              <Tag
                colorScheme="gray"
                bg="accent.primary"
                color="white"
                px={3}
                py={2}
              >
                {ingredientCount} hammadde
              </Tag>
            </Flex>
          </Flex>
        </CardBody>
      </Card>

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
                <Th>Hammadde</Th>
                <Th isNumeric>Toplam Miktar</Th>
                <Th>Birim</Th>
              </Tr>
            </Thead>
            <Tbody>
              {ingredients.length > 0 ? (
                ingredients.map((item, index) => (
                  <Tr key={index} _hover={{ bg: "bg.tertiary" }}>
                    <Td>{item.ingredient}</Td>
                    <Td isNumeric>{item.totalAmount.toLocaleString()}</Td>
                    <Td>{item.unit}</Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td
                    colSpan={3}
                    textAlign="center"
                    py={6}
                    color="text.tertiary"
                  >
                    Reçete içeren ürün satışı bulunamadı veya reçete verisi
                    eksik
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default IngredientTotals;
