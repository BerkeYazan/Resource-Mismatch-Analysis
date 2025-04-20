import { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Text,
  Input,
  VStack,
  useToast,
  Flex,
  Badge,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { processAktifPOSFile } from "../aktifpos-processor";
import { FiUpload, FiFile, FiEdit } from "react-icons/fi";
import { Spinner } from "@chakra-ui/react";

// Define interface for data types
interface ExcelRow {
  [key: string]: string | number | Date | boolean | undefined;
}

interface FileUploaderProps {
  onDataLoaded: (data: ExcelRow[]) => void;
  id?: string;
  fileType?: "havi" | "aktifpos" | "recipe";
  onFileUploaded?: (file: File) => void;
  isLoading?: boolean;
  accept?: string;
  initialSuccess?: boolean;
  initialFileName?: string;
}

function handleExcelParsing(file: File): Promise<ExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log(
          `Parsing Excel file: ${file.name}, size: ${file.size} bytes`
        );

        if (!e.target?.result) {
          throw new Error("FileReader did not return any data");
        }

        // Use array buffer for more reliable parsing
        const arrayBuffer = e.target.result as ArrayBuffer;

        // Read with raw values - very important for proper data extraction
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
          type: "array",
          raw: true,
          cellText: false,
          cellDates: true,
        });

        // Log full workbook info for debugging
        console.log("Full workbook info:", {
          sheetNames: workbook.SheetNames,
          sheetCount: workbook.SheetNames.length,
          props: workbook.Props,
        });

        console.log(`Workbook sheets:`, workbook.SheetNames);

        if (workbook.SheetNames.length === 0) {
          throw new Error("Excel file has no sheets");
        }

        // Use first sheet by default
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          throw new Error(`Could not find worksheet: ${sheetName}`);
        }

        // Try to get header row from worksheet
        const headerRow: string[] = [];

        // Get headers from first row, which might have column names
        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:Z1");
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
          if (cell && cell.v) {
            headerRow.push(String(cell.v).trim());
          } else {
            // Use column letter as header for unnamed columns
            headerRow.push(XLSX.utils.encode_col(c));
          }
        }

        console.log("Excel headers:", headerRow);

        // Extract data with headers
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
          header: headerRow,
          raw: true,
          defval: "",
          blankrows: false,
        });

        // Add more debug info
        console.log("Raw Excel data structure:", {
          type: typeof rawData,
          isArray: Array.isArray(rawData),
          length: rawData.length,
          firstRowKeys: rawData.length > 0 ? Object.keys(rawData[0] || {}) : [],
          firstRowValues:
            rawData.length > 0 ? Object.values(rawData[0] || {}) : [],
        });

        console.log(`Raw data rows: ${rawData.length}`);

        if (rawData.length > 0) {
          console.log("First row sample:", JSON.stringify(rawData[0], null, 2));
          console.log(
            "Second row sample:",
            JSON.stringify(rawData[1], null, 2)
          );
        }

        if (rawData.length === 0) {
          // Try again with default headers if we couldn't get data
          const rawDataWithDefaultHeaders = XLSX.utils.sheet_to_json(
            worksheet,
            {
              raw: true,
              defval: "",
              blankrows: false,
            }
          );

          if (rawDataWithDefaultHeaders.length > 0) {
            console.log(
              `Using default headers, found ${rawDataWithDefaultHeaders.length} rows`
            );

            // Add file metadata
            const processedRows = rawDataWithDefaultHeaders.map((row) => ({
              ...(row as object),
              "Dosya Adı": file.name,
            }));

            resolve(processedRows as ExcelRow[]);
            return;
          }

          // If we still couldn't get data, try one more approach with explicit cell reading
          try {
            console.log("Attempting to read cells directly");
            const data: ExcelRow[] = [];
            const range = XLSX.utils.decode_range(
              worksheet["!ref"] || "A1:Z100"
            );

            for (
              let r = range.s.r + 1;
              r <= Math.min(range.e.r, range.s.r + 100);
              r++
            ) {
              const row: ExcelRow = {};
              let hasData = false;

              for (let c = range.s.c; c <= range.e.c; c++) {
                const cellAddress = XLSX.utils.encode_cell({ r, c });
                const headerAddress = XLSX.utils.encode_cell({
                  r: range.s.r,
                  c,
                });
                const headerCell = worksheet[headerAddress];
                const cell = worksheet[cellAddress];

                const header = headerCell?.v
                  ? String(headerCell.v)
                  : XLSX.utils.encode_col(c);

                if (cell && cell.v !== undefined) {
                  row[header] = cell.v;
                  hasData = true;
                } else {
                  row[header] = "";
                }
              }

              if (hasData) {
                row["Dosya Adı"] = file.name;
                data.push(row);
              }
            }

            if (data.length > 0) {
              console.log(`Direct cell reading found ${data.length} rows`);
              resolve(data);
              return;
            }
          } catch (cellReadError) {
            console.error("Error during direct cell reading:", cellReadError);
            // Continue to the general error handler
          }

          throw new Error("No data found in Excel file");
        }

        // Add file metadata
        const processedRows = rawData.map((row) => ({
          ...(row as object),
          "Dosya Adı": file.name,
        }));

        console.log(`Processed ${processedRows.length} rows from Excel file`);
        resolve(processedRows as ExcelRow[]);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(new Error("Error reading the file"));
    };

    reader.readAsArrayBuffer(file);
  });
}

const FileUploader = ({
  onDataLoaded,
  id = "file-upload",
  fileType,
  onFileUploaded,
  isLoading: externalIsLoading = false,
  accept = ".xlsx,.xls",
  initialSuccess = false,
  initialFileName = "",
}: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState(initialFileName);
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(initialSuccess);
  const isLoading = externalIsLoading || internalIsLoading;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Update state when props change - this ensures file uploader shows the minimized state
  // when navigating back to a step with already uploaded data
  useEffect(() => {
    if (initialSuccess && !isSuccess) {
      setIsSuccess(true);
    }

    if (initialFileName && !fileName) {
      setFileName(initialFileName);
    }
  }, [initialSuccess, initialFileName, isSuccess, fileName]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileParsing = useCallback(
    async (file: File) => {
      setInternalIsLoading(true);
      setFileName(file.name);

      if (onFileUploaded) {
        onFileUploaded(file);
      }

      console.log(
        `Starting to process file: ${file.name}, type: ${fileType || "unknown"}`
      );

      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      try {
        // If it's an aktifpos file, try to use specialized processing first
        if (
          fileType === "aktifpos" &&
          (fileExtension === "xlsx" || fileExtension === "xls")
        ) {
          try {
            console.log("Using specialized AktifPOS processor");
            // We need to read the file as ArrayBuffer first
            const arrayBuffer = await new Promise<ArrayBuffer>(
              (resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  if (e.target?.result) {
                    resolve(e.target.result as ArrayBuffer);
                  } else {
                    reject(new Error("Failed to read file"));
                  }
                };
                reader.onerror = () => reject(new Error("Error reading file"));
                reader.readAsArrayBuffer(file);
              }
            );

            const processedData = await processAktifPOSFile(arrayBuffer);
            if (processedData && processedData.length > 0) {
              console.log(
                `AktifPOS specialized processing complete: ${processedData.length} rows`
              );
              // Convert AktifPOSEntry[] to ExcelRow[]
              const convertedData = processedData.map((item) => {
                return {
                  ...item,
                  "Dosya Adı": file.name,
                } as unknown as ExcelRow;
              });
              onDataLoaded(convertedData);
              setInternalIsLoading(false);
              setIsSuccess(true);
              return;
            } else {
              console.log(
                "AktifPOS specialized processing failed, falling back to general Excel parser"
              );
            }
          } catch (aktifposError) {
            console.error(
              "Error in AktifPOS specialized processing:",
              aktifposError
            );
            console.log("Falling back to general Excel parsing");
            // Continue to general parsing
          }
        }

        if (fileExtension === "csv") {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              console.log(
                `CSV parsing complete, ${results.data.length} rows found`
              );
              console.log("Sample data:", results.data.slice(0, 3));
              onDataLoaded(results.data as ExcelRow[]);
              console.log("onDataLoaded callback called for CSV data");
              setInternalIsLoading(false);
              setIsSuccess(true);
            },
            error: (error) => {
              console.error("Error parsing CSV:", error);
              toast({
                title: "Hata",
                description: `CSV dosyası işlenirken bir hata oluştu: ${error.message}`,
                status: "error",
                duration: 5000,
                isClosable: true,
              });
              setInternalIsLoading(false);
              setIsSuccess(false);
            },
          });
        } else if (fileExtension === "xlsx" || fileExtension === "xls") {
          try {
            console.log(`Processing Excel file: ${file.name}`);
            const parsedData = await handleExcelParsing(file);

            if (!parsedData || parsedData.length === 0) {
              throw new Error(
                "Dosyada veri bulunamadı veya uygun bir format değil"
              );
            }

            console.log(
              `Excel parsing complete, ${parsedData.length} rows found, first 3 rows:`,
              parsedData.slice(0, 3)
            );

            try {
              // Ensure this call completes
              console.log("About to call onDataLoaded with Excel data");
              onDataLoaded(parsedData);
              console.log(
                "onDataLoaded callback called for Excel data successfully"
              );
            } catch (callbackError) {
              console.error("Error in onDataLoaded callback:", callbackError);
              throw callbackError;
            }
          } catch (error: unknown) {
            console.error("Error parsing Excel:", error);
            toast({
              title: "Hata",
              description: `Excel dosyası işlenirken bir hata oluştu: ${
                error instanceof Error ? error.message : "Bilinmeyen hata"
              }`,
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          } finally {
            setInternalIsLoading(false);
            setIsSuccess(true);
          }
        } else {
          console.error("Unsupported file format");
          toast({
            title: "Desteklenmeyen Dosya Formatı",
            description: "Lütfen CSV veya Excel (xlsx/xls) dosyası yükleyin",
            status: "warning",
            duration: 5000,
            isClosable: true,
          });
          setInternalIsLoading(false);
          setIsSuccess(false);
        }
      } catch (error) {
        console.error("File processing error:", error);
        setIsSuccess(false);
        toast({
          title: "Hata",
          description: "Dosya işlenirken beklenmeyen bir hata oluştu",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setInternalIsLoading(false);
      }
    },
    [onDataLoaded, toast, fileType, onFileUploaded]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileParsing(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      console.log(
        `File selected for upload: ${file.name}, size: ${file.size}, type: ${file.type}`
      );
      handleFileParsing(file);
    }
  };

  // Function to reset file upload state
  const resetFileUpload = () => {
    setFileName("");
    setIsSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Function to get icon based on file type
  const getFileIcon = () => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") {
      return <FiFile color="#21A366" />; // Excel green color
    }
    if (ext === "csv") {
      return <FiFile color="#217346" />; // CSV color
    }
    return <FiFile />;
  };

  // Function to get file type label
  const getFileTypeLabel = () => {
    if (fileType === "recipe") {
      return "Reçete";
    }
    if (fileType === "havi") {
      return "HAVI";
    }
    if (fileType === "aktifpos") {
      return "AktifPOS";
    }
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") {
      return "Excel";
    }
    if (ext === "csv") {
      return "CSV";
    }
    return "Dosya";
  };

  return (
    <VStack align="stretch" spacing={4} width="100%">
      {isSuccess ? (
        // Enhanced minimized version when file is successfully uploaded
        <Flex
          p={3}
          borderWidth="1px"
          borderRadius="md"
          borderColor="accent.primary"
          bg="bg.tertiary"
          align="center"
          justify="space-between"
          _hover={{
            boxShadow: "sm",
            borderColor: "accent.secondary",
          }}
          transition="all 0.2s"
        >
          <Flex align="center" flex="1">
            <Box
              mr={3}
              fontSize="lg"
              color="accent.primary"
              p={2}
              borderRadius="md"
              bg="bg.primary"
            >
              {getFileIcon()}
            </Box>
            <Box>
              <Text
                fontSize="sm"
                fontWeight="medium"
                isTruncated
                maxWidth="200px"
              >
                {fileName}
              </Text>
              <Text fontSize="xs" color="text.secondary">
                {getFileTypeLabel()} verisi yüklendi
              </Text>
            </Box>
            <Badge ml={3} colorScheme="green" variant="subtle" fontSize="xs">
              AKTIF
            </Badge>
          </Flex>
          <Tooltip
            label={`${fileName} dosyasını değiştir`}
            placement="top"
            hasArrow
          >
            <IconButton
              aria-label="Dosyayı değiştir"
              icon={<FiEdit />}
              size="sm"
              variant="ghost"
              onClick={resetFileUpload}
              color="text.secondary"
              _hover={{ color: "accent.primary" }}
            />
          </Tooltip>
        </Flex>
      ) : (
        // Original file uploader UI
        <Box
          p={4}
          borderWidth="1px"
          borderRadius="md"
          borderColor={isDragging ? "accent.primary" : "border.primary"}
          bg={isDragging ? "bg.tertiary" : "transparent"}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          transition="all 0.2s"
          textAlign="center"
        >
          <VStack spacing={2} justify="center">
            <Text fontSize="sm" color="text.secondary" mb={2}>
              Dosyayı buraya sürükleyin
            </Text>
            <Text fontSize="sm" color="text.tertiary" mb={3}>
              veya
            </Text>
            <Input
              ref={fileInputRef}
              type="file"
              height="auto"
              accept={accept}
              onChange={handleFileChange}
              display="none"
              id={id}
            />
            <Button
              as="label"
              htmlFor={id}
              variant="outline"
              size="sm"
              cursor="pointer"
              isLoading={isLoading}
              loadingText="Yükleniyor..."
              borderColor="text.primary"
              color="text.primary"
              _hover={{
                bg: "bg.primary",
                borderColor: "accent.primary",
                color: "accent.primary",
              }}
              fontWeight="normal"
              px={6}
              leftIcon={isLoading ? <Spinner size="sm" /> : <FiUpload />}
              isDisabled={isLoading}
            >
              Dosya Seçin
            </Button>
          </VStack>
        </Box>
      )}

      {!isSuccess && fileName && (
        <Text fontSize="sm" color="accent.primary" fontWeight="medium">
          Yüklenen dosya: {fileName}
        </Text>
      )}

      {isLoading && (
        <Text fontSize="sm" color="text.secondary" mt={2}>
          Dosya işleniyor, lütfen bekleyin...
        </Text>
      )}

      {/* Debug info hidden */}
      <Box display="none">
        <Text as="div">Debug bilgileri:</Text>
        <Text as="div">Dosya adı: {fileName || "Henüz dosya seçilmedi"}</Text>
        <Text as="div">
          Yükleme durumu: {isLoading ? "Yükleniyor..." : "Bekleniyor"}
        </Text>
        <Text as="div">Dosya tipi: {fileType || "Belirtilmemiş"}</Text>
      </Box>

      {!isSuccess && (
        <Text fontSize="xs" mt={2} color="text.tertiary">
          Desteklenen formatlar: .xlsx, .xls
        </Text>
      )}
    </VStack>
  );
};

export default FileUploader;
