
'use server';
/**
 * @fileOverview A flow that extracts sales data from an Excel file.
 *
 * - extractSales - A function that handles the sales extraction process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { ExtractedSalesSchema } from '../schemas/extract-sales-schema';
import * as XLSX from 'xlsx';


const ExtractSalesInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "An Excel file containing sales data, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});

const ExtractSalesTextContextSchema = z.object({
  fileContentAsCsv: z.string().describe("The content of the Excel file, converted to CSV format."),
});


export type ExtractSalesInput = z.infer<typeof ExtractSalesInputSchema>;
export type ExtractedSales = z.infer<typeof ExtractedSalesSchema>;


export async function extractSales(input: ExtractSalesInput): Promise<ExtractedSales> {
  return extractSalesFlow(input);
}

const extractSalesPrompt = ai.definePrompt({
  name: 'extractSalesPrompt',
  input: {schema: ExtractSalesTextContextSchema},
  output: {schema: ExtractedSalesSchema},
  prompt: `You are an expert at analyzing CSV data representing e-commerce sales. Your task is to extract transaction details from the provided CSV content and return them in a structured JSON format.

  **Instructions & Column Mapping:**
  1.  **File Format**: The input is CSV text.
  2.  **Identify Header**: The first row is the header. Locate it to identify columns.
  3.  **Order ID**: Use the column "Nomor Pesanan" for the 'orderId'.
  4.  **Product SKU**: CRITICALLY IMPORTANT: Use the column "Nomor Referensi SKU" for the 'sku'. This is the key for product mapping.
  5.  **Product Name**: Use the column "Nama Produk" for the 'productName'.
  6.  **Quantity**: Use the column "Jumlah" for the 'quantity'.
  7.  **Selling Price per Unit**: This is a CALCULATED field. You MUST calculate it by dividing the value in the "Total Harga Produk" column by the value in the "Jumlah" column. Do not use any other column for the selling price.
  8.  **Data Extraction**: Extract each row as a separate sale item.
  9.  **Analysis**: After extracting all items, perform a summary analysis:
      - 'totalOrders': Count the number of *unique* order IDs.
      - 'totalItems': Sum the 'quantity' for all extracted items.
      - 'totalRevenue': Calculate the total revenue by summing (quantity * sellingPrice) for all items.
  10. **Output**: Return the data strictly in the required JSON format. Ensure all numbers are actual numbers, not strings.

  **CSV Content:**
  {{{fileContentAsCsv}}}
  `,
});

const extractSalesFlow = ai.defineFlow(
  {
    name: 'extractSalesFlow',
    inputSchema: ExtractSalesInputSchema,
    outputSchema: ExtractedSalesSchema,
  },
  async (input) => {
    // 1. Convert the data URI to a Buffer.
    const base64Data = input.fileDataUri.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // 2. Read the Excel file from the buffer.
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // 3. Get the first sheet name and the worksheet.
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 4. Convert the worksheet to CSV format.
    const fileContentAsCsv = XLSX.utils.sheet_to_csv(worksheet);
    
    // 5. Call the prompt with the CSV content.
    const {output} = await extractSalesPrompt({ fileContentAsCsv });
    if (!output) {
      throw new Error("The AI model failed to return a valid output.");
    }
    return output;
  }
);
