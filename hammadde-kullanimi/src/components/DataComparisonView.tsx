import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Spinner,
  Alert,
  AlertIcon,
  SimpleGrid,
} from "@chakra-ui/react";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ExcelRow {
  [key: string]: string | number | Date | boolean | undefined;
}

interface MismatchDetail {
  product: string;
  productName: string;
  haviQty: number;
  posQty: number;
  difference: number;
  haviField: string;
  posField: string;
}

interface ComparisonResults {
  matching: number;
  mismatches: number;
  inHaviNotInPos: number;
  inPosNotInHavi: number;
  mismatchDetails: MismatchDetail[];
}

interface DataComparisonViewProps {
  haviData: ExcelRow[];
  aktifPOSData: ExcelRow[];
}

const DataComparisonView = ({
  haviData,
  aktifPOSData,
}: DataComparisonViewProps) => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [commonKeys, setCommonKeys] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [comparisonResults, setComparisonResults] = useState<ComparisonResults>(
    {
      matching: 0,
      mismatches: 0,
      inHaviNotInPos: 0,
      inPosNotInHavi: 0,
      mismatchDetails: [],
    }
  );

  // Debug info
  const haviDataCount = useMemo(() => haviData.length, [haviData]);
  const aktifPOSDataCount = useMemo(() => aktifPOSData.length, [aktifPOSData]);

  // Normalize data by finding common product keys/IDs
  useEffect(() => {
    console.log(
      `Analyzing data: HAVI(${haviDataCount}) and AktifPOS(${aktifPOSDataCount})`
    );

    if (!haviData.length || !aktifPOSData.length) {
      console.log("One of the datasets is empty, skipping analysis");
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    try {
      // Try to identify common keys (product codes or names)
      const haviKeys = Object.keys(haviData[0] || {});
      const aktifPOSKeys = Object.keys(aktifPOSData[0] || {});

      console.log("HAVI keys:", haviKeys);
      console.log("AktifPOS keys:", aktifPOSKeys);

      // Find common keys that might be product identifiers
      const potentialCommonKeys = haviKeys.filter(
        (key) =>
          aktifPOSKeys.includes(key) &&
          (key.toLowerCase().includes("kod") ||
            key.toLowerCase().includes("code") ||
            key.toLowerCase().includes("urun") ||
            key.toLowerCase().includes("product") ||
            key.toLowerCase().includes("item"))
      );

      console.log("Potential common keys:", potentialCommonKeys);

      if (potentialCommonKeys.length === 0) {
        // If no product identifiers found, just use any common keys
        const anyCommonKeys = haviKeys.filter((key) =>
          aktifPOSKeys.includes(key)
        );

        setCommonKeys(anyCommonKeys);
        if (anyCommonKeys.length > 0) {
          setSelectedKey(anyCommonKeys[0]);
        }
      } else {
        setCommonKeys(potentialCommonKeys);
        setSelectedKey(potentialCommonKeys[0]);
      }
    } catch (error) {
      console.error("Error while finding common keys:", error);
    }

    setIsProcessing(false);
  }, [haviData, aktifPOSData, haviDataCount, aktifPOSDataCount]);

  // Analyze data when key selection changes
  useEffect(() => {
    if (!selectedKey || isProcessing) return;

    setIsProcessing(true);
    console.log(`Comparing data using key: ${selectedKey}`);

    try {
      // Create maps for both datasets
      const haviMap = new Map();
      const posMap = new Map();

      // Handle AktifPOS data aggregation (in case there are multiple entries per product)
      const aggregatedPosData = new Map();

      aktifPOSData.forEach((item) => {
        if (item[selectedKey]) {
          const key = item[selectedKey];
          if (!aggregatedPosData.has(key)) {
            aggregatedPosData.set(key, { ...item });
          } else {
            // Find quantity fields and sum them
            const quantityFields = Object.keys(item).filter(
              (field) =>
                typeof item[field] === "number" ||
                (typeof item[field] === "string" &&
                  !isNaN(parseFloat(item[field])))
            );

            for (const field of quantityFields) {
              const currentValue = aggregatedPosData.get(key)[field];
              const addValue = item[field];

              if (currentValue !== undefined && addValue !== undefined) {
                // Convert to numbers and add
                const currentNum =
                  typeof currentValue === "number"
                    ? currentValue
                    : parseFloat(currentValue);

                const addNum =
                  typeof addValue === "number"
                    ? addValue
                    : typeof addValue === "string"
                    ? parseFloat(addValue)
                    : 0;

                aggregatedPosData.get(key)[field] = currentNum + addNum;
              }
            }
          }
        }
      });

      // Populate maps with data, using the selected key as identifier
      haviData.forEach((item) => {
        if (item[selectedKey]) {
          haviMap.set(item[selectedKey], item);
        }
      });

      aggregatedPosData.forEach((item, key) => {
        posMap.set(key, item);
      });

      // Compare the datasets
      let matching = 0;
      let mismatches = 0;
      const mismatchDetails: MismatchDetail[] = [];
      let inHaviNotInPos = 0;
      let inPosNotInHavi = 0;

      // List of potential quantity field names
      const quantityFields = [
        "miktar",
        "quantity",
        "adet",
        "qty",
        "amount",
        "satis_miktari",
        "stok",
        "stock",
        "tutar",
      ];

      haviMap.forEach((haviItem, key) => {
        if (posMap.has(key)) {
          // Product exists in both datasets
          matching++;

          // Find quantity fields in both datasets
          const haviQuantityField = Object.keys(haviItem).find((field) =>
            quantityFields.some((qf) => field.toLowerCase().includes(qf))
          );

          const posQuantityField = Object.keys(posMap.get(key)).find((field) =>
            quantityFields.some((qf) => field.toLowerCase().includes(qf))
          );

          if (haviQuantityField && posQuantityField) {
            const haviQty = parseFloat(haviItem[haviQuantityField]);
            const posQty = parseFloat(posMap.get(key)[posQuantityField]);

            if (Math.abs(haviQty - posQty) > 0.01) {
              mismatches++;
              mismatchDetails.push({
                product: key,
                productName: haviItem.urun_adi || haviItem.product_name || key,
                haviQty,
                posQty,
                difference: posQty - haviQty,
                haviField: haviQuantityField,
                posField: posQuantityField,
              });
            }
          }
        } else {
          // Product in HAVI but not in POS
          inHaviNotInPos++;
        }
      });

      // Find products in POS but not in HAVI
      posMap.forEach((_, key) => {
        if (!haviMap.has(key)) {
          inPosNotInHavi++;
        }
      });

      setComparisonResults({
        matching,
        mismatches,
        inHaviNotInPos,
        inPosNotInHavi,
        mismatchDetails,
      });
    } catch (error) {
      console.error("Error during data comparison:", error);
    }

    setIsProcessing(false);
  }, [selectedKey, haviData, aktifPOSData, isProcessing]);

  // Prepare chart data
  const overviewChartData = useMemo(() => {
    return {
      labels: ["Eşleşen", "Eşleşmeyen", "HAVI'de Olan", "POS'ta Olan"],
      datasets: [
        {
          label: "Ürün Dağılımı",
          data: [
            comparisonResults.matching - comparisonResults.mismatches,
            comparisonResults.mismatches,
            comparisonResults.inHaviNotInPos,
            comparisonResults.inPosNotInHavi,
          ],
          backgroundColor: [
            "rgba(75, 192, 192, 0.6)",
            "rgba(255, 99, 132, 0.6)",
            "rgba(255, 159, 64, 0.6)",
            "rgba(54, 162, 235, 0.6)",
          ],
          borderColor: [
            "rgba(75, 192, 192, 1)",
            "rgba(255, 99, 132, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(54, 162, 235, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [comparisonResults]);

  const mismatchChartData = useMemo(() => {
    // Sort by difference and get top 10
    const sortedMismatches = [...comparisonResults.mismatchDetails]
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .slice(0, 10);

    return {
      labels: sortedMismatches.map((item) => item.productName || item.product),
      datasets: [
        {
          label: "HAVI Miktar",
          data: sortedMismatches.map((item) => item.haviQty),
          backgroundColor: "rgba(255, 99, 132, 0.5)",
        },
        {
          label: "POS Miktar",
          data: sortedMismatches.map((item) => item.posQty),
          backgroundColor: "rgba(54, 162, 235, 0.5)",
        },
      ],
    };
  }, [comparisonResults.mismatchDetails]);

  if (isProcessing) {
    return (
      <Box textAlign="center" p={10}>
        <Spinner size="xl" />
        <Text mt={4}>Veriler Karşılaştırılıyor...</Text>
      </Box>
    );
  }

  if (commonKeys.length === 0) {
    return (
      <Alert status="warning">
        <AlertIcon />
        Verilerde ortak ürün tanımlayıcısı bulunamadı. Lütfen doğru formatta
        veri yüklediğinizden emin olun.
      </Alert>
    );
  }

  return (
    <Box>
      <Heading as="h3" size="lg" mb={4}>
        Veri Karşılaştırma Sonuçları
      </Heading>

      <Box mb={6}>
        <Text mb={2}>Ürün Tanımlayıcısı Seçin:</Text>
        <Select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          maxWidth="400px"
        >
          {commonKeys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </Select>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
        <Box p={4} borderWidth="1px" borderRadius="lg">
          <Heading as="h4" size="md" mb={4}>
            Genel Bakış
          </Heading>
          <Box height="300px">
            <Pie
              data={overviewChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: {
                      boxWidth: 15,
                      padding: 15,
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return ` ${context.label}: ${context.raw}`;
                      },
                    },
                  },
                },
              }}
            />
          </Box>
        </Box>

        <Box p={4} borderWidth="1px" borderRadius="lg">
          <Heading as="h4" size="md" mb={4}>
            Özet
          </Heading>
          <Text>Toplam Eşleşen Ürün: {comparisonResults.matching}</Text>
          <Text>Miktar Uyuşmazlığı Olan: {comparisonResults.mismatches}</Text>
          <Text>Sadece HAVI'de Olan: {comparisonResults.inHaviNotInPos}</Text>
          <Text>Sadece POS'ta Olan: {comparisonResults.inPosNotInHavi}</Text>
        </Box>
      </SimpleGrid>

      <Tabs isFitted variant="enclosed">
        <TabList>
          <Tab>En Büyük Uyuşmazlıklar</Tab>
          <Tab>Ürün Listesi</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {comparisonResults.mismatchDetails.length > 0 ? (
              <Box height="400px">
                <Bar
                  data={mismatchChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "top",
                      },
                      tooltip: {
                        callbacks: {
                          label: function (context) {
                            return ` ${context.dataset.label}: ${context.raw}`;
                          },
                        },
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          precision: 0,
                        },
                      },
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45,
                        },
                      },
                    },
                  }}
                />
              </Box>
            ) : (
              <Text>
                Uyuşmazlık bulunamadı veya karşılaştırılabilir miktar verisi
                yok.
              </Text>
            )}
          </TabPanel>

          <TabPanel>
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Ürün</Th>
                    <Th isNumeric>HAVI Miktar</Th>
                    <Th isNumeric>POS Miktar</Th>
                    <Th isNumeric>Fark</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {comparisonResults.mismatchDetails
                    .slice(0, 20)
                    .map((item, index) => (
                      <Tr key={index}>
                        <Td>{item.productName || item.product}</Td>
                        <Td isNumeric>{item.haviQty.toFixed(2)}</Td>
                        <Td isNumeric>{item.posQty.toFixed(2)}</Td>
                        <Td
                          isNumeric
                          color={item.difference > 0 ? "red.500" : "green.500"}
                        >
                          {item.difference.toFixed(2)}
                        </Td>
                      </Tr>
                    ))}
                </Tbody>
              </Table>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default DataComparisonView;
