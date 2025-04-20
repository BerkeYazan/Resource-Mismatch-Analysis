import * as XLSX from "xlsx";

// Interface for the processed AktifPOS entry
interface AktifPOSEntry {
  date: string;
  branch: string;
  product: string;
  amount: number;
}

// Interface for Excel rows
interface ExcelRow {
  [key: string]: string | number | Date | boolean | undefined;
}

// Interface that matches what Analysis component expects
export interface AktifPOSEntryForAnalysis {
  date: string;
  branch: string;
  product: string;
  amount: number;
}

// Product name standardization mapping
const productNameMapping: Record<string, string> = {
  "YEŞİL ELMALI LİMONATA": "YEŞİL ELMALI LİMONATA",
  "YER FISTIKLI MAZE": "YER FISTIKLI MAZE",
  "YER FISTIKLI": "YER FISTIKLI",
  "XL PAKET CHOCOLABS SARMA": "SARMA ÇİFT KİŞİLİK",
  "XL CHOCOLABS SARMA": "SARMA ÇİFT KİŞİLİK",
  "WHITE MOCHA": "WHITE MOCHA",
  "WHITE FRAPPE": "WHITE FRAPPE",
  WAFFLE: "WAFFLE",
  "ÜÇ PEYNİRLİ KRUVASAN": "ÜÇ PEYNİRLİ KRUVASAN",
  "TÜRK KAHVESİ": "TÜRK KAHVESİ",
  TRİFLE: "TRİFLE",
  "TOFFY NUT LATTE": "TOFFEE NUT LATTE",
  "ŞEFTALİ,GREYFURT,CHİA TOHUMLU SOĞUK ÇAY": "ŞEF.GR.CH.TOH.ÇAY",
  SUMATRA: "SUMATRA",
  SUFLE: "SUFLE",
  "STRAWBERRY MOCHA": "STRAWBERRY MOCHA",
  "SOĞUK CHAİ TEA LATTE": "SOĞUK CHAİ TEA LATTE",
  "SİYAH SICAK ÇİKOLATA": "SİYAH SICAK ÇİKOLATA",
  SAHLEP: "SAHLEP",
  "SADE FİLTRE KAHVE": "FİLTRE KAHVE SADE",
  "PORSİYON DONDURMA": "PORSİYON DONDURMA",
  PLATONİK: "PLATONİK",
  "PİNK BUBBLE": "PINK BUBBLE",
  "PAKET YER FISTIKLI": "YER FISTIKLI",
  "PAKET WAFFLE": "WAFFLE",
  "PAKET TRİFLE": "TRİFLE",
  "PAKET NEFİN": "NEFİN",
  "PAKET MELANKOLİK": "MELANKOLİK",
  "PAKET MEFTUN": "MEFTUN",
  "PAKET MAŞUK": "MAŞUK",
  "PAKET DİVANE": "DİVANE",
  "PAKET CHOCOLABS SARMA": "SARMA TEK KİŞİLİK",
  "PAKET ANTEP FISTIKLI": "ANTEP FISTIKLI",
  NEFİN: "NEFİN",
  "NARLI,NANELİ SOĞUK ÇAY": "NARLI.NANE.ÇAY",
  "MUZLU,MAYDONOZLU LİMONATA": "MUZLU MAYDONOZLU LİMONATA",
  "MUFFİN REDVELVET": "RED VELVET MUFFIN",
  "MUFFİN KARAMEL": "KARAMELLİ MUFFIN",
  "MUFFİN ÇİKOLATALI": "ÇİKOLATALI MUFFIN",
  "MİNİ MAŞUK": "MİNİ MAŞUK",
  "MİLKSHAKE VANİLYA": "VANİLYALI MİLKSHAKE",
  "MİLKSHAKE MUZ": "MUZLU MİLKSHAKE",
  "MİLKSHAKE ÇİLEK": "ÇİLEKLİ MİLKSHAKE",
  "MİLKSHAKE ÇİKOLATA": "ÇİKOLATALI MİLKSHAKE",
  "MİLKSHAKE COOKİE": "COOKİE MİLKSHAKE",
  MEYVELİ: "MEYVELİ",
  MELANKOLİK: "MELANKOLİK",
  MEFTUN: "MEFTUN",
  MAŞUK: "MAŞUK",
  "MANGO SOĞUK ÇAY": "MANGO SOĞUK ÇAY",
  "LOTUS CHEESECAKE": "LOTUSLU CHEESECAKE",
  "LİMONLU CHEESECAKE": "LİMONLU CHEESECAKE",
  LİMONATA: "LİMONATA",
  "LATTE MACHİATO": "LATTE MACCHİATO",
  "KRUVASAN SADE": "KRUVASAN SADE",
  "KRUVASAN ÇİKOLATALI": "KRUVASAN ÇİKOLATALI",
  KENIA: "KENYA",
  "KARPUZLU SOĞUK ÇAY": "KARPUZ SOĞUK ÇAY",
  "KARPUZ NANE LİMONATA": "KARPUZLU LİMONATA",
  KARAMELLİ: "KARAMELLİ",
  "ICED WHITE MOCHA": "ICE WHİTE MOCHA",
  "ICED LATTE": "ICE LATTE",
  "ICED DARK MOCHA": "ICE DARK MOCHA",
  "ICED CAPUCCİNO": "ICE CAPPUCCINO",
  "ICED AMERİCANO": "ICE AMERİCANO",
  "HOT MONKEY": "HOT MONKEY",
  HAZELNUT: "HAZELNUT",
  "FRESH LİME": "FRESH LIME",
  "FRAMBUAZLI MAZE": "FRAMBUAZLI MAZE",
  "FRAMBUAZLI CHEESECAKE": "FRAMBUAZLI CHEESECAKE",
  "FLAT WHİTE": "FLAT WHİTE",
  ETHIOPIA: "ETHIOPIA",
  "ESPRESSO MACHİATO": "ESPRESSO MACCHİATO",
  ESPRESSO: "ESPRESSO",
  "EKSTRA YARIM POT ÇİKOLATA": "YARIM POT ÇİKOLATA",
  "EKSTRA ŞANTİ": "EXT ŞANTİ",
  "EKSTRA BİR POT ÇİKOLATA": "BİR POT ÇİKOLATA",
  "DOUBLE TÜRK KAHVESİ": "DOUBLE TÜRK KAHVESİ",
  "DOUBLE ESPRESSO": "DOUBLE ESPRESSO",
  DONDURMA: "TOP DONDURMA",
  DİVANE: "DİVANE",
  "DİBEK KAHVESİ": "DİBEK KAHVESİ",
  "DARK MOCHA": "DARK MOCHA",
  "DARK FRAPPE": "DARK FRAPPE",
  "DAMLA SAKIZLI TÜRK KAHVESİ": "DAMLA SAKIZLI TÜRK KAHVESİ",
  "ÇİLEKLİ LİMONATA": "ÇİLEKLİ LİMONATA",
  "ÇİKOLATALI CHEESECAKE": "ÇİKOLATALI CHEESECAKE",
  ÇİKOLATALI: "ÇİKOLATALI",
  ÇAY: "DOĞUŞ ÇAY",
  "ÇARKIFELEK MEYVELİ,NANELİ LİMONATA": "ÇARKIFELEK LİMONATA",
  "COSTA RICA": "COSTARİCA",
  CORTADO: "CORTADO",
  "COOKİE YER FISTIKLI": "YER FISTIKLI COOKIE",
  "COOKİE SADE": "SADE COOKIE",
  "COOKİE REDVELVET": "RED COOKIE",
  "COOKİE ÇİKOLATALI": "ÇİKOLATALI COOKIE",
  COLOMBİA: "COLOMBİA",
  "CHOCOLATE RASPBERRY": "CHOCOLATE RASPBERRY",
  "CHOCOLABS SARMA": "SARMA TEK KİŞİLİK",
  "CHOCOLABS PASTA 8 KİŞİLİK": "8 KİŞİLİK PASTA",
  "CHOCOLABS PASTA 4 KİŞİLİK": "4 KİŞİLİK PASTA",
  "CHOCOLABS KRUVASAN": "CHOCOLABS KRUVASAN",
  "CHAI TEA LATTE": "CHAI TEA LATTE",
  CAPPUCCİNO: "CAPPUCCİNO",
  "CAFE LATTE": "LATTE",
  "BUBBLE MANGO": "BUBBLE MANGO",
  "BUBBLE KARPUZ": "BUBBLE KARPUZ",
  "BUBBLE ELMA": "BUBBLE ELMA",
  "BÖĞÜRTLEN LİMONATA": "BÖĞÜRTLEN LİMONATA",
  "BLUEBERRY BUBBLE LEMONATE": "BLUEBERRY BUBBLE LİMONATA",
  "BLUE BUBBLE": "BLUE BUBBLE",
  "BEYAZ SICAK ÇİKOLATA": "BEYAZ SICAK ÇİKOLATA",
  "BEYAZ ÇİKOLATALI,PORTAKALLI MOCHA": "BEY.ÇİK.PORT.MOCHA",
  "BANANA MOCHA": "BANANA MOCHA",
  "BAHARATLI LİMONATA": "BAHARATLI LİMONATA",
  ATEŞPARE: "ATEŞPARE",
  "AROMALI LATTE": "AROMALI LATTE",
  "ANTEP FISTIKLI MAZE": "ANTEP FISTIKLI MAZE",
  "ANTEP FISTIKLI": "ANTEP FISTIKLI",
  AMERİCANO: "AMERİCANO",
  AFFOGATO: "AFFOGATO",
  "BERGAMOTLU ÇAY": "DOĞUŞ ÇAY",
  "FİNCAN ÇAY": "DOĞUŞ ÇAY",
  "ISLAK KEK": "KAKAOLU KEK-MIX",
  "KAKAOLU KEK-MIX": "KAKAOLU KEK-MIX",
  "KAKAOLU KEK-MİX": "KAKAOLU KEK-MIX",
};

/**
 * Function to normalize a product name according to rules
 */
function normalizeProductName(rawName: string): string {
  // Convert to uppercase for consistency
  const upperName = rawName.toUpperCase();

  // Remove PAKET prefix and extra spaces
  const cleanedName = upperName
    .replace(/^PAKET\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

  // Special case for CHOCOLABS SARMA
  if (cleanedName === "CHOCOLABS SARMA") {
    return "SARMA TEK KİŞİLİK";
  }

  if (
    cleanedName === "XL CHOCOLABS SARMA" ||
    cleanedName === "XL PAKET CHOCOLABS SARMA"
  ) {
    return "SARMA ÇİFT KİŞİLİK";
  }

  // Check if the name exists in our mapping
  if (productNameMapping[cleanedName]) {
    return productNameMapping[cleanedName];
  }

  // As a fallback, try to find partial matches
  for (const [key, value] of Object.entries(productNameMapping)) {
    if (cleanedName.includes(key)) {
      return value;
    }
  }

  // Return the cleaned name if no mapping found
  return cleanedName;
}

/**
 * Extract date range from file content or filename
 */
export function extractDateRange(
  worksheet: XLSX.WorkSheet | null = null,
  fileName: string = ""
): { startDate: Date | null; endDate: Date | null } {
  try {
    // First try to extract from worksheet (cell A1)
    if (worksheet) {
      const cellA1 = worksheet["A1"];
      if (cellA1 && cellA1.v) {
        // Check if A1 contains date information
        const cellValue = String(cellA1.v);
        console.log(`Found potential date range string: ${cellValue}`);

        // Try to extract date range using regex
        const dateRangeRegex =
          /(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*[-—]\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})/;
        const dateRangeMatch = cellValue.match(dateRangeRegex);

        if (dateRangeMatch) {
          try {
            // Extract date components - this handling depends on the format
            // Format: DD.MM.YYYY - DD.MM.YYYY (European format)
            const startDateStr = `${dateRangeMatch[1]}.${dateRangeMatch[2]}.${dateRangeMatch[3]}`;
            const endDateStr = `${dateRangeMatch[4]}.${dateRangeMatch[5]}.${dateRangeMatch[6]}`;

            console.log(
              `Parsed date range using DD.MM.YYYY format: {startDateStr: '${startDateStr}', endDateStr: '${endDateStr}'}`
            );

            // Convert to JavaScript Date objects
            const startDay = parseInt(dateRangeMatch[1], 10);
            const startMonth = parseInt(dateRangeMatch[2], 10) - 1; // JS months are 0-indexed
            const startYear = parseInt(dateRangeMatch[3], 10);

            const endDay = parseInt(dateRangeMatch[4], 10);
            const endMonth = parseInt(dateRangeMatch[5], 10) - 1; // JS months are 0-indexed
            const endYear = parseInt(dateRangeMatch[6], 10);

            // Create date objects
            const startDate = new Date(startYear, startMonth, startDay);
            const endDate = new Date(endYear, endMonth, endDay);

            // Ensure the dates are valid
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              // Convert to ISO format string for consistent comparison
              console.log(
                `Extracted date range: {startDate: '${
                  startDate.toISOString().split("T")[0]
                }', endDate: '${endDate.toISOString().split("T")[0]}'}`
              );
              return { startDate, endDate };
            }
          } catch (error) {
            console.error("Error parsing dates from cell value:", error);
          }
        }
      }
    }

    // If worksheet extraction failed, try to extract from filename
    if (fileName) {
      // Example: Try to find date patterns in the filename
      // e.g. "AktifPOS 01.01.2025-31.01.2025.xls"
      const fileNameDateRangeRegex =
        /(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*[-—]\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})/;
      const fileNameMatch = fileName.match(fileNameDateRangeRegex);

      if (fileNameMatch) {
        try {
          const startDateStr = `${fileNameMatch[1]}.${fileNameMatch[2]}.${fileNameMatch[3]}`;
          const endDateStr = `${fileNameMatch[4]}.${fileNameMatch[5]}.${fileNameMatch[6]}`;

          console.log(
            `Extracted date range from filename: {startDateStr: '${startDateStr}', endDateStr: '${endDateStr}'}`
          );

          // Convert to JavaScript Date objects
          const startDay = parseInt(fileNameMatch[1], 10);
          const startMonth = parseInt(fileNameMatch[2], 10) - 1; // JS months are 0-indexed
          const startYear = parseInt(fileNameMatch[3], 10);

          const endDay = parseInt(fileNameMatch[4], 10);
          const endMonth = parseInt(fileNameMatch[5], 10) - 1; // JS months are 0-indexed
          const endYear = parseInt(fileNameMatch[6], 10);

          // Create date objects
          const startDate = new Date(startYear, startMonth, startDay);
          const endDate = new Date(endYear, endMonth, endDay);

          // Ensure the dates are valid
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            return { startDate, endDate };
          }
        } catch (error) {
          console.error("Error parsing dates from filename:", error);
        }
      }
    }

    // If all else fails, use the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    console.log("Using default current month date range");
    return { startDate: startOfMonth, endDate: endOfMonth };
  } catch (error) {
    console.error("Error in extractDateRange:", error);
    return { startDate: null, endDate: null };
  }
}

/**
 * Process AktifPOS data into a standardized format
 */
function parseAktifPOSData(
  data: ExcelRow[],
  columns: {
    branchColumn: string | null;
    productColumn: string | null;
    amountColumn: string | null;
  },
  dateRange: { startDate: Date | null; endDate: Date | null }
): AktifPOSEntry[] {
  if (
    !columns.branchColumn ||
    !columns.productColumn ||
    !columns.amountColumn
  ) {
    console.error("Missing required columns for processing AktifPOS data");
    return [];
  }

  // For AktifPOS data we'll use the date range from the document
  let startDate = "";
  let endDate = "";

  try {
    startDate = dateRange.startDate
      ? dateRange.startDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    endDate = dateRange.endDate
      ? dateRange.endDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
  } catch (dateError) {
    console.error("Error formatting date range:", dateError);
    // Fallback to today
    const today = new Date().toISOString().split("T")[0];
    startDate = today;
    endDate = today;
  }

  console.log(`Using date range: ${startDate} to ${endDate} for AktifPOS data`);

  const processedData: AktifPOSEntry[] = [];
  const stats = {
    totalRows: 0,
    processedRows: 0,
    skippedRows: 0,
    normalizedProducts: 0,
  };

  // Skip the first row which contains the headers
  const dataToProcess = data.slice(1);

  dataToProcess.forEach((row) => {
    stats.totalRows++;

    // Skip header rows or empty rows
    if (!row[columns.productColumn!] || !row[columns.branchColumn!]) {
      stats.skippedRows++;
      return;
    }

    // Extract branch name
    const rawBranch = String(row[columns.branchColumn!]).trim();

    // Clean up branch name (remove any prefixes)
    const branch = rawBranch.replace(/^CHL\s*/i, "").trim();

    // Extract product name and normalize it
    const rawProduct = String(row[columns.productColumn!]).trim();
    const normalizedProduct = normalizeProductName(rawProduct);

    if (normalizedProduct !== rawProduct) {
      stats.normalizedProducts++;
    }

    // Extract amount
    let amount = 0;
    if (row[columns.amountColumn!] !== undefined) {
      if (typeof row[columns.amountColumn!] === "number") {
        amount = row[columns.amountColumn!] as number;
      } else {
        amount =
          parseFloat(String(row[columns.amountColumn!]).replace(/,/g, ".")) ||
          0;
      }
    }

    // Add to processed data with start date in YYYY-MM-DD format
    // This is the format expected by the Analysis component
    processedData.push({
      date: startDate, // Use the standardized ISO format date
      branch,
      product: normalizedProduct,
      amount,
    });

    stats.processedRows++;
  });

  console.log("\n===== AktifPOS Processing Report =====");
  console.log(`Total rows: ${stats.totalRows}`);
  console.log(`Processed rows: ${stats.processedRows}`);
  console.log(`Skipped rows: ${stats.skippedRows}`);
  console.log(`Normalized product names: ${stats.normalizedProducts}`);
  console.log(`Using date range: ${startDate} to ${endDate}`);
  console.log("=======================================\n");

  // Log a sample of the processed data
  if (processedData.length > 0) {
    console.log("AktifPOS sample processed data:", processedData.slice(0, 3));
  }

  return processedData;
}

/**
 * Aggregate AktifPOS data by product and branch
 */
function aggregateAktifPOSData(data: AktifPOSEntry[]): AktifPOSEntry[] {
  // Group by branch and product
  const aggregated = new Map<string, AktifPOSEntry>();

  data.forEach((entry) => {
    const key = `${entry.branch}|${entry.product}`;

    if (aggregated.has(key)) {
      // Update existing entry
      const existingEntry = aggregated.get(key)!;
      existingEntry.amount += entry.amount;
    } else {
      // Create new entry
      aggregated.set(key, { ...entry });
    }
  });

  return Array.from(aggregated.values());
}

/**
 * Main function to process AktifPOS Excel file
 */
export function processAktifPOSFile(fileBuffer: ArrayBuffer): AktifPOSEntry[] {
  try {
    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Extract date range from A1 cell
    const dateRange = extractDateRange(worksheet);
    console.log("Extracted date range:", {
      startDate: dateRange.startDate?.toISOString().split("T")[0],
      endDate: dateRange.endDate?.toISOString().split("T")[0],
    });

    // Convert sheet to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

    // Identify columns
    const columns = identifyAktifPOSColumns(rawData);

    if (
      !columns.branchColumn ||
      !columns.productColumn ||
      !columns.amountColumn
    ) {
      console.error(
        "Could not identify all required columns in the AktifPOS report"
      );
      return [];
    }

    // Process data
    const processedData = parseAktifPOSData(rawData, columns, dateRange);

    // Aggregate data
    const aggregatedData = aggregateAktifPOSData(processedData);

    console.log(
      `Processed ${rawData.length} rows into ${aggregatedData.length} unique product entries`
    );

    return aggregatedData;
  } catch (error) {
    console.error("Error processing AktifPOS file:", error);
    return [];
  }
}

/**
 * Process AktifPOS data for browser-side use
 */
export function processAktifPOSData(
  data: ExcelRow[]
): AktifPOSEntryForAnalysis[] {
  try {
    console.log("processAktifPOSData called with", data.length, "rows");
    console.log("First row sample:", data[0]);

    // Look for date range in the data
    let dateRange: { startDate: Date | null; endDate: Date | null } = {
      startDate: null,
      endDate: null,
    };

    // Search for date range in filename or title
    // Look for a file name in the data that might contain a date range
    let fileName = "";
    if (data.length > 0 && data[0]["Dosya Adı"]) {
      fileName = String(data[0]["Dosya Adı"]);
      console.log("Found file name:", fileName);

      // Try to extract date range from filename
      const dateMatch = fileName.match(
        /(\d{1,2})\.(\d{1,2})\.(\d{4})\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/
      );

      if (dateMatch) {
        try {
          const startDate = new Date(
            parseInt(dateMatch[3]), // year
            parseInt(dateMatch[2]) - 1, // month (0-indexed)
            parseInt(dateMatch[1]) // day
          );

          const endDate = new Date(
            parseInt(dateMatch[6]), // year
            parseInt(dateMatch[5]) - 1, // month (0-indexed)
            parseInt(dateMatch[4]) // day
          );

          // Validate dates
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            dateRange = { startDate, endDate };
            console.log("Extracted date range from filename:", {
              startDate: startDate.toISOString().split("T")[0],
              endDate: endDate.toISOString().split("T")[0],
            });
          } else {
            console.error("Invalid date parsed from filename");
          }
        } catch (error) {
          console.error("Error parsing date range from filename:", error);
        }
      }
    }

    // Process with the identified date range
    const columns = identifyAktifPOSColumns(data);
    console.log("Using columns:", columns);

    if (
      !columns.branchColumn ||
      !columns.productColumn ||
      !columns.amountColumn
    ) {
      console.error(
        "Could not identify all required columns in the AktifPOS data"
      );
      return [];
    }

    // Process data with the extracted date range
    const rawProcessedData = parseAktifPOSData(data, columns, dateRange);

    console.log(
      `Processed ${rawProcessedData.length} entries from AktifPOS data`
    );
    console.log("First 3 entries:", rawProcessedData.slice(0, 3));

    // Aggregate data
    const aggregatedData = aggregateAktifPOSData(rawProcessedData);

    console.log(
      `Processed ${data.length} rows into ${aggregatedData.length} unique product entries`
    );
    console.log("Aggregated data (first 3):", aggregatedData.slice(0, 3));

    // Final validation check to ensure all entries have valid date in YYYY-MM-DD format
    const transformedData: AktifPOSEntryForAnalysis[] = aggregatedData.map(
      (item) => {
        // Ensure date is in YYYY-MM-DD format
        let validDate = item.date;

        // Check if date is in valid format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(validDate)) {
          console.warn(`Invalid date format: ${validDate}, using today's date`);
          validDate = new Date().toISOString().split("T")[0];
        }

        return {
          date: validDate,
          branch: item.branch || "Unknown",
          product: item.product || "Unknown Product",
          amount: typeof item.amount === "number" ? item.amount : 0,
        };
      }
    );

    // Filter out any potentially invalid entries
    const validEntries = transformedData.filter(
      (item) =>
        item.date &&
        item.branch &&
        item.product &&
        typeof item.amount === "number"
    );

    if (validEntries.length < transformedData.length) {
      console.warn(
        `Filtered ${
          transformedData.length - validEntries.length
        } invalid entries from AktifPOS data`
      );
    }

    console.log("Final validated data (first 3):", validEntries.slice(0, 3));
    return validEntries;
  } catch (error) {
    console.error("Error processing AktifPOS data:", error);
    return [];
  }
}

/**
 * Identify the relevant columns in the AktifPOS report
 */
function identifyAktifPOSColumns(data: ExcelRow[]): {
  branchColumn: string | null;
  productColumn: string | null;
  amountColumn: string | null;
} {
  if (data.length === 0) {
    console.error("No data provided to identify AktifPOS columns");
    return {
      branchColumn: null,
      productColumn: null,
      amountColumn: null,
    };
  }

  console.log("Identifying AktifPOS columns from sample data");
  // Get the first row which should contain headers
  const headers = data[0];
  const columns = Object.keys(headers);

  console.log("Available columns:", columns);

  if (data.length > 1) {
    console.log("First data row sample:", data[1]);
  }

  let branchColumn: string | null = null;
  let productColumn: string | null = null;
  let amountColumn: string | null = null;

  // First look for exact column name matches (case insensitive)
  for (const column of columns) {
    const columnLower = column.toLowerCase();

    // Check for branch column
    if (
      columnLower === "şube" ||
      columnLower === "sube" ||
      columnLower === "branch" ||
      columnLower === "mağaza" ||
      columnLower === "magaza" ||
      columnLower.includes("şube") ||
      columnLower.includes("sube") ||
      columnLower.includes("branch") ||
      columnLower.includes("mağaza") ||
      columnLower.includes("magaza") ||
      columnLower.includes("location") ||
      columnLower.includes("store")
    ) {
      branchColumn = column;
      console.log(`Detected branch column: "${column}"`);
    }

    // Check for product column
    if (
      columnLower === "ürün" ||
      columnLower === "urun" ||
      columnLower === "product" ||
      columnLower === "ürün adı" ||
      columnLower === "urun adi" ||
      columnLower === "item" ||
      columnLower.includes("ürün") ||
      columnLower.includes("urun") ||
      columnLower.includes("product") ||
      columnLower.includes("item")
    ) {
      productColumn = column;
      console.log(`Detected product column: "${column}"`);
    }

    // Check for amount column
    if (
      columnLower === "miktar" ||
      columnLower === "adet" ||
      columnLower === "amount" ||
      columnLower === "quantity" ||
      columnLower === "qty" ||
      columnLower === "satış adedi" ||
      columnLower === "satis adedi" ||
      columnLower === "satış" ||
      columnLower === "satis" ||
      columnLower.includes("miktar") ||
      columnLower.includes("adet") ||
      columnLower.includes("amount") ||
      columnLower.includes("qty") ||
      columnLower.includes("quantity") ||
      columnLower.includes("satış") ||
      columnLower.includes("satis")
    ) {
      amountColumn = column;
      console.log(`Detected amount column: "${column}"`);
    }
  }

  // If we couldn't find columns by name, look for columns with appropriate data types
  if (!branchColumn || !productColumn || !amountColumn) {
    console.log("Trying to identify columns by data content");

    // Look at a few rows to identify patterns
    const sampleRows = data.slice(1, Math.min(10, data.length));

    // For each column, analyze content to determine what it might be
    columns.forEach((col) => {
      // Skip already identified columns
      if (
        col === branchColumn ||
        col === productColumn ||
        col === amountColumn
      ) {
        return;
      }

      // Extract values for this column
      const values = sampleRows
        .map((row) => row[col])
        .filter((val) => val !== undefined && val !== null && val !== "");

      if (values.length === 0) return; // Skip empty columns

      // Check if this could be the branch column
      if (!branchColumn) {
        // Branch columns typically have string values that might repeat
        const allStrings = values.every((val) => typeof val === "string");
        const uniqueValues = new Set(values).size;
        const couldBeBranch = allStrings && uniqueValues < values.length * 0.8; // Some repetition expected

        if (couldBeBranch) {
          branchColumn = col;
          console.log(`Identified branch column by content: "${col}"`);
          return; // Continue to next column
        }
      }

      // Check if this could be the product column
      if (!productColumn) {
        // Product columns typically have string values with less repetition
        const allStrings = values.every((val) => typeof val === "string");
        const uniqueValues = new Set(values).size;
        const couldBeProduct = allStrings && uniqueValues > values.length * 0.3; // More unique values

        if (couldBeProduct) {
          productColumn = col;
          console.log(`Identified product column by content: "${col}"`);
          return; // Continue to next column
        }
      }

      // Check if this could be the amount column
      if (!amountColumn) {
        // Amount columns typically have numeric values
        const allNumbers = values.every(
          (val) =>
            typeof val === "number" ||
            (typeof val === "string" &&
              !isNaN(parseFloat(val.toString().replace(",", "."))))
        );

        if (allNumbers) {
          amountColumn = col;
          console.log(`Identified amount column by content: "${col}"`);
          return;
        }
      }
    });
  }

  console.log("Final identified columns:", {
    branchColumn,
    productColumn,
    amountColumn,
  });

  return { branchColumn, productColumn, amountColumn };
}
