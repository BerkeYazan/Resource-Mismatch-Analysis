import * as fs from "fs";
import * as path from "path";
import { processAktifPOSFile } from "./aktifpos-processor";

// Path to the sample AktifPOS file
const aktifPOSFilePath = path.join("src", "assets", "Document.xls");

// Main function to test the AktifPOS processor
async function testAktifPOSProcessor() {
  console.log("Testing AktifPOS processor with file:", aktifPOSFilePath);

  try {
    // Read the sample file
    const fileBuffer = fs.readFileSync(aktifPOSFilePath);

    // Process the file
    const processed = processAktifPOSFile(fileBuffer.buffer);

    // Display results
    console.log(`Processed ${processed.length} entries`);

    // Show first 10 entries
    console.log("\nSample entries:");
    processed.slice(0, 10).forEach((entry, index) => {
      console.log(
        `[${index + 1}] Branch: ${entry.branch}, Product: ${
          entry.product
        }, Amount: ${entry.amount}`
      );
    });

    // Count by branch
    const branchCounts = processed.reduce((acc, curr) => {
      acc[curr.branch] = (acc[curr.branch] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("\nEntries by branch:");
    Object.entries(branchCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([branch, count]) => {
        console.log(`${branch}: ${count} products`);
      });

    // Count by product
    const productCounts = processed.reduce((acc, curr) => {
      acc[curr.product] = (acc[curr.product] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("\nTop 20 products by store count:");
    Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([product, count]) => {
        console.log(`${product}: available in ${count} stores`);
      });

    // Write output to JSON for inspection
    const outputPath = path.join("src", "assets", "processed-aktifpos.json");
    fs.writeFileSync(outputPath, JSON.stringify(processed, null, 2));
    console.log(`\nOutput written to ${outputPath}`);

    // Calculate total amount
    const totalAmount = processed.reduce((sum, entry) => sum + entry.amount, 0);
    console.log(`\nTotal amount across all entries: ${totalAmount.toFixed(2)}`);
  } catch (error) {
    console.error("Error during testing:", error);
  }
}

// Run the test
testAktifPOSProcessor().catch(console.error);
