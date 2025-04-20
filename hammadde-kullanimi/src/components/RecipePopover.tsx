import { useState, useEffect } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Button,
  Portal,
  Text,
  VStack,
  Spinner,
  Tag,
  Flex,
} from "@chakra-ui/react";
import { useCurrentProjectData } from "../context/DataContext";
import { RecipeItem } from "../recipe-service";

interface RecipePopoverProps {
  productName: string;
}

const RecipePopover = ({ productName }: RecipePopoverProps) => {
  const { recipeData } = useCurrentProjectData();
  const [popoverRecipes, setPopoverRecipes] = useState<RecipeItem[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (productName && recipeData.length > 0) {
      setIsLoading(true);
      const productSpecificRecipes = recipeData.filter(
        (recipe) => recipe.product === productName
      );
      setPopoverRecipes(productSpecificRecipes);
      setIsLoading(false);
    } else {
      setPopoverRecipes(null);
    }
  }, [productName, recipeData]);

  const hasRecipe = popoverRecipes !== null && popoverRecipes.length > 0;

  return (
    <Popover placement="right-start" isLazy>
      <PopoverTrigger>
        <Button
          variant="link"
          size="sm"
          colorScheme="yellow"
          fontWeight="normal"
          textDecoration={hasRecipe ? "underline" : "none"}
          cursor={hasRecipe ? "pointer" : "default"}
          _hover={{ textDecoration: hasRecipe ? "underline" : "none" }}
          isDisabled={!hasRecipe}
        >
          {productName}
        </Button>
      </PopoverTrigger>
      <Portal>
        <PopoverContent
          bg="bg.secondary"
          borderColor="border.primary"
          boxShadow="lg"
          minW="250px"
        >
          <PopoverArrow bg="bg.secondary" />
          <PopoverCloseButton />
          <PopoverHeader borderBottomWidth="1px" borderColor="border.primary">
            Reçete: {productName}
          </PopoverHeader>
          <PopoverBody>
            {isLoading ? (
              <Spinner size="sm" />
            ) : hasRecipe ? (
              <VStack align="stretch" spacing={1}>
                {popoverRecipes.map((item, index) => (
                  <Flex key={index} justify="space-between">
                    <Text fontSize="sm">{item.ingredient}</Text>
                    <Tag size="sm" colorScheme="gray">
                      {item.amount.toLocaleString("tr-TR", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      {item.unit}
                    </Tag>
                  </Flex>
                ))}
              </VStack>
            ) : (
              <Text fontSize="sm" color="text.secondary">
                Bu ürün için reçete bulunamadı.
              </Text>
            )}
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

export default RecipePopover;
