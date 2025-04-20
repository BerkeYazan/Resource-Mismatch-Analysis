import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Heading,
  Text,
  Select,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  useColorModeValue,
  useToken,
  Spinner,
  Tooltip,
  VStack,
  Card,
  CardBody,
  CardHeader,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  Spacer,
  IconButton,
  Button,
  Icon,
} from "@chakra-ui/react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import {
  DownloadIcon,
  TriangleDownIcon,
  TriangleUpIcon,
} from "@chakra-ui/icons";
import { useCurrentProjectData } from "../context/DataContext";
import { HAVIEntryForAnalysis } from "../havi-processor";
import { AktifPOSEntryForAnalysis } from "../aktifpos-processor";
import { Mercator } from "@visx/geo";
import { feature } from "topojson-client";
import type { Topology, GeometryObject } from "topojson-specification";
import type { Feature } from "geojson";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

// --- NEW Interface for Branch-Level Results ---
interface BranchLevelResult {
  branch: string;
  resource: string; // Ingredient display name
  unit: string;
  branchHaviAmount: number; // Amount received by THIS branch
  branchPosDemand: number; // Calculated POS demand for THIS branch
  difference: number; // branchHaviAmount - branchPosDemand
  differencePercent?: number;
  province?: string | null; // Add province for easier filtering
}

// --- Interface for Branch Summary ---
interface BranchSummary {
  branch: string;
  province: string | null;
  totalItemsAnalyzed: number;
  deficitCount: number;
  surplusCount: number;
  nearMatchCount: number;
  totalDeficitGr: number;
  totalSurplusGr: number;
  totalDeficitAdet: number;
  totalSurplusAdet: number;
  incomparableUnitCount: number;
}

// --- Define keys for sorting BranchLevelResult ---
type SortableBranchLevelColumn = keyof Pick<
  BranchLevelResult,
  | "branch"
  | "resource"
  | "unit"
  | "branchHaviAmount"
  | "branchPosDemand"
  | "difference"
  | "differencePercent"
>;

// --- Define keys for sorting BranchSummary ---
type SortableBranchSummaryColumn = keyof Omit<BranchSummary, "province">; // Exclude province from direct sorting

// --- Interface for Intermediate Branch Calculation ---
interface IntermediateBranchResultValue {
  branchHaviAmount: number;
  branchPosDemand: number;
  unit: string; // Combined unit
  province?: string | null;
}

// --- Revert normalizeBranchName function to use replace with /g flag ---
const normalizeBranchName = (rawName: string): string => {
  let normalized = rawName.trim(); // Start with trimmed raw name

  // Replace specific Turkish characters BEFORE converting to uppercase
  normalized = normalized
    .replace(/İ/g, "I") // Revert back to regex with /g flag
    .replace(/ı/g, "i")
    .replace(/Ğ/g, "G")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "U")
    .replace(/ü/g, "u")
    .replace(/Ş/g, "S")
    .replace(/ş/g, "s")
    .replace(/Ö/g, "O")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c");

  // Now convert to uppercase
  normalized = normalized.toUpperCase();

  // Replace common separators or extra words
  normalized = normalized
    .replace(/_/g, " ") // Use regex for global replace
    .replace(/-/g, " ") // Use regex for global replace
    .replace(/ CAFE$/, "")
    .replace(/^CHL\s*/, "")
    .replace(/\s+/g, " ");

  // Specific known variations -> Canonical Name (Using Turkish Characters for final output)
  if (normalized === "IZMIR ALSANCAK") return "İZMİR ALSANCAK";
  if (normalized === "IZMIR MAVIBAHCE") return "İZMİR MAVİBAHÇE";
  // ... add more specific mappings ...

  // Attempt to convert back to Turkish characters for common names if needed
  normalized = normalized
    .replace(/^ISTANBUL/, "İSTANBUL")
    .replace(/^IZMIR/, "İZMİR")
    .replace(/^ANKARA/, "ANKARA")
    .replace(/ CANKAYA$/, " ÇANKAYA")
    .replace(/ MAVIBAHCE$/, " MAVİBAHÇE");

  // console.log(`Normalized '${rawName}' -> '${normalized}'`); // Keep for debugging if needed
  return normalized;
};

// --- UPDATE getProvinceForBranch Logic ---
const getProvinceForBranch = (normalizedBranchName: string): string | null => {
  if (!normalizedBranchName) return null;
  const parts = normalizedBranchName.trim().split(" ");
  if (parts.length > 0 && parts[0]) {
    // Return the first word as the province, potentially uppercased for consistency
    // (Assuming normalizedBranchName is already mostly uppercase from normalizeBranchName)
    return parts[0].toUpperCase(); // Example: 'İZMİR MAVİBAHÇE' -> 'İZMİR'
  }
  console.warn(
    `Could not determine province for branch: '${normalizedBranchName}'`
  );
  return null;
};

// --- Map Component Definition Fix ---
interface TurkeyMapProps {
  selectedProvince: string | null;
  onSelectProvince: (provinceName: string | null) => void;
}

// Restore props to signature, fix component return type and logic
const TurkeyMap = ({ selectedProvince, onSelectProvince }: TurkeyMapProps) => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loadingMap, setLoadingMap] = useState(true);
  const [errorMap, setErrorMap] = useState<string | null>(null);

  // Styles
  const geoStroke = useColorModeValue("black", "whiteAlpha.600");
  const geoFill = useColorModeValue("white", "gray.700");
  const hoverFill = useColorModeValue("blue.400", "blue.300");
  const selectedFill = useColorModeValue("blue.500", "blue.400"); // Restore selected fill color
  const mapLoadingTextColor = useColorModeValue("gray.500", "gray.400");

  useEffect(() => {
    setLoadingMap(true);
    setErrorMap(null);
    fetch("/turkiye_iller.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((topology: Topology) => {
        const objectKey = Object.keys(topology.objects)[0];
        if (!objectKey || !topology.objects[objectKey]) {
          throw new Error(
            "Could not find a valid geometry object key in TopoJSON (topology.objects)"
          );
        }
        console.log(`Using TopoJSON object key: ${objectKey}`);

        const geoJsonObject = topology.objects[objectKey] as GeometryObject;

        const geoJson = feature(topology, geoJsonObject);

        if (geoJson.type === "FeatureCollection") {
          console.log("GeoJSON Feature Collection:", geoJson);
          setFeatures(geoJson.features as Feature[]);
        } else if (geoJson.type === "Feature") {
          console.warn(
            "TopoJSON resulted in a single Feature, expected FeatureCollection. Wrapping in array."
          );
          console.log("GeoJSON Single Feature:", geoJson);
          setFeatures([geoJson as Feature]);
        } else {
          throw new Error(
            "Unexpected result type from topojson-client.feature"
          );
        }
      })
      .catch((err) => {
        console.error("Error loading or processing map data:", err);
        setErrorMap(
          `Harita verisi yüklenemedi: ${
            err instanceof Error ? err.message : "Bilinmeyen Hata"
          }`
        );
        setFeatures([]);
      })
      .finally(() => {
        setLoadingMap(false);
      });
  }, []);

  if (loadingMap) {
    return (
      <Box textAlign="center" p={4}>
        <Spinner size="md" />
        <Text mt={2} fontSize="sm" color={mapLoadingTextColor}>
          Harita yükleniyor...
        </Text>
      </Box>
    );
  }

  if (errorMap) {
    return (
      <Box textAlign="center" p={4}>
        <Text color="red.500">{errorMap}</Text>
      </Box>
    );
  }

  if (features.length === 0 && !loadingMap && !errorMap) {
    return (
      <Box textAlign="center" p={4}>
        <Text>Harita verisi bulunamadı.</Text>
      </Box>
    );
  }

  const mapWidth = 800;
  const mapHeight = 500;

  return (
    <Box width="100%" height="auto" position="relative" pt="62.5%">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Restore background rect for deselection */}
        <rect
          width={mapWidth}
          height={mapHeight}
          fill="transparent"
          onClick={() => onSelectProvince(null)} // Use prop
          cursor="default"
        />
        <Mercator<Feature>
          data={features}
          scale={2000}
          translate={[mapWidth / 2, mapHeight / 2]}
          center={[35, 39]}
        >
          {(mercator) => (
            <g>
              {mercator.features.map(({ feature, path }, i) => {
                // Restore selection logic
                const provinceName = feature.properties?.adm1_tr as string; // TODO: Verify property name
                const isSelected = provinceName === selectedProvince;

                return (
                  <path
                    key={`map-feature-${i}`}
                    d={path || ""}
                    fill={isSelected ? selectedFill : geoFill} // Use selection logic
                    stroke={geoStroke}
                    strokeWidth={isSelected ? 1 : 0.5}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        (e.target as SVGPathElement).style.fill = hoverFill;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        (e.target as SVGPathElement).style.fill = geoFill;
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Restore selection toggle using prop
                      onSelectProvince(isSelected ? null : provinceName);
                      // Add null check for properties log
                      if (feature.properties) {
                        console.log(
                          "Clicked Province Properties:",
                          feature.properties
                        );
                      } else {
                        console.log(
                          "Clicked province feature with null properties"
                        );
                      }
                    }}
                  />
                );
              })}
            </g>
          )}
        </Mercator>
      </svg>
    </Box>
  );
};

const Analysis = () => {
  const { recipeData, haviData, aktifPosData } = useCurrentProjectData();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<BranchLevelResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  // --- Filters ---
  const [selectedBranchFilter, setSelectedBranchFilter] =
    useState<string>("all");
  const [uniqueBranches, setUniqueBranches] = useState<string[]>([]);
  const [selectedResourceFilter, setSelectedResourceFilter] =
    useState<string>("all");
  const [uniqueResources, setUniqueResources] = useState<string[]>([]); // State for resource dropdown

  // --- Sorting State (Individual Results) ---
  const [sortBy, setSortBy] =
    useState<SortableBranchLevelColumn>("differencePercent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // --- NEW Sorting State (Branch Summary) ---
  const [summarySortBy, setSummarySortBy] =
    useState<SortableBranchSummaryColumn>("deficitCount");
  const [summarySortDir, setSummarySortDir] = useState<"asc" | "desc">("desc");

  const [chartBranchFilter, setChartBranchFilter] = useState<string>("");

  // --- Colors ---
  const boldTextColor = useColorModeValue("black", "white");
  const textColor = useColorModeValue("gray.600", "gray.300");
  const tableNearMatchColor = useColorModeValue("blue.500", "blue.300");
  const tablePositiveColor = useColorModeValue("green.500", "green.300");
  const tableNegativeColor = useColorModeValue("red.500", "red.300");
  const neutralColor = useColorModeValue("gray.500", "gray.400");
  const chartGridColor = useColorModeValue("gray.200", "gray.700");
  const chartAxisColor = useColorModeValue("gray.400", "gray.600");

  const [
    resolvedChartPositiveColor,
    resolvedChartNegativeColor,
    resolvedChartNearMatchColor,
  ] = useToken("colors", ["green.400", "red.400", "blue.400"]);

  const missingData = useMemo(() => {
    const missing: string[] = [];
    if (!recipeData || recipeData.length === 0) missing.push("Reçete verisi");
    if (!haviData || haviData.length === 0) missing.push("HAVI verisi");
    if (!aktifPosData || aktifPosData.length === 0)
      missing.push("AktifPOS verisi");
    return missing;
  }, [recipeData, haviData, aktifPosData]);

  // --- REVISED useEffect for Branch-Level Calculation ---
  useEffect(() => {
    if (missingData.length > 0) {
      setLoading(false);
      setError(null);
      setResults([]);
      setUniqueBranches([]);
      setUniqueResources([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Calculate POS demand PER NORMALIZED BRANCH per ingredient
      const posDemandPerBranchMap = new Map<
        string,
        { amount: number; unit: string }
      >();
      aktifPosData.forEach((posEntry: AktifPOSEntryForAnalysis) => {
        const normalizedBranch = normalizeBranchName(posEntry.branch);
        const productRecipes = recipeData.filter(
          (r) => r.product === posEntry.product
        );
        productRecipes.forEach((recipeIngredient) => {
          const requiredAmount = recipeIngredient.amount * posEntry.amount;
          const ingredientKey = recipeIngredient.ingredient
            .toUpperCase()
            .toLocaleUpperCase("en-US")
            .replace(/İ/g, "I");
          const mapKey = `${ingredientKey}|${normalizedBranch}`;
          const current = posDemandPerBranchMap.get(mapKey) || {
            amount: 0,
            unit: recipeIngredient.unit,
          };
          posDemandPerBranchMap.set(mapKey, {
            amount: current.amount + requiredAmount,
            unit: recipeIngredient.unit,
          });
        });
      });

      // 2. Aggregate HAVI supply PER NORMALIZED BRANCH per ingredient
      const haviSupplyMap = new Map<string, { amount: number; unit: string }>();
      haviData.forEach((haviEntry: HAVIEntryForAnalysis) => {
        const normalizedBranch = normalizeBranchName(haviEntry.branch);
        const ingredientKey = haviEntry.cleanResourceName
          .toUpperCase()
          .toLocaleUpperCase("en-US")
          .replace(/İ/g, "I");
        const mapKey = `${ingredientKey}|${normalizedBranch}`;
        const current = haviSupplyMap.get(mapKey) || {
          amount: 0,
          unit: haviEntry.unit,
        };
        const amountToAdd = haviEntry.totalAmount;
        haviSupplyMap.set(mapKey, {
          amount: current.amount + amountToAdd,
          unit: haviEntry.unit,
        });
      });

      // 3. Create Display Name Mapping
      const keyToDisplayNameMap = new Map<string, string>();
      recipeData.forEach((item) => {
        const normKey = item.ingredient
          .toUpperCase()
          .toLocaleUpperCase("en-US")
          .replace(/İ/g, "I");
        if (!keyToDisplayNameMap.has(normKey))
          keyToDisplayNameMap.set(normKey, item.ingredient);
      });
      haviData.forEach((item) => {
        const normKey = item.cleanResourceName
          .toUpperCase()
          .toLocaleUpperCase("en-US")
          .replace(/İ/g, "I");
        if (!keyToDisplayNameMap.has(normKey))
          keyToDisplayNameMap.set(normKey, item.cleanResourceName);
      });

      // 4. Combine results PER NORMALIZED BRANCH
      const intermediateBranchResults = new Map<
        string,
        IntermediateBranchResultValue
      >();
      const allBranchIngredientKeys = new Set([
        ...posDemandPerBranchMap.keys(),
        ...haviSupplyMap.keys(),
      ]);
      const allBranches = new Set<string>();
      const allResourceDisplayNames = new Set<string>();

      allBranchIngredientKeys.forEach((mapKey) => {
        const [ingredientKey, branch] = mapKey.split("|");
        allBranches.add(branch);
        const resourceDisplayName =
          keyToDisplayNameMap.get(ingredientKey) || ingredientKey;
        allResourceDisplayNames.add(resourceDisplayName);

        const posData = posDemandPerBranchMap.get(mapKey);
        const haviData = haviSupplyMap.get(mapKey);
        const branchPosDemand = posData?.amount ?? 0;
        const branchHaviAmount = haviData?.amount ?? 0;
        let unit = haviData?.unit ?? posData?.unit ?? "unknown";
        unit = unit.toLowerCase() === "gram" ? "gr" : unit;
        if (
          resourceDisplayName.toLocaleLowerCase("tr-TR").includes("kruvasan")
        ) {
          unit = "adet";
        }

        intermediateBranchResults.set(mapKey, {
          branchHaviAmount,
          branchPosDemand,
          unit,
          province: getProvinceForBranch(branch),
        });
      });

      setUniqueResources(Array.from(allResourceDisplayNames).sort());
      setUniqueBranches(Array.from(allBranches).sort());

      // 5. Final calculation and structuring
      const finalResults: BranchLevelResult[] = [];
      intermediateBranchResults.forEach((data, mapKey) => {
        const [ingredientKey, branch] = mapKey.split("|");
        const resourceDisplayName =
          keyToDisplayNameMap.get(ingredientKey) || ingredientKey;

        let difference: number | null = null;
        let differencePercent: number | null = null;

        if (data.unit === "gr" || data.unit === "adet") {
          difference = data.branchHaviAmount - data.branchPosDemand;
          differencePercent =
            data.branchHaviAmount !== 0
              ? (difference / data.branchHaviAmount) * 100
              : data.branchPosDemand > 0
              ? -Infinity
              : 0;
        }

        finalResults.push({
          branch: branch,
          resource: resourceDisplayName,
          unit: data.unit,
          branchHaviAmount: data.branchHaviAmount,
          branchPosDemand: data.branchPosDemand,
          difference: difference ?? 0,
          differencePercent:
            differencePercent !== null && isFinite(differencePercent)
              ? differencePercent
              : undefined,
          province: data.province,
        });
      });

      // Default sort for the detailed table (remains the same)
      finalResults.sort((a, b) => {
        const absPercentA =
          a.differencePercent !== undefined
            ? Math.abs(a.differencePercent)
            : -1;
        const absPercentB =
          b.differencePercent !== undefined
            ? Math.abs(b.differencePercent)
            : -1;
        if (absPercentB !== absPercentA) {
          return absPercentB - absPercentA;
        }
        const branchCompare = a.branch.localeCompare(b.branch);
        if (branchCompare !== 0) return branchCompare;
        return a.resource.localeCompare(b.resource);
      });

      setResults(finalResults);

      // Set Default Chart Filter
      if (finalResults.length > 0 && chartBranchFilter === "") {
        setChartBranchFilter(finalResults[0].branch);
      } else if (finalResults.length === 0) {
        setChartBranchFilter("");
      }
    } catch (err) {
      console.error("Error during analysis calculation:", err);
      setError(
        `Analiz hesaplaması sırasında bir hata oluştu: ${
          err instanceof Error ? err.message : "Bilinmeyen Hata"
        }`
      );
      setResults([]);
      setUniqueBranches([]);
      setUniqueResources([]);
      setChartBranchFilter("");
    } finally {
      setLoading(false);
    }
  }, [recipeData, haviData, aktifPosData, missingData, chartBranchFilter]); // Keep chartBranchFilter here

  // --- Memoized Calculation for Detailed Results Table ---
  const sortedAndFilteredResults = useMemo(() => {
    const filtered = results.filter((item) => {
      let provinceMatch = true;
      if (selectedProvince) {
        provinceMatch = item.province === selectedProvince;
      }
      const branchFilterMatch =
        selectedBranchFilter === "all" || item.branch === selectedBranchFilter;
      const resourceFilterMatch =
        selectedResourceFilter === "all" ||
        item.resource === selectedResourceFilter;
      return provinceMatch && branchFilterMatch && resourceFilterMatch;
    });

    filtered.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (sortBy === "differencePercent") {
        const numA =
          a.differencePercent ?? (sortDir === "asc" ? Infinity : -Infinity);
        const numB =
          b.differencePercent ?? (sortDir === "asc" ? Infinity : -Infinity);
        return sortDir === "asc" ? numA - numB : numB - numA;
      } else if (typeof valA === "string" && typeof valB === "string") {
        return sortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      } else {
        const definedA = valA !== undefined && valA !== null;
        const definedB = valB !== undefined && valB !== null;
        if (definedA && !definedB) return sortDir === "asc" ? -1 : 1;
        if (!definedA && definedB) return sortDir === "asc" ? 1 : -1;
        if (!definedA && !definedB) return 0;
        if (valA! < valB!) return sortDir === "asc" ? -1 : 1;
        if (valA! > valB!) return sortDir === "asc" ? 1 : -1;
        return 0;
      }
    });
    return filtered;
  }, [
    results,
    selectedProvince,
    selectedBranchFilter,
    selectedResourceFilter,
    sortBy,
    sortDir,
  ]);

  // --- NEW: Memoized Calculation for Branch Summaries ---
  const branchSummaries = useMemo(() => {
    const summaries = new Map<string, BranchSummary>();

    results.forEach((item) => {
      const branchName = item.branch;
      if (!summaries.has(branchName)) {
        summaries.set(branchName, {
          branch: branchName,
          province: item.province || null,
          totalItemsAnalyzed: 0,
          deficitCount: 0,
          surplusCount: 0,
          nearMatchCount: 0,
          totalDeficitGr: 0,
          totalSurplusGr: 0,
          totalDeficitAdet: 0,
          totalSurplusAdet: 0,
          incomparableUnitCount: 0,
        });
      }

      const summary = summaries.get(branchName)!;
      summary.totalItemsAnalyzed += 1;

      if (item.unit === "gr" || item.unit === "adet") {
        if (
          item.differencePercent !== undefined &&
          isFinite(item.differencePercent)
        ) {
          if (item.differencePercent <= -10) {
            summary.deficitCount += 1;
            if (item.unit === "gr") summary.totalDeficitGr += item.difference; // difference is negative
            if (item.unit === "adet")
              summary.totalDeficitAdet += item.difference;
          } else if (item.differencePercent >= 10) {
            summary.surplusCount += 1;
            if (item.unit === "gr") summary.totalSurplusGr += item.difference; // difference is positive
            if (item.unit === "adet")
              summary.totalSurplusAdet += item.difference;
          } else {
            summary.nearMatchCount += 1;
          }
        } else {
          // Handle cases like division by zero or Infinity where percentage is not meaningful
          // but difference might be non-zero (e.g., 0 Havi, >0 POS -> -Infinity %)
          if (item.difference < 0) {
            summary.deficitCount += 1;
            if (item.unit === "gr") summary.totalDeficitGr += item.difference;
            if (item.unit === "adet")
              summary.totalDeficitAdet += item.difference;
          } else if (item.difference > 0) {
            summary.surplusCount += 1;
            if (item.unit === "gr") summary.totalSurplusGr += item.difference;
            if (item.unit === "adet")
              summary.totalSurplusAdet += item.difference;
          } else {
            summary.nearMatchCount += 1; // Treat 0 difference as near match
          }
        }
      } else {
        summary.incomparableUnitCount += 1;
      }
    });

    return Array.from(summaries.values());
  }, [results]);

  // --- NEW: Memoized Calculation for Sorted/Filtered Branch Summaries ---
  const sortedAndFilteredBranchSummaries = useMemo(() => {
    // 1. Filter by selected province
    const filtered = branchSummaries.filter((summary) => {
      if (selectedProvince) {
        return summary.province === selectedProvince;
      }
      return true; // No province filter applied
    });

    // 2. Sort based on state
    filtered.sort((a, b) => {
      const valA = a[summarySortBy];
      const valB = b[summarySortBy];

      // Handle branch separately for localeCompare
      if (summarySortBy === "branch") {
        return summarySortDir === "asc"
          ? a.branch.localeCompare(b.branch)
          : b.branch.localeCompare(a.branch);
      }

      // All other sortable columns are numbers
      if (typeof valA === "number" && typeof valB === "number") {
        return summarySortDir === "asc" ? valA - valB : valB - valA;
      }

      // Fallback (shouldn't usually happen if types are correct)
      return 0;
    });

    return filtered;
  }, [branchSummaries, selectedProvince, summarySortBy, summarySortDir]);

  // --- Sort Handler (Detailed Table) ---
  const handleSort = (column: SortableBranchLevelColumn) => {
    setSortBy((prevSortBy) => {
      setSortDir((prevSortDir) => {
        if (prevSortBy === column) {
          return prevSortDir === "asc" ? "desc" : "asc";
        }
        return column === "differencePercent" ? "desc" : "asc"; // Default desc for %
      });
      return column;
    });
  };

  // --- NEW: Sort Handler (Branch Summary Table) ---
  const handleSummarySort = (column: SortableBranchSummaryColumn) => {
    setSummarySortBy((prevSortBy) => {
      setSummarySortDir((prevSortDir) => {
        if (prevSortBy === column) {
          return prevSortDir === "asc" ? "desc" : "asc";
        }
        // Default direction: desc for counts/amounts, asc for branch name
        return column === "branch" ? "asc" : "desc";
      });
      return column;
    });
  };

  // --- Generic Sort Icon Helper ---
  const SortIcon = <T extends string>({
    column,
    activeSortBy,
    activeSortDir,
  }: {
    column: T;
    activeSortBy: T;
    activeSortDir: "asc" | "desc";
  }) => {
    const isActive = activeSortBy === column;
    const iconToShow = isActive
      ? activeSortDir === "asc"
        ? TriangleUpIcon
        : TriangleDownIcon
      : TriangleDownIcon; // Default icon for inactive columns

    return (
      <Icon
        as={iconToShow}
        ml={1}
        opacity={isActive ? 1 : 0.4} // Full opacity if active, faded if not
        aria-label={
          isActive
            ? activeSortDir === "asc"
              ? "sorted ascending"
              : "sorted descending"
            : "sortable" // Basic label for inactive columns
        }
      />
    );
  };

  // --- Chart Data Hook ---
  const percentageDifferenceChartData = useMemo(() => {
    const currentChartBranch =
      chartBranchFilter ||
      (uniqueBranches.length > 0 ? uniqueBranches[0] : "all");

    const branchFilteredItems = results.filter(
      // Use original results for chart
      (item) =>
        currentChartBranch === "all" || item.branch === currentChartBranch
    );

    const chartItems = branchFilteredItems
      .filter(
        (item) =>
          item.differencePercent !== undefined &&
          isFinite(item.differencePercent)
      )
      .sort((a, b) => {
        const absA = Math.abs(a.differencePercent!);
        const absB = Math.abs(b.differencePercent!);
        return absB - absA;
      })
      .reverse();

    const labels = chartItems.map((item) => `${item.resource}`);
    const data = chartItems.map((item) => item.differencePercent);

    const backgroundColors = chartItems.map((item) => {
      const perc = item.differencePercent!;
      if (perc > 15) return resolvedChartPositiveColor;
      if (perc < -15) return resolvedChartNegativeColor;
      return resolvedChartNearMatchColor;
    });

    return {
      labels: labels,
      datasets: [
        {
          label: "Fark (%)",
          data: data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 1,
        },
      ],
    };
  }, [
    results, // Use original results here
    chartBranchFilter,
    uniqueBranches,
    resolvedChartNearMatchColor,
    resolvedChartPositiveColor,
    resolvedChartNegativeColor,
  ]);

  // --- Table Color Logic ---
  const getDifferenceColor = (diff: number, diffPercent?: number) => {
    if (diffPercent !== undefined && diffPercent !== null) {
      if (diffPercent === 0) return neutralColor; // Explicit 0 check
      if (diffPercent > 0 && diffPercent < 10) return tableNearMatchColor;
      if (diffPercent < 0 && diffPercent > -10) return tableNearMatchColor;
      if (diffPercent >= 10) return tablePositiveColor;
      if (diffPercent <= -10) return tableNegativeColor;
    }
    if (diff === 0) return neutralColor;
    if (diff > 0) return tablePositiveColor;
    if (diff < 0) return tableNegativeColor;
    return textColor;
  };

  // --- Rendering Logic ---
  const cardBg = useColorModeValue("white", "gray.800");
  const headerBg = useColorModeValue("gray.50", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");

  const formatNumber = (num: number | undefined | null, digits = 2) => {
    if (num === undefined || num === null) return "N/A";
    // Show negative sign for deficits correctly
    return num.toLocaleString("tr-TR", { maximumFractionDigits: digits });
  };

  const formatPercentage = (num: number | undefined | null) => {
    if (num === undefined || num === null || !isFinite(num)) return "-";
    return `${num.toFixed(1)}%`;
  };

  const handleExport = () => {
    // Export depends on the current tab
    let csvContent = "";
    let filename = "";

    if (tabIndex === 0) {
      // Detailed results
      const header =
        "Şube,Hammadde,Birim,Alınan Miktar (HAVI Şube),Hesaplanan Kullanım (POS Şube),Fark,Fark (%)";
      const rows = sortedAndFilteredResults.map((r) =>
        [
          `"${r.branch.replace(/"/g, '""')}"`,
          `"${r.resource.replace(/"/g, '""')}"`,
          r.unit,
          formatNumber(r.branchHaviAmount),
          formatNumber(r.branchPosDemand),
          r.unit === "gr" || r.unit === "adet"
            ? formatNumber(r.difference)
            : "N/A",
          r.unit === "gr" || r.unit === "adet"
            ? formatPercentage(r.differencePercent)
            : "N/A",
        ].join(",")
      );
      csvContent =
        "data:text/csv;charset=utf-8," + header + "\n" + rows.join("\n");
      filename = "hammadde_analizi_detayli.csv";
    } else if (tabIndex === 2) {
      // Branch Summary
      const header =
        "Şube,İl,Toplam Kalem,Fazla Kullanım (Adet),Fazla Sipariş (Adet),Yakın Eşleşme (Adet),Toplam Eksik (gr),Toplam Fazla (gr),Toplam Eksik (adet),Toplam Fazla (adet),Karşılaştırılamayan";
      const rows = sortedAndFilteredBranchSummaries.map((s) =>
        [
          `"${s.branch.replace(/"/g, '""')}"`,
          s.province || "Bilinmiyor",
          s.totalItemsAnalyzed,
          s.deficitCount,
          s.surplusCount,
          s.nearMatchCount,
          formatNumber(s.totalDeficitGr),
          formatNumber(s.totalSurplusGr),
          formatNumber(s.totalDeficitAdet, 0), // Whole numbers for adet
          formatNumber(s.totalSurplusAdet, 0), // Whole numbers for adet
          s.incomparableUnitCount,
        ].join(",")
      );
      csvContent =
        "data:text/csv;charset=utf-8," + header + "\n" + rows.join("\n");
      filename = "hammadde_analizi_sube_ozeti.csv";
    } else {
      // No export for graph tab for now
      return;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Conditional Rendering (Loading, Missing Data, Error) ---
  if (loading) {
    return (
      <Box textAlign="center" p={10}>
        <Spinner size="xl" />
        <Text mt={4}>Analiz hesaplanıyor...</Text>
      </Box>
    );
  }
  if (missingData.length > 0) {
    return (
      <Card bg={cardBg} borderRadius="lg" variant="outline">
        <CardHeader>
          <Heading size="md">Analiz İçin Veri Gerekli</Heading>
        </CardHeader>
        <CardBody>
          <Text mb={4}>
            Analiz yapabilmek için önce eksik verileri yüklemeniz gerekmektedir.
          </Text>
          <VStack spacing={2} align="stretch" maxW="sm" mx="auto" mb={6}>
            {missingData.map((item) => (
              <Alert status="warning" key={item} borderRadius="md">
                <AlertIcon /> {item} eksik.
              </Alert>
            ))}
          </VStack>
          <Text fontSize="sm" color={textColor}>
            İlgili adıma gidip verileri yükledikten sonra bu sayfaya dönün.
          </Text>
        </CardBody>
      </Card>
    );
  }
  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  // --- Main Analysis Results UI ---
  return (
    <VStack spacing={6} align="stretch">
      {/* Header Row: Title, Tabs, Download Button */}
      <Flex align="center" gap={4}>
        <Heading as="h2" size="lg" mb={0} textAlign="left">
          Hammadde Kullanım Analizi (Şube Bazlı)
        </Heading>
        <Spacer />
        <Tooltip label="Mevcut sekmedeki filtrelenmiş sonuçları CSV olarak indir">
          <IconButton
            aria-label="CSV İndir"
            icon={<DownloadIcon />}
            size="md"
            variant="ghost"
            onClick={handleExport}
            isDisabled={
              (tabIndex === 0 && sortedAndFilteredResults.length === 0) ||
              (tabIndex === 2 &&
                sortedAndFilteredBranchSummaries.length === 0) ||
              tabIndex === 1 // Disable for graph tab
            }
          />
        </Tooltip>
      </Flex>

      <Tabs
        index={tabIndex}
        onChange={(index) => setTabIndex(index)}
        variant="soft-rounded"
        colorScheme="blue"
      >
        <TabList mb={4}>
          <Tab>Detaylı Analiz</Tab>
          <Tab>Grafik Analizi</Tab>
          <Tab>Şube Özeti</Tab>
        </TabList>

        <TabPanels>
          {/* Tab 1: Map, Stats, Filters, Detailed Table */}
          <TabPanel p={0}>
            <VStack spacing={6} align="stretch">
              {/* Filters Card */}
              <Card variant="outline" borderRadius="lg">
                <CardHeader pb={2}>
                  <Heading size="sm">Filtreler (Detaylı Tablo)</Heading>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <Select
                      placeholder="Tüm Hammaddeler"
                      size="sm"
                      value={selectedResourceFilter}
                      onChange={(e) =>
                        setSelectedResourceFilter(e.target.value)
                      }
                    >
                      <option value="all">Tüm Hammaddeler</option>
                      {uniqueResources.map((resource) => (
                        <option key={resource} value={resource}>
                          {resource}
                        </option>
                      ))}
                    </Select>
                    <Select
                      placeholder="Tüm Şubeler"
                      size="sm"
                      value={selectedBranchFilter}
                      onChange={(e) => setSelectedBranchFilter(e.target.value)}
                    >
                      <option value="all">Tüm Şubeler</option>
                      {uniqueBranches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </Select>
                  </SimpleGrid>
                </CardBody>
              </Card>

              {/* MAP AND STATS ROW */}
              <SimpleGrid
                columns={{ base: 1, lg: 2 }}
                spacing={6}
                alignItems="center"
                justifyItems={{ base: "center", lg: "stretch" }}
              >
                {/* Left Column: Map */}
                <Card variant="outline" borderRadius="lg" overflow="hidden">
                  <CardHeader pb={2}>
                    <Flex justify="space-between" align="center">
                      <Heading size="sm">
                        Türkiye Haritası (İller)
                        {selectedProvince && ` - Filtre: ${selectedProvince}`}
                      </Heading>
                      {selectedProvince && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setSelectedProvince(null)}
                        >
                          Filtreyi Temizle
                        </Button>
                      )}
                    </Flex>
                  </CardHeader>
                  <CardBody
                    p={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <TurkeyMap
                      selectedProvince={selectedProvince}
                      onSelectProvince={setSelectedProvince}
                    />
                  </CardBody>
                </Card>

                {/* Right Column: Stats */}
                <VStack
                  spacing={3}
                  align="stretch"
                  p={{ base: 2, md: 4 }}
                  alignSelf="center"
                  justifySelf="center"
                  w="full"
                  maxW="sm"
                >
                  {/* Stats remain the same, calculated from sortedAndFilteredResults */}
                  <Stat>
                    <Flex justify="space-between" align="baseline">
                      <StatLabel
                        fontSize="md"
                        fontWeight="medium"
                        color={textColor}
                      >
                        İncelenen Hammadde-Şube:
                      </StatLabel>
                      <StatNumber fontSize="lg" fontWeight="semibold">
                        {sortedAndFilteredResults.length}
                      </StatNumber>
                    </Flex>
                    {(selectedProvince ||
                      selectedBranchFilter !== "all" ||
                      selectedResourceFilter !== "all") && (
                      <Text
                        fontSize="xs"
                        color={textColor}
                        mt={1}
                        textAlign="right"
                      >
                        {selectedProvince && `Bölge: ${selectedProvince}`}
                        {selectedProvince &&
                          (selectedBranchFilter !== "all" ||
                            selectedResourceFilter !== "all") &&
                          ", "}
                        {selectedBranchFilter !== "all" &&
                          `Şube: ${selectedBranchFilter}`}
                        {selectedBranchFilter !== "all" &&
                          selectedResourceFilter !== "all" &&
                          ", "}
                        {selectedResourceFilter !== "all" &&
                          `Hammadde: ${selectedResourceFilter}`}
                      </Text>
                    )}
                  </Stat>
                  <Stat>
                    <Flex justify="space-between" align="baseline">
                      <Tooltip label="Hesaplanan Kullanım > Alınan (%10+ fark)">
                        <StatLabel
                          fontSize="md"
                          fontWeight="medium"
                          color={textColor}
                        >
                          Fazladan Kullanım (Kalem):
                        </StatLabel>
                      </Tooltip>
                      <StatNumber
                        fontSize="lg"
                        fontWeight="semibold"
                        color={tableNegativeColor}
                      >
                        {
                          sortedAndFilteredResults.filter(
                            (r) =>
                              r.differencePercent !== undefined &&
                              r.differencePercent <= -10
                          ).length
                        }
                      </StatNumber>
                    </Flex>
                  </Stat>
                  <Stat>
                    <Flex justify="space-between" align="baseline">
                      <Tooltip label="Alınan > Hesaplanan Kullanım (%10+ fark)">
                        <StatLabel
                          fontSize="md"
                          fontWeight="medium"
                          color={textColor}
                        >
                          Fazladan Sipariş (Kalem):
                        </StatLabel>
                      </Tooltip>
                      <StatNumber
                        fontSize="lg"
                        fontWeight="semibold"
                        color={tablePositiveColor}
                      >
                        {
                          sortedAndFilteredResults.filter(
                            (r) =>
                              r.differencePercent !== undefined &&
                              r.differencePercent >= 10
                          ).length
                        }
                      </StatNumber>
                    </Flex>
                  </Stat>
                  <Stat>
                    <Flex justify="space-between" align="baseline">
                      <Tooltip label="Fark < %10 veya tam eşleşme">
                        <StatLabel
                          fontSize="md"
                          fontWeight="medium"
                          color={textColor}
                        >
                          Olası Eşleşme (Kalem):
                        </StatLabel>
                      </Tooltip>
                      <StatNumber
                        fontSize="lg"
                        fontWeight="semibold"
                        color={tableNearMatchColor}
                      >
                        {
                          sortedAndFilteredResults.filter(
                            (r) =>
                              r.difference === 0 ||
                              (r.differencePercent !== undefined &&
                                Math.abs(r.differencePercent) < 10)
                          ).length
                        }
                      </StatNumber>
                    </Flex>
                  </Stat>
                </VStack>
              </SimpleGrid>

              {/* Detailed Results Table */}
              <Card variant="outline" borderRadius="lg">
                <CardHeader>
                  <Heading size="md">
                    Detaylı Hammadde Fark Analizi Tablosu
                  </Heading>
                </CardHeader>
                <CardBody p={0}>
                  <TableContainer>
                    <Table
                      variant="simple"
                      size="sm"
                      sx={{ tableLayout: "fixed" }}
                    >
                      <Thead bg={headerBg}>
                        <Tr>
                          <Th
                            w="14%"
                            cursor="pointer"
                            onClick={() => handleSort("branch")}
                          >
                            Şube{" "}
                            <SortIcon
                              column="branch"
                              activeSortBy={sortBy}
                              activeSortDir={sortDir}
                            />
                          </Th>
                          <Th
                            w="24%"
                            cursor="pointer"
                            onClick={() => handleSort("resource")}
                          >
                            Hammadde{" "}
                            <SortIcon
                              column="resource"
                              activeSortBy={sortBy}
                              activeSortDir={sortDir}
                            />
                          </Th>
                          <Th
                            w="8%"
                            cursor="pointer"
                            onClick={() => handleSort("unit")}
                          >
                            Birim{" "}
                            <SortIcon
                              column="unit"
                              activeSortBy={sortBy}
                              activeSortDir={sortDir}
                            />
                          </Th>
                          <Th
                            w="14%"
                            isNumeric
                            cursor="pointer"
                            onClick={() => handleSort("branchHaviAmount")}
                          >
                            Alınan{" "}
                            <SortIcon
                              column="branchHaviAmount"
                              activeSortBy={sortBy}
                              activeSortDir={sortDir}
                            />
                          </Th>
                          <Th
                            w="14%"
                            isNumeric
                            cursor="pointer"
                            onClick={() => handleSort("branchPosDemand")}
                          >
                            Kullanılan{" "}
                            <SortIcon
                              column="branchPosDemand"
                              activeSortBy={sortBy}
                              activeSortDir={sortDir}
                            />
                          </Th>
                          <Th
                            w="13%"
                            isNumeric
                            cursor="pointer"
                            onClick={() => handleSort("difference")}
                          >
                            Fark{" "}
                            <SortIcon
                              column="difference"
                              activeSortBy={sortBy}
                              activeSortDir={sortDir}
                            />
                          </Th>
                          <Th
                            w="13%"
                            isNumeric
                            cursor="pointer"
                            onClick={() => handleSort("differencePercent")}
                          >
                            Fark (%){" "}
                            <SortIcon
                              column="differencePercent"
                              activeSortBy={sortBy}
                              activeSortDir={sortDir}
                            />
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {sortedAndFilteredResults.map((item, index) => (
                          <Tr
                            key={`${item.branch}-${item.resource}-${index}`}
                            _hover={{ bg: hoverBg }}
                          >
                            <Td
                              py={2}
                              isTruncated
                              title={item.branch}
                              fontSize="xs"
                            >
                              {item.branch}
                            </Td>
                            <Td
                              py={2}
                              isTruncated
                              title={item.resource}
                              fontSize="xs"
                            >
                              {item.resource}
                            </Td>
                            <Td py={2} fontSize="xs">
                              {item.unit}
                            </Td>
                            <Td isNumeric py={2} fontSize="xs">
                              {formatNumber(item.branchHaviAmount)}
                            </Td>
                            <Td
                              isNumeric
                              py={2}
                              fontSize="xs"
                              color={boldTextColor}
                            >
                              {formatNumber(item.branchPosDemand)}
                            </Td>
                            <Td
                              isNumeric
                              py={2}
                              fontSize="xs"
                              color={
                                item.unit === "gr" || item.unit === "adet"
                                  ? getDifferenceColor(
                                      item.difference,
                                      item.differencePercent
                                    )
                                  : textColor
                              }
                            >
                              {item.unit === "gr" || item.unit === "adet"
                                ? formatNumber(item.difference)
                                : "N/A"}
                            </Td>
                            <Td
                              isNumeric
                              py={2}
                              fontSize="xs"
                              fontWeight={
                                item.differencePercent !== undefined &&
                                Math.abs(item.differencePercent) < 10
                                  ? "normal"
                                  : "bold"
                              }
                              color={
                                item.unit === "gr" || item.unit === "adet"
                                  ? getDifferenceColor(
                                      item.difference,
                                      item.differencePercent
                                    )
                                  : textColor
                              }
                            >
                              {item.unit === "gr" || item.unit === "adet"
                                ? formatPercentage(item.differencePercent)
                                : "N/A"}
                            </Td>
                          </Tr>
                        ))}
                        {sortedAndFilteredResults.length === 0 && (
                          <Tr>
                            <Td colSpan={7} textAlign="center" py={6}>
                              Filtreye uygun sonuç bulunamadı.
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>

          {/* Tab 2: Charts */}
          <TabPanel p={0}>
            <VStack spacing={6} align="stretch">
              {/* Chart Filter Card */}
              <Card variant="outline" borderRadius="lg">
                <CardHeader pb={2}></CardHeader>
                <CardBody pt={2}>
                  <Select
                    size="sm"
                    value={
                      chartBranchFilter ||
                      (uniqueBranches.length > 0 ? uniqueBranches[0] : "")
                    }
                    onChange={(e) => setChartBranchFilter(e.target.value)}
                    maxW={{ base: "100%", md: "300px" }}
                    isDisabled={uniqueBranches.length === 0}
                  >
                    {uniqueBranches.map((branch) => (
                      <option key={`chart-${branch}`} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </Select>
                </CardBody>
              </Card>

              {/* Chart Card */}
              <Card variant="outline" borderRadius="lg">
                <CardHeader>
                  <Heading size="sm">
                    {chartBranchFilter
                      ? `Oransal Farklar (${chartBranchFilter})`
                      : "Şube Seçiniz"}
                  </Heading>
                  <Text fontSize="xs" color={textColor} mt={1}>
                    Yeşil &gt; 15% | Mavi: -15% ≤ Fark ≤ 15% | Kırmızı &lt; -15%
                  </Text>
                </CardHeader>
                <CardBody>
                  <Box height={{ base: "500px", md: "700px" }}>
                    <Bar
                      data={percentageDifferenceChartData}
                      options={{
                        indexAxis: "y",
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: {
                            title: {
                              display: true,
                              text: "Fark Yüzdesi (%)",
                              font: { size: 10 },
                              color: textColor,
                            },
                            ticks: {
                              font: { size: 10 },
                              color: textColor,
                              callback: function (value) {
                                return value + "%";
                              },
                            },
                            grid: { color: chartGridColor },
                            border: {
                              display: true,
                              color: chartAxisColor,
                              width: 1,
                            },
                            beginAtZero: false,
                          },
                          y: {
                            ticks: { font: { size: 9 }, color: textColor },
                            grid: { display: false },
                            border: {
                              display: true,
                              color: chartAxisColor,
                              width: 1,
                            },
                          },
                        },
                        plugins: {
                          legend: { display: false }, // Hide legend as colors are explained
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                let label = context.dataset.label || "";
                                if (label) {
                                  label += ": ";
                                }
                                if (context.parsed.x !== null) {
                                  label += context.parsed.x.toFixed(1) + "%";
                                }
                                return label;
                              },
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>

          {/* Tab 3: Branch Summary Table */}
          <TabPanel p={0}>
            <VStack spacing={6} align="stretch">
              <Card variant="outline" borderRadius="lg">
                <CardHeader>
                  <Heading size="md">Şube Özet Tablosu</Heading>
                  {selectedProvince && (
                    <Text fontSize="sm" color={textColor} mt={1}>
                      Filtre: {selectedProvince} İli
                    </Text>
                  )}
                </CardHeader>
                <CardBody p={0}>
                  <TableContainer>
                    <Table variant="simple" size="sm">
                      <Thead bg={headerBg}>
                        <Tr>
                          <Th
                            cursor="pointer"
                            onClick={() => handleSummarySort("branch")}
                          >
                            Şube{" "}
                            <SortIcon
                              column="branch"
                              activeSortBy={summarySortBy}
                              activeSortDir={summarySortDir}
                            />
                          </Th>
                          <Th
                            isNumeric
                            cursor="pointer"
                            onClick={() =>
                              handleSummarySort("totalItemsAnalyzed")
                            }
                          >
                            Toplam Kalem{" "}
                            <SortIcon
                              column="totalItemsAnalyzed"
                              activeSortBy={summarySortBy}
                              activeSortDir={summarySortDir}
                            />
                          </Th>
                          <Th
                            isNumeric
                            color={tableNegativeColor}
                            cursor="pointer"
                            onClick={() => handleSummarySort("deficitCount")}
                          >
                            Fazla Kullanım{" "}
                            <SortIcon
                              column="deficitCount"
                              activeSortBy={summarySortBy}
                              activeSortDir={summarySortDir}
                            />
                          </Th>
                          <Th
                            isNumeric
                            color={tablePositiveColor}
                            cursor="pointer"
                            onClick={() => handleSummarySort("surplusCount")}
                          >
                            Fazla Sipariş{" "}
                            <SortIcon
                              column="surplusCount"
                              activeSortBy={summarySortBy}
                              activeSortDir={summarySortDir}
                            />
                          </Th>
                          <Th
                            isNumeric
                            color={tableNearMatchColor}
                            cursor="pointer"
                            onClick={() => handleSummarySort("nearMatchCount")}
                          >
                            Yakın Eşleşme{" "}
                            <SortIcon
                              column="nearMatchCount"
                              activeSortBy={summarySortBy}
                              activeSortDir={summarySortDir}
                            />
                          </Th>
                          <Th
                            isNumeric
                            color={tableNegativeColor}
                            cursor="pointer"
                            onClick={() => handleSummarySort("totalDeficitGr")}
                          >
                            Eksik (gr){" "}
                            <SortIcon
                              column="totalDeficitGr"
                              activeSortBy={summarySortBy}
                              activeSortDir={summarySortDir}
                            />
                          </Th>
                          <Th
                            isNumeric
                            color={tablePositiveColor}
                            cursor="pointer"
                            onClick={() => handleSummarySort("totalSurplusGr")}
                          >
                            Fazla (gr){" "}
                            <SortIcon
                              column="totalSurplusGr"
                              activeSortBy={summarySortBy}
                              activeSortDir={summarySortDir}
                            />
                          </Th>
                          <Th
                            isNumeric
                            color={tableNegativeColor}
                            cursor="pointer"
                            onClick={() =>
                              handleSummarySort("totalDeficitAdet")
                            }
                          >
                            Eksik (adet){" "}
                            <SortIcon
                              column="totalDeficitAdet"
                              activeSortBy={summarySortBy}
                              activeSortDir={summarySortDir}
                            />
                          </Th>
                          <Th
                            isNumeric
                            color={tablePositiveColor}
                            cursor="pointer"
                            onClick={() =>
                              handleSummarySort("totalSurplusAdet")
                            }
                          >
                            Fazla (adet){" "}
                            <SortIcon
                              column="totalSurplusAdet"
                              activeSortBy={summarySortBy}
                              activeSortDir={summarySortDir}
                            />
                          </Th>
                          <Th
                            isNumeric
                            cursor="pointer"
                            onClick={() =>
                              handleSummarySort("incomparableUnitCount")
                            }
                          >
                            Diğer{" "}
                            <SortIcon
                              column="incomparableUnitCount"
                              activeSortBy={summarySortBy}
                              activeSortDir={summarySortDir}
                            />
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {sortedAndFilteredBranchSummaries.map((summary) => (
                          <Tr key={summary.branch} _hover={{ bg: hoverBg }}>
                            <Td
                              fontSize="xs"
                              title={summary.branch}
                              isTruncated
                            >
                              {summary.branch}
                            </Td>
                            <Td isNumeric fontSize="xs">
                              {summary.totalItemsAnalyzed}
                            </Td>
                            <Td
                              isNumeric
                              fontSize="xs"
                              color={tableNegativeColor}
                            >
                              {summary.deficitCount}
                            </Td>
                            <Td
                              isNumeric
                              fontSize="xs"
                              color={tablePositiveColor}
                            >
                              {summary.surplusCount}
                            </Td>
                            <Td
                              isNumeric
                              fontSize="xs"
                              color={tableNearMatchColor}
                            >
                              {summary.nearMatchCount}
                            </Td>
                            <Td
                              isNumeric
                              fontSize="xs"
                              color={tableNegativeColor}
                            >
                              {formatNumber(summary.totalDeficitGr)}
                            </Td>
                            <Td
                              isNumeric
                              fontSize="xs"
                              color={tablePositiveColor}
                            >
                              {formatNumber(summary.totalSurplusGr)}
                            </Td>
                            <Td
                              isNumeric
                              fontSize="xs"
                              color={tableNegativeColor}
                            >
                              {formatNumber(summary.totalDeficitAdet, 0)}
                            </Td>
                            <Td
                              isNumeric
                              fontSize="xs"
                              color={tablePositiveColor}
                            >
                              {formatNumber(summary.totalSurplusAdet, 0)}
                            </Td>
                            <Td isNumeric fontSize="xs">
                              {summary.incomparableUnitCount}
                            </Td>
                          </Tr>
                        ))}
                        {sortedAndFilteredBranchSummaries.length === 0 && (
                          <Tr>
                            {/* Update ColSpan to match new table */}
                            <Td colSpan={10} textAlign="center" py={6}>
                              {selectedProvince
                                ? `${selectedProvince} ili için şube özeti bulunamadı.`
                                : "Özetlenecek şube bulunamadı."}
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
};

export default Analysis;
