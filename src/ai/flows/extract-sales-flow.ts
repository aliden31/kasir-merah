
'use server';
/**
 * @fileOverview A Genkit flow for extracting sales data from a spreadsheet.
 * 
 * - extractSales - Extracts structured sales data from an Excel file.
 */

import { ai } from '@/ai/genkit';
import { ExtractedSalesSchema } from '@/ai/schemas/extract-sales-schema';
import { z } from 'zod';

export const ExtractSalesInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "An Excel file (.xlsx) containing sales data, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. The AI should prioritize columns with headers like 'SKU Gudang' for SKU, 'Nomor Pesanan' for Order ID, 'Jumlah' for quantity, and a price-related column like 'Harga Setelah Diskon' for the selling price."
    ),
});
export type ExtractSalesInput = z.infer<typeof ExtractSalesInputSchema>;
export type ExtractSalesOutput = z.infer<typeof ExtractedSalesSchema>;

export async function extractSales(input: ExtractSalesInput): Promise<ExtractSalesOutput> {
  return extractSalesFlow(input);
}

const extractSalesFlow = ai.defineFlow(
  {
    name: 'extractSalesFlow',
    inputSchema: ExtractSalesInputSchema,
    outputSchema: ExtractedSalesSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: `You are an expert data analyst specializing in e-commerce sales reports. Your task is to extract structured sales data from the provided Excel file.

      Follow these rules precisely:
      1.  **Identify Columns**: Carefully analyze the headers of the provided Excel data.
      2.  **Order ID**: Find a column that represents a unique order identifier. Common headers are 'Nomor Pesanan', 'Order ID', or similar.
      3.  **SKU**: The most important column is the product's Stock Keeping Unit. Prioritize a column named 'SKU Gudang'. If not present, look for 'SKU' or 'Kode Produk'.
      4.  **Product Name**: Find the column for the product's name, like 'Nama Produk'.
      5.  **Quantity**: Find the column for the quantity sold, usually named 'Jumlah' or 'Qty'.
      6.  **Selling Price**: Find the column for the unit selling price. This is often named 'Harga Setelah Diskon', 'Harga Jual', or 'Price'. This is the final price for one unit.
      7.  **Data Extraction**: Extract each row as a separate sale item.
      8.  **Analysis**: After extracting all items, perform a summary analysis:
          -   `totalOrders`: Count the number of *unique* order IDs.
          -   `totalItems`: Sum the 'quantity' for all extracted items.
          -   `totalRevenue`: Calculate the total revenue by summing (quantity * sellingPrice) for all items.
      9.  **Output**: Return the data strictly in the required JSON format. Ensure all numbers are actual numbers, not strings.

      Excel File Data:
      {{media url=fileDataUri}}`,
      output: {
        schema: ExtractedSalesSchema,
      },
      config: {
        temperature: 0,
      }
    });

    const output = llmResponse.output;
    if (!output) {
      throw new Error('Failed to extract sales data from the file.');
    }
    return output;
  }
);
