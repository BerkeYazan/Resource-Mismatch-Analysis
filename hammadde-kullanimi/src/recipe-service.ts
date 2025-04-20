import * as XLSX from "xlsx";

// Recipe item interface
export interface RecipeItem {
  product: string;
  ingredient: string;
  amount: number;
  unit: string;
}

// Process uploaded recipe files
export const processUploadedRecipes = (data: any[]): RecipeItem[] => {
  const processedRecipes: RecipeItem[] = [];
  let currentProduct = "";

  // Determine header row index (simple check for "Ürün")
  let headerIndex = -1;
  for (let i = 0; i < Math.min(5, data.length); i++) {
    if (data[i] && (data[i]["Ürün"] || data[i]["ürün"])) {
      headerIndex = i;
      break;
    }
  }

  // Use header index if found, otherwise assume first row might be header
  const dataToProcess = headerIndex !== -1 ? data.slice(headerIndex + 1) : data;
  const headers = headerIndex !== -1 ? data[headerIndex] : data[0] || {};

  // Find column names dynamically (case-insensitive)
  let productCol = "";
  let ingredientCol = "";
  let amountCol = "";
  let unitCol = "";

  for (const key in headers) {
    const lowerKey = key.toLowerCase();
    if (!productCol && lowerKey.includes("ürün")) productCol = key;
    if (
      !ingredientCol &&
      (lowerKey.includes("hammadde") || lowerKey.includes("malzeme"))
    )
      ingredientCol = key;
    if (!amountCol && lowerKey.includes("miktar")) amountCol = key;
    if (!unitCol && lowerKey.includes("birim")) unitCol = key;
  }

  // Fallback if columns not found by name (less reliable)
  if (!productCol || !ingredientCol || !amountCol) {
    const keys = Object.keys(headers);
    if (!productCol && keys.length > 0) productCol = keys[0];
    if (!ingredientCol && keys.length > 1) ingredientCol = keys[1];
    if (!amountCol && keys.length > 2) amountCol = keys[2];
    if (!unitCol && keys.length > 3) unitCol = keys[3]; // Optional unit
    console.warn("Recipe columns identified by position, results may vary.");
  }

  if (!productCol || !ingredientCol || !amountCol) {
    console.error(
      "Could not identify required columns (Ürün, Hammadde, Miktar) in recipe file."
    );
    return []; // Return empty if essential columns missing
  }

  dataToProcess.forEach((row) => {
    // Product name might span multiple rows or be empty, use the last known product
    if (
      row[productCol] &&
      typeof row[productCol] === "string" &&
      String(row[productCol]).trim() !== ""
    ) {
      currentProduct = String(row[productCol]).trim();
    }

    const ingredient = row[ingredientCol]
      ? String(row[ingredientCol]).trim()
      : null;
    const amountRaw = row[amountCol];
    const unitRaw = row[unitCol] ? String(row[unitCol]).trim() : "gr"; // Default unit to 'gr'
    const unit = unitRaw.toLowerCase() === "gram" ? "gr" : unitRaw; // Standardize gram to gr

    // Check if ingredient and amount are valid
    if (
      ingredient &&
      currentProduct &&
      amountRaw !== undefined &&
      amountRaw !== null &&
      String(amountRaw).trim() !== ""
    ) {
      let amount: number;
      if (typeof amountRaw === "number") {
        amount = amountRaw;
      } else {
        // Try parsing string, handle potential commas as decimal separators
        amount = parseFloat(String(amountRaw).replace(",", "."));
      }

      // Only add if amount is a valid number
      if (!isNaN(amount)) {
        processedRecipes.push({
          product: currentProduct,
          ingredient: ingredient,
          amount: amount,
          unit: unit, // Use standardized unit
        });
      } else {
        console.warn(
          `Skipping row for product ${currentProduct}: Invalid amount value '${amountRaw}' for ingredient '${ingredient}'`
        );
      }
    }
  });

  // Return the processed data - NO global cache update here
  return processedRecipes;
};
