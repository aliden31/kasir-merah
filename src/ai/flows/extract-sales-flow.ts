
'use server';
/**
 * @fileOverview A flow that extracts sales data from an Excel file.
 *
 * - extractSales - A function that handles the sales extraction process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { ExtractedSalesSchema } from '../schemas/extract-sales-schema';

const ExtractSalesInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "An Excel file containing sales data, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type ExtractSalesInput = z.infer<typeof ExtractSalesInputSchema>;
export type ExtractedSales = z.infer<typeof ExtractedSalesSchema>;


export async function extractSales(input: ExtractSalesInput): Promise<ExtractedSales> {
  return extractSalesFlow(input);
}


const extractSalesPrompt = ai.definePrompt({
  name: 'extractSalesPrompt',
  input: {schema: ExtractSalesInputSchema},
  output: {schema: ExtractedSalesSchema},
  prompt: `You are an expert at analyzing Excel files containing e-commerce sales data. Your task is to extract transaction details from the provided file and return them in a structured JSON format.

  **Instructions & Column Mapping:**
  1.  **File Format**: The input is an Excel file.
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

  **File Content:**
  {{{media url=fileDataUri}}}
  `,
});

const extractSalesFlow = ai.defineFlow(
  {
    name: 'extractSalesFlow',
    inputSchema: ExtractSalesInputSchema,
    outputSchema: ExtractedSalesSchema,
  },
  async (input) => {
    const {output} = await extractSalesPrompt(input);
    if (!output) {
      throw new Error("The AI model failed to return a valid output.");
    }
    return output;
  }
);
