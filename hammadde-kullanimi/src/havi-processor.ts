// Define interfaces
interface HAVIEntry {
  invoiceDate: string;
  branch: string;
  resource: string;
  grams: number;
  unit: string;
  orderCount: number;
}

// New interface for the improved processor
interface EnhancedHAVIEntry {
  invoiceDate: string; // Date from column B
  branch: string; // Branch name from column D
  dirtyResourceName: string; // Original product name from column K
  cleanResourceName: string; // Cleaned product name
  amount: number; // Amount from column L
  grams: number; // Extracted gram information
  unit: string; // "gram" or "adet"
  totalAmount: number; // amount * grams
}

interface ResourceMapping {
  [key: string]: boolean;
}

// Define types for the Excel data
export interface ExcelRow {
  [key: string]: string | number | Date | boolean | undefined;
}

// Define resource mapping from dirty to clean names
const resourceNameMapping: Record<string, string> = {
  // Chocolate products
  "callebout sutlu": "SÜTLÜ.ÇİK.",
  "callebout kuvertur bitter": "BİTTER.ÇİK.",
  "kuvertur beyaz": "BEYAZ.ÇİK.",
  "kuvertur bitter": "BİTTER.ÇİK.",

  // Cream and topping products
  "ambiante sivi bitk.santi": "AMBİANTE",
  "festipak sivi bitk.santi": "FESTİPAK",

  // Mixes
  "suffle toz karisim": "SUFLE MIX",
  "waffle toz karisim": "WAFFLE MİX",
  "red-velvet": "RED VELVET MIX",
  "cookies bag sade": "COOKİE SADE MIX",
  "soft cookies kakaolu": "COOKİE CACAO MIX",
  "cream cake toffee": "TOFFEE MIX",
  "moist-islak kek mix": "KAKAOLU KEK-MIX",
  "csm-islak kek mix": "KAKAOLU KEK-MIX",
  "kakaolu kek-mix": "KAKAOLU KEK-MIX",
  "kakaolu kek-mi̇x": "KAKAOLU KEK-MIX",
  "tegral mochi mix": "MOCHİ MİX",
  "antep fistikli mix": "ANTEP FISTIKLI MİX",
  "cicibebe mix bag": "BİSKÜVİ MIX",

  // Nuts and fruits
  "hindistan cevizi": "H.CEVİZİ",
  "badem dilimlenmis": "BADEM",
  "krep kirigi": "K.KIRIĞI",
  "pastacilik yagi": "P.YAĞI",
  "antep fistiği içi tane": "ANTEP FISTIĞI TANE",
  "antep fistiği iç tane": "ANTEP FISTIĞI TANE",
  "toz antep fistik": "ANTEP FISTIĞI TOZ",
  "toz antep fıstık": "ANTEP FISTIĞI TOZ",
  "antep fistik toz": "ANTEP FISTIĞI TOZ",
  "antep fıstık toz": "ANTEP FISTIĞI TOZ",
  "antep fistik tuttuno": "ANTEP FISTIĞI TUTTUNO",
  "yer fistiği kremasi": "YER FISTIĞI KREMASI",
  "bütün yer fistiği": "BÜTÜN YER FISTIĞI",
  "FINDIK ICI PIRINC GIRE 5 KG": "P.FINDIK",

  // Creams and toppings
  "deli hazir krema karamelli": "DELİ KARAMEL",
  "deli hazir krema limonlu": "DELİ LİMON",
  labne: "LABNE",
  "frambuaz ganaj": "FRAMBUAZ GANAJ",
  "pastacilik kremasi": "CPT",
  "tarcin karamtuttunopaste": "TARÇIN TUTTUNO",

  // Frozen products
  "donuk böğürtlen": "DONUK BÖĞÜRTLEN",
  "donuk frambuaz": "DONUK FRAMBUAZ",
  "limonata donuk": "LİMONATA",

  // Decorations
  "barlo dec. chocol bitter bukle": "BİTTER BUKLE",

  // Pastry
  "tereyağli milfoy hamuru": "MİLFÖY",

  // Coffee products
  "espresso cekirdek": "ESPRESSO",
  "filtre kahve": "FİLTRE KAHVE SADE",
  "turk kahvesi": "TÜRK KAHVESİ",
  "turk kahve damla sakiz": "DAMLA SAKIZLI TÜRK KAHVESİ",
  "dibek kahvesi": "DİBEK KAHVESİ",

  // Tea products
  "chai tea latte": "CHAİ TEA TOZU",
  "cay suzme brgmt dogus": "DOĞUŞ ÇAY",
  "bergamotlu çay": "DOĞUŞ ÇAY",
  "cay suzme brgmtsuz dogus": "BERGAMOTSUZ ÇAY",
  "cay elma": "ELMA ÇAYI",
  "cay ihlamur": "IHLAMUR ÇAYI",
  "cay kis": "KIŞ ÇAYI",
  "cay kusburnu": "KUŞBURNU ÇAYI",
  "cay melisa": "MELİSA ÇAYI",
  "cay nane limon": "NANE LİMON ÇAYI",
  "cay papatya": "PAPATYA ÇAYI",
  "cay tropikal": "TROPİKAL ÇAYI",
  "cay yesil": "YEŞİL ÇAY",
  "cay adacayi": "ADAÇAYI",
  hibiskus: "HİBİSKUS ÇAYI",

  // DVG products (syrups and flavorings)
  "dvg flavour maxx": "FLAVOUR MAX",
  "dvg b.scot": "BUTTERSCOTCH",
  "dvg findik surup": "FINDIK ŞURUP",
  "dvg vanilya surup": "VANİLYA ŞURUP",
  "dvg limon aroma verici": "LİMON AROMA VERİCİ",
  "dvg carkifelek meyve karisim": "ÇARKIFELEK MEYVE KARIŞIM",
  "dvg krater bogurtlen p": "BÖĞÜRTLEN PÜRE",
  "dvg krater y.elma p": "YEŞİL ELMA PÜRE",
  "dvg spiced chai surup": "SPİCED CHAİ ŞURUP",
  "dvg nane& limon aro.kar": "NANE VE LİMON AROMA KARIŞIM",
  "dvg greyfurt karisim": "GREYFURT ŞURUP",
  "dvg aci portakal surup": "ACI PORTAKAL",
  "dvg cilek aroma surup": "ÇİLEK ŞURUP",
  "dvg mango surup": "MANGO ŞURUP",
  "dvg bahce seftali .surup": "ŞEFTALİ ŞURUP",
  "dvg maviturun blueocean": "BLUE OCEAN ŞURUP",
  "dvg sos beyaz": "SOS BEYAZ",
  "dvg sos bitter": "SOS BİTTER",
  "dvg muz aromali surup": "MUZ ŞURUP",
  "dvg w.melon karpuz s": "KARPUZ ŞURUP",
  "dvg karamel aromali sos": "KARAMEL SOS",

  // MONIN products
  "monin-siyah cikolata sos": "SOS BİTTER",
  "monin-beyaz cikolatasos": "SOS BEYAZ",
  "monin-findik surup": "FINDIK ŞURUP",
  "monin-vanilya surup": "VANİLYA ŞURUP",
  "monin-chai tea surup": "SPİCED CHAİ ŞURUP",
  "monin-cilek surup": "ÇİLEK ŞURUP",
  "monin-carkifelek meyv.pure": "ÇARKIFELEK MEYVE KARIŞIM",
  "monin-muz surup": "MUZ ŞURUP",
  "monin-karpuz surup": "KARPUZ ŞURUP",
  "monin-mango surup": "MANGO ŞURUP",
  "monin-nar surup": "NAR ŞURUP",

  // Sauce products
  "sos cikolata bitter 1000 gr": "SOS BİTTER",
  "sos cikolata beyaz 1000 gr": "SOS BEYAZ",

  // Pastry products
  "kuruvasan sade": "KRUVASAN SADE",
  "kuruvasan uc peynirli": "KRUVASAN ÜÇ PEYNİRLİ",

  // Coffee beans
  "sumatra dunya": "SUMATRA",
  "kenya dunya": "KENYA",
  "ethiopian dunya": "ETHİOPİA",
  "costa rica dunya": "COSTARİCA",
  "colombia dunya": "COLOMBİA",
  "brasil dunya": "BRASİL",

  // Other beverages
  smoothies: "SMOOTIE TOZU",
  "salep teneke": "SAHLEP",
  "french vanilla": "FRENCH VANİLLA",
  "hazelnut aro.kahve": "HAZELNUT",
  "caramel aro.kahve": "CARAMEL",
  "choco cherry a.kahve": "CHOCOLATE CHERRY",
  "swiss choc.aro.kahve": "SWİSS CHOCOLATE",
  "choco.raspberry": "CHOCOLATE RASPBERRY",
  "salep damla sakizli": "SAHLEP DAMLA SAKIZLI",

  // Bubble products
  "bobaco blueberry": "BLUE BUBBLE",
  "bobaco bubble gum": "PINK BUBBLE",
  "bobaco blueberry kova 3.4kg": "BLUE BUBBLE",
  "bobaco bubble gum kova 3.4kg": "PINK BUBBLE",

  ÇAY: "DOĞUŞ ÇAY",
  "BERGAMOTLU ÇAY": "DOĞUŞ ÇAY",
  "FİNCAN ÇAY": "DOĞUŞ ÇAY",
};

// Products that should be counted as items, not converted to grams
const itemCountProducts = ["kruvasan", "kuruvasan"];

// Helper to convert Excel date number to YYYY-MM-DD format
function excelDateToString(excelDate: number): string {
  // Excel dates are number of days since 1900-01-01 (with leap year bug)
  // Need to adjust by 25569 days to get Unix epoch date
  const unixDate = (excelDate - 25569) * 86400 * 1000;
  const date = new Date(unixDate);
  return date.toISOString().split("T")[0]; // YYYY-MM-DD format
}

// Find the column that contains resource names in the recipe sheet
export function findResourceColumnInRecipeSheet(
  data: ExcelRow[]
): string | null {
  if (data.length === 0) return null;

  // Look at the first row to identify potential column names
  const firstRow = data[0];

  // Check for common names that might indicate resource columns
  const possibleResourceColumns = [
    "Hammadde",
    "Malzeme",
    "Ürün",
    "Resource",
    "İçerik",
    "Reçete",
  ];

  for (const colName of Object.keys(firstRow)) {
    if (possibleResourceColumns.some((name) => colName.includes(name))) {
      return colName;
    }
  }

  // If we can't find by name, try to find a column with string values
  // that might contain resource names
  for (const colName of Object.keys(firstRow)) {
    if (
      typeof firstRow[colName] === "string" &&
      firstRow[colName].toString().trim() !== ""
    ) {
      return colName;
    }
  }

  return null;
}

// Extract valid resources from the recipe sheet
export function getValidResources(
  data: ExcelRow[],
  resourceColumnName: string
): ResourceMapping {
  const validResources: ResourceMapping = {};

  data.forEach((row) => {
    if (
      row[resourceColumnName] &&
      typeof row[resourceColumnName] === "string"
    ) {
      const resourceName = row[resourceColumnName]
        .toString()
        .trim()
        .toLowerCase();
      if (resourceName !== "") {
        validResources[resourceName] = true;
      }
    }
  });

  return validResources;
}

// Identify the relevant columns in the HAVI report
export function identifyHAVIColumns(data: ExcelRow[]): {
  invoiceDateColumn: string | null;
  custDescColumn: string | null;
  adfcDescColumn: string | null;
  amountColumn: string | null;
  invoiceNrColumn: string | null;
} {
  if (data.length === 0)
    return {
      invoiceDateColumn: null,
      custDescColumn: null,
      adfcDescColumn: null,
      amountColumn: null,
      invoiceNrColumn: null,
    };

  const firstRow = data[0];
  const columns = Object.keys(firstRow);

  console.log("Debug: Available columns in the HAVI report:", columns);

  // Initialize with common names
  let invoiceDateColumn: string | null = null;
  let custDescColumn: string | null = null;
  let adfcDescColumn: string | null = null;
  let amountColumn: string | null = null;
  let invoiceNrColumn: string | null = null;

  // Try to find invoice date column
  for (const col of columns) {
    const colLower = col.toLowerCase();
    console.log(`Checking column: "${col}" (${colLower})`);

    if (
      colLower === "invoice date" ||
      colLower === "invoice-date" ||
      (colLower.includes("fatura") && colLower.includes("tarih"))
    ) {
      invoiceDateColumn = col;
      console.log(`Found invoice date column: ${col}`);
    } else if (
      colLower === "cust-desc" ||
      colLower.includes("müşteri") ||
      colLower.includes("şube")
    ) {
      custDescColumn = col;
      console.log(`Found customer description column: ${col}`);
    } else if (
      colLower === "adfc-desc" ||
      colLower.includes("ürün") ||
      colLower.includes("malzeme")
    ) {
      adfcDescColumn = col;
      console.log(`Found product description column: ${col}`);
    } else if (
      colLower === "faturadaki miktar" ||
      colLower.includes("miktar") ||
      colLower.includes("amount")
    ) {
      amountColumn = col;
      console.log(`Found amount column: ${col}`);
    } else if (
      colLower === "invoice nr" ||
      (colLower.includes("fatura") && colLower.includes("no"))
    ) {
      invoiceNrColumn = col;
      console.log(`Found invoice number column: ${col}`);
    }
  }

  const result = {
    invoiceDateColumn,
    custDescColumn,
    adfcDescColumn,
    amountColumn,
    invoiceNrColumn,
  };

  console.log("Identified columns:", result);

  return result;
}

// Extract gram or adet information from product name
function extractGramsFromProductName(
  productName: string,
  amount: number
): { grams: number; unit: string } {
  const productLower = productName.toLowerCase();

  // Special case for FESTIPAK with 12AD (which is actually 12kg, 1kg each)
  if (
    (productLower.includes("festipak sivi bitk.santi") &&
      (productLower.includes("12ad") || productLower.includes("12 ad"))) ||
    (productLower.includes("ambiante sivi bitk.santi") &&
      (productLower.includes("12ad") || productLower.includes("12 ad")))
  ) {
    return { grams: 12000, unit: "gram" };
  }

  // Special case for BARLO DEC. CHOCOL BITTER BUKLE - should be treated as 1kg
  if (productLower.includes("barlo dec. chocol bitter bukle")) {
    return { grams: 1000, unit: "gram" };
  }

  // Special case for KREP KIRIGI 750 GR X 8 AD - should be 750*8 grams
  if (
    productLower.includes("krep kirigi") &&
    productLower.match(/750\s*gr\s*x\s*8\s*ad/i)
  ) {
    return { grams: 750 * 8, unit: "gram" };
  }

  // Special case for LABNE with comma decimal format (e.g., 2,750 KG)
  const labneMatch =
    productLower.includes("labne") && productLower.match(/(\d+),(\d+)\s*kg/i);
  if (labneMatch && labneMatch[1] && labneMatch[2]) {
    const kilograms =
      parseInt(labneMatch[1]) + parseFloat(`0.${labneMatch[2]}`);
    return { grams: kilograms * 1000, unit: "gram" };
  }

  // Handle liquid measurements specifically for MONIN products

  // Match for 700 ML syrups (density approx 1.3 g/mL)
  if (productLower.includes("monin") && productLower.match(/700\s*ml/i)) {
    // Check product type to apply appropriate density factor
    if (productLower.includes("surup") || productLower.includes("syrup")) {
      // Syrup with density ~1.35 g/mL
      return { grams: 700 * 1.35, unit: "gram" };
    }
    // Default case for other 700ml products
    return { grams: 700 * 1.3, unit: "gram" };
  }

  // Match for chocolate sauce in 1.89LT (density approx 1.35 g/mL)
  if (
    productLower.includes("monin") &&
    (productLower.includes("cikolata sos") ||
      productLower.includes("chocolate sauce")) &&
    productLower.match(/1[.,]89\s*lt/i)
  ) {
    // Convert liters to milliliters and apply density factor
    return { grams: 1890 * 1.35, unit: "gram" };
  }

  // Match for passion fruit purée in 1LT (density approx 1.1 g/mL)
  if (
    productLower.includes("monin") &&
    (productLower.includes("carkifelek") || productLower.includes("passion")) &&
    productLower.includes("pure") &&
    productLower.match(/1\s*lt/i)
  ) {
    // Convert liters to milliliters and apply density factor
    return { grams: 1000 * 1.1, unit: "gram" };
  }

  // Generic pattern for milliliter measurements (use default density of 1.3 g/mL for syrups/sauces)
  const mlMatch = productLower.match(/(\d+(?:\.\d+)?)\s*ml/i);
  if (mlMatch && mlMatch[1]) {
    const milliliters = parseFloat(mlMatch[1]);
    // Use appropriate density based on product type
    let densityFactor = 1.0; // Default: water density

    if (
      productLower.includes("surup") ||
      productLower.includes("syrup") ||
      productLower.includes("sirup")
    ) {
      densityFactor = 1.35; // Typical syrup density
    } else if (productLower.includes("sos") || productLower.includes("sauce")) {
      densityFactor = 1.35; // Chocolate sauce density
    } else if (productLower.includes("pure") || productLower.includes("püre")) {
      densityFactor = 1.1; // Fruit purée density
    }

    return { grams: milliliters * densityFactor, unit: "gram" };
  }

  // Generic pattern for liter measurements
  const ltMatch = productLower.match(/(\d+(?:[.,]\d+)?)\s*lt/i);
  if (ltMatch && ltMatch[1]) {
    // Convert comma decimal separator to dot if needed
    const liters = parseFloat(ltMatch[1].replace(",", "."));
    // Convert to milliliters
    const milliliters = liters * 1000;

    // Use appropriate density based on product type
    let densityFactor = 1.0; // Default: water density

    if (
      productLower.includes("surup") ||
      productLower.includes("syrup") ||
      productLower.includes("sirup")
    ) {
      densityFactor = 1.35; // Typical syrup density
    } else if (productLower.includes("sos") || productLower.includes("sauce")) {
      densityFactor = 1.35; // Chocolate sauce density
    } else if (productLower.includes("pure") || productLower.includes("püre")) {
      densityFactor = 1.1; // Fruit purée density
    }

    return { grams: milliliters * densityFactor, unit: "gram" };
  }

  // Generic pattern for comma-decimal format in kg (e.g., "2,5 KG")
  const commaDecimalMatch = productLower.match(/(\d+),(\d+)\s*kg/i);
  if (commaDecimalMatch && commaDecimalMatch[1] && commaDecimalMatch[2]) {
    const kilograms =
      parseInt(commaDecimalMatch[1]) + parseFloat(`0.${commaDecimalMatch[2]}`);
    return { grams: kilograms * 1000, unit: "gram" };
  }

  // Find patterns like "250gr x 30ad" anywhere in the string
  const gramsTimesUnitsMatch = productLower.match(
    /(\d+)\s*gr\s*x\s*(\d+)\s*ad/i
  );
  if (
    gramsTimesUnitsMatch &&
    gramsTimesUnitsMatch[1] &&
    gramsTimesUnitsMatch[2]
  ) {
    const gramsPerUnit = parseInt(gramsTimesUnitsMatch[1], 10);
    const units = parseInt(gramsTimesUnitsMatch[2], 10);
    return { grams: gramsPerUnit * units, unit: "gram" };
  }

  // Match for formats like "X GR/AD" which indicates X grams per item
  const gramsPerItemMatch = productLower.match(/(\d+)\s*gr\/ad/i);
  if (gramsPerItemMatch && gramsPerItemMatch[1]) {
    const gramsPerItem = parseInt(gramsPerItemMatch[1], 10);
    return { grams: gramsPerItem * amount, unit: "gram" };
  }

  // Check if this is a kuruvasan/kruvasan product
  if (itemCountProducts.some((product) => productLower.includes(product))) {
    console.log(`[Debug Kruvasan] Processing: ${productName}`); // Log original name
    // Special case for kruvasan with quantity in name (e.g., X 12 AD format)
    let countPerPackage = 1; // Default
    const xAdPattern = /x\s*(\d+)\s*ad/i;
    const adPattern = /(\d+)\s*ad/i;
    const match =
      productLower.match(xAdPattern) || productLower.match(adPattern);

    if (match && match[1]) {
      countPerPackage = parseInt(match[1], 10);
    }

    // Apply specific known counts (moved from HAVIDataViewer)
    const lowerProductNameTR = productName.toLocaleLowerCase("tr-TR");
    console.log(
      `[Debug Kruvasan] Comparing lower TR name: ${lowerProductNameTR}`
    ); // Log name used for comparison

    // More robust matching: Check for both keywords
    const isSade =
      lowerProductNameTR.includes("kruvasan") &&
      lowerProductNameTR.includes("sade");
    const isUcpeynirli =
      (lowerProductNameTR.includes("kruvasan") ||
        lowerProductNameTR.includes("kuruvasan")) &&
      (lowerProductNameTR.includes("üç peynirli") ||
        lowerProductNameTR.includes("uc peynirli"));

    if (isSade) {
      // Known to be 17 per package based on common usage
      console.log("[Debug Kruvasan] Matched SADE");
      countPerPackage = 17;
    } else if (isUcpeynirli) {
      // Known to be 18 per package based on common usage
      console.log("[Debug Kruvasan] Matched ÜÇ PEYNİRLİ");
      countPerPackage = 18;
    }
    console.log(
      `[Debug Kruvasan] Final count/pkg: ${countPerPackage}, Unit: adet`
    ); // Log result

    // Return count per package in 'grams', unit is 'adet'
    return { grams: countPerPackage, unit: "adet" };
  }

  // Look for patterns like "1 KG", "500 GR", "10kg", etc.
  const kgMatch = productLower.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  const grMatch = productLower.match(/(\d+(?:\.\d+)?)\s*gr\b/i);

  // Check for "X Y GR" patterns where X is quantity and Y is grams per unit
  const grPerUnitMatch = productLower.match(/(\d+)\s*gr\s*x\s*(\d+)\s*ad/i);
  if (grPerUnitMatch && grPerUnitMatch[1] && grPerUnitMatch[2]) {
    const gramsPerUnit = parseInt(grPerUnitMatch[1], 10);
    const units = parseInt(grPerUnitMatch[2], 10);
    return { grams: gramsPerUnit * units, unit: "gram" };
  }

  // Check for numbers at the end of product names (likely kg for chocolate)
  const endNumberMatch = productName.match(/\s(\d+)$/);

  if (kgMatch && kgMatch[1]) {
    // Convert kg to grams
    return { grams: parseFloat(kgMatch[1]) * 1000, unit: "gram" };
  } else if (grMatch && grMatch[1]) {
    // Already in grams
    return { grams: parseFloat(grMatch[1]), unit: "gram" };
  } else if (endNumberMatch && endNumberMatch[1]) {
    const num = parseInt(endNumberMatch[1], 10);

    // Check if this is likely a chocolate/coffee product with kg indication
    const isChocolateProduct =
      productLower.includes("kuvertur") ||
      productLower.includes("çikolata") ||
      productLower.includes("cikolata") ||
      productLower.includes("callebout") ||
      productLower.includes("barlo");

    const isCoffeeProduct =
      productLower.includes("kahve") ||
      productLower.includes("espresso") ||
      productLower.includes("cekirdek");

    const isNutProduct =
      productLower.includes("antep fistik") ||
      productLower.includes("antep fıstık") ||
      productLower.includes("badem") ||
      productLower.includes("findik") ||
      productLower.includes("fındık");

    if (isChocolateProduct || isCoffeeProduct || isNutProduct) {
      // Chocolate and coffee products with trailing numbers are in kg
      return { grams: num * 1000, unit: "gram" };
    } else if (num <= 100) {
      // For small numbers, assume it's a percentage or count
      return { grams: num, unit: "gram" };
    } else {
      // For larger numbers, assume it's in grams
      return { grams: num, unit: "gram" };
    }
  }

  // For coffee products - often in kg by default
  const isCoffeeProduct =
    productLower.includes("kahve") ||
    productLower.includes("espresso") ||
    productLower.includes("cekirdek");

  if (isCoffeeProduct) {
    // Assume coffee is usually sold by kg
    return { grams: amount * 1000, unit: "gram" };
  }

  // Special default case for MONIN products (likely to be syrups or sauces)
  if (productLower.includes("monin")) {
    // If we detected MONIN but didn't match any volume pattern above,
    // default to a standard 700ml bottle with syrup density
    return { grams: 700 * 1.35, unit: "gram" };
  }

  // Default case
  return { grams: amount, unit: "gram" };
}

// Clean product name based on mapping rules
function cleanProductName(dirtyName: string): string {
  // Convert to lowercase for consistent matching
  const lowerDirtyName = dirtyName.toLowerCase();

  // Try to find a match in our mapping dictionary
  for (const [dirty, clean] of Object.entries(resourceNameMapping)) {
    if (lowerDirtyName.includes(dirty.toLowerCase())) {
      return clean;
    }
  }

  // If no match found, return the original but with better formatting
  // Remove weight information
  const cleanedName = dirtyName
    .replace(/\d+\s*kg\b/i, "")
    .replace(/\d+\s*gr\b/i, "")
    .replace(/\s+\d+$/, "")
    .trim();

  // Convert to uppercase for consistency
  return cleanedName.toUpperCase();
}

// New interface that matches the Analysis component's expected format
export interface HAVIEntryForAnalysis {
  invoiceDate: string;
  branch: string;
  cleanResourceName: string;
  totalAmount: number;
  unit: string;
  amount: number;
}

// Main function to process HAVI data from Excel
export function processHAVIData(data: ExcelRow[]): HAVIEntryForAnalysis[] {
  const rawProcessedData: EnhancedHAVIEntry[] = [];

  console.log("Starting processHAVIData with rows:", data.length);
  console.log(
    "Sample first row:",
    data.length > 0 ? JSON.stringify(data[0]) : "No data"
  );

  // Skip the header row (if there is one)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Get the columns we need based on specific column names from the user's Excel file
    const invoiceDateRaw = row["invoice date"]; // Column B
    const custDesc = row["cust-desc"]; // Column D
    const adfcDesc = row["adfc-desc"]; // Column K
    const amount = row["Faturadaki Miktar"]; // Column L

    if (!adfcDesc) {
      continue; // Skip rows without product name
    }

    // Convert to string and check if this product should be included (exists in our mapping)
    const productNameStr = String(adfcDesc);
    const lowerProductName = productNameStr.toLowerCase();
    let shouldInclude = false;

    // Check if this product is in our mapping dictionary or has a partial match
    for (const dirtyName of Object.keys(resourceNameMapping)) {
      if (lowerProductName.includes(dirtyName.toLowerCase())) {
        shouldInclude = true;
        break;
      }
    }

    // Skip products not in our mapping
    if (!shouldInclude) {
      continue;
    }

    // Format the invoice date
    let invoiceDate = "";
    if (invoiceDateRaw) {
      if (invoiceDateRaw instanceof Date) {
        invoiceDate = invoiceDateRaw.toISOString().split("T")[0];
      } else if (typeof invoiceDateRaw === "number") {
        invoiceDate = excelDateToString(invoiceDateRaw);
      } else {
        invoiceDate = String(invoiceDateRaw);
      }
    }

    // Clean up the branch name
    const branch = custDesc
      ? String(custDesc)
          .replace(/^CHL\s*/i, "")
          .trim()
      : "Unknown";

    // Extract grams and determine unit
    const amountValue =
      typeof amount === "number"
        ? amount
        : parseFloat(String(amount || 0).replace(/,/g, ".")) || 0;
    const { grams, unit } = extractGramsFromProductName(
      productNameStr,
      amountValue
    );

    // Ensure unit is 'gr' if it was extracted as 'gram'
    const standardizedUnit = unit.toLowerCase() === "gram" ? "gr" : unit;

    // Clean the product name
    const cleanResourceName = cleanProductName(productNameStr);

    // Calculate total amount
    // For 'adet' items, totalAmount is the total count (amount * grams where grams is count/package)
    // For 'gr' items, totalAmount is total grams (amount * grams where grams is grams/package)
    let totalAmount: number;
    if (standardizedUnit === "adet") {
      // grams here represents items per package, amountValue is number of packages
      totalAmount = amountValue * grams;
    } else {
      // grams here represents grams per package, amountValue is number of packages
      totalAmount = amountValue * grams;
    }

    // Add the processed entry
    rawProcessedData.push({
      invoiceDate,
      branch,
      dirtyResourceName: productNameStr,
      cleanResourceName,
      amount: amountValue,
      grams, // Keep original grams (count/package or grams/package)
      unit: standardizedUnit, // Use standardized unit
      totalAmount, // Use calculated total amount (total count or total grams)
    });
  }

  console.log(`Processed ${rawProcessedData.length} entries from HAVI data`);

  // Transform the raw processed data to match the Analysis component's expected format
  const processedData: HAVIEntryForAnalysis[] = rawProcessedData.map(
    (item) => ({
      invoiceDate: item.invoiceDate,
      branch: item.branch,
      cleanResourceName: item.cleanResourceName,
      totalAmount: item.totalAmount, // This should be total grams or total count
      unit: item.unit, // Should be 'gr' or 'adet'
      amount: item.amount, // Original amount from invoice (e.g., number of packages)
    })
  );

  return processedData;
}

// Function to aggregate entries by date, branch, and clean resource name
export function aggregateHAVIData(
  data: EnhancedHAVIEntry[]
): EnhancedHAVIEntry[] {
  const aggregated = new Map<string, EnhancedHAVIEntry>();

  data.forEach((entry) => {
    // Create a unique key for each combination
    const key = `${entry.invoiceDate}|${entry.branch}|${entry.cleanResourceName}|${entry.unit}`;

    if (aggregated.has(key)) {
      // Update existing entry
      const existing = aggregated.get(key)!;
      existing.amount += entry.amount;
      existing.grams += entry.grams;
      existing.totalAmount += entry.totalAmount;
    } else {
      // Create a new aggregated entry
      aggregated.set(key, { ...entry });
    }
  });

  // Convert map back to array
  return Array.from(aggregated.values());
}

// Updating the existing cleanHAVIReport function to use the new approach
// but maintain backward compatibility
export function cleanHAVIReport(
  data: ExcelRow[],
  columns: {
    invoiceDateColumn: string | null;
    custDescColumn: string | null;
    adfcDescColumn: string | null;
    amountColumn: string | null;
    invoiceNrColumn: string | null;
  }
): HAVIEntry[] {
  console.log("cleanHAVIReport called with new simpler implementation");
  console.log("Using columns:", columns);

  try {
    // First try to process with the simplified approach
    const newProcessedData = processHAVIData(data);
    console.log(
      `Processed ${newProcessedData.length} entries with new approach`
    );

    // Convert to the old format for backward compatibility
    return newProcessedData.map((entry) => ({
      invoiceDate: entry.invoiceDate,
      branch: entry.branch,
      resource: entry.cleanResourceName,
      grams: entry.totalAmount,
      unit: entry.unit,
      orderCount: 1,
    }));
  } catch (error) {
    console.error("Error in simplified HAVI processing:", error);

    // Fall back to a basic conversion if needed
    const basicProcessed: HAVIEntry[] = [];

    data.forEach((row, index) => {
      if (index === 0) return; // Skip header row

      try {
        // Get product name from adfc-desc (column K)
        const productName = row["adfc-desc"] ? String(row["adfc-desc"]) : "";
        if (!productName) return;

        // Check if this is a resource we want to include
        const shouldInclude = Object.keys(resourceNameMapping).some((key) =>
          productName.toLowerCase().includes(key.toLowerCase())
        );

        if (!shouldInclude) return;

        // Get other fields
        const invoiceDate = row["invoice date"]
          ? String(row["invoice date"])
          : "";
        const branch = row["cust-desc"]
          ? String(row["cust-desc"])
              .replace(/^CHL\s*/i, "")
              .trim()
          : "Unknown";
        const amount = row["Faturadaki Miktar"]
          ? typeof row["Faturadaki Miktar"] === "number"
            ? row["Faturadaki Miktar"]
            : parseFloat(String(row["Faturadaki Miktar"]).replace(/,/g, ".")) ||
              0
          : 0;

        // Clean product name
        const cleanName = cleanProductName(productName);

        // Basic fallback calculation (may not be accurate for 'adet')
        const { grams: extractedGrams, unit: extractedUnit } =
          extractGramsFromProductName(productName, amount);
        const standardizedUnit =
          extractedUnit.toLowerCase() === "gram" ? "gr" : extractedUnit;
        let fallbackTotalAmount = amount * extractedGrams;
        if (standardizedUnit === "adet") {
          // If adet, the 'grams' field holds count per package, so total is amount * count/package
          fallbackTotalAmount = amount * extractedGrams;
        }

        basicProcessed.push({
          invoiceDate,
          branch,
          resource: cleanName,
          grams: fallbackTotalAmount, // Use calculated total amount
          unit: standardizedUnit, // Use standardized unit
          orderCount: 1,
        });
      } catch (rowError) {
        console.error(`Error processing row ${index}:`, rowError);
      }
    });

    console.log(
      `Fallback processing complete with ${basicProcessed.length} entries`
    );
    return basicProcessed;
  }
}

// Kept for backward compatibility
export function processTransactions(data: HAVIEntry[]): HAVIEntry[] {
  // Group by date, branch, resource, unit
  const transactionMap = new Map<string, HAVIEntry>();

  data.forEach((entry) => {
    const key = `${entry.invoiceDate}|${entry.branch}|${entry.resource}|${entry.unit}`;

    if (transactionMap.has(key)) {
      // Update existing entry
      const existingEntry = transactionMap.get(key)!;
      existingEntry.grams += entry.grams;
      existingEntry.orderCount += 1;
    } else {
      // Create new entry
      transactionMap.set(key, { ...entry });
    }
  });

  // Convert map to array
  return Array.from(transactionMap.values());
}

// Kept for backward compatibility
export function generateSummary(data: HAVIEntry[]) {
  const summary: Record<
    string,
    Record<
      string,
      Record<string, { grams: number; orderCount: number; unit: string }>
    >
  > = {};

  // Group data by branch, resource, and date
  data.forEach((entry) => {
    if (!summary[entry.branch]) {
      summary[entry.branch] = {};
    }

    if (!summary[entry.branch][entry.resource]) {
      summary[entry.branch][entry.resource] = {};
    }

    if (!summary[entry.branch][entry.resource][entry.invoiceDate]) {
      summary[entry.branch][entry.resource][entry.invoiceDate] = {
        grams: 0,
        orderCount: 0,
        unit: entry.unit,
      };
    }

    summary[entry.branch][entry.resource][entry.invoiceDate].grams +=
      entry.grams;
    summary[entry.branch][entry.resource][entry.invoiceDate].orderCount +=
      entry.orderCount;
  });

  // Convert the nested summary to a flat array for the output sheet
  const flatSummary = [];

  for (const branch in summary) {
    for (const resource in summary[branch]) {
      for (const date in summary[branch][resource]) {
        flatSummary.push({
          Branch: branch,
          Resource: resource,
          Date: date,
          Grams: summary[branch][resource][date].grams,
          Unit: summary[branch][resource][date].unit,
          OrderCount: summary[branch][resource][date].orderCount,
        });
      }
    }
  }

  return flatSummary;
}
