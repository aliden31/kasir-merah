
'use server';
/**
 * @fileOverview A Genkit flow for extracting sales data from a spreadsheet.
 * 
 * - extractSales - Extracts structured sales data from an Excel file.
 */

import { ai } from '@/ai/genkit';
import { ExtractedSalesSchema, ExtractSalesInputSchema, type ExtractSalesInput, type ExtractSalesOutput } from '@/ai/schemas/extract-sales-schema';

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
      prompt: `You are an expert data analyst specializing in e-commerce sales reports from Indonesian marketplaces. Your task is to extract structured sales data from the provided Excel file.

      Follow these rules precisely based on the provided column headers:
      1.  **Order ID**: Find the column named 'Nomor Pesanan'. This is the unique order identifier.
      2.  **SKU**: The most important column is the product's Stock Keeping Unit. Prioritize the column named 'Nomor Referensi SKU'. This value is the primary key for the product.
      3.  **Product Name**: Find the column named 'Nama Produk'.
      4.  **Quantity**: Find the column for the quantity sold, which is named 'Jumlah'.
      5.  **Selling Price (Per Unit)**: This is crucial. Calculate the selling price for a single unit. To do this, you must find the 'Total Harga Produk' column and divide its value by the value in the 'Jumlah' column for that same row. The result is the sellingPrice.
      6.  **Data Extraction**: Extract each row that contains a 'Nomor Pesanan' as a separate sale item. Ignore rows that are empty or part of a merged cell summary.
      7.  **Analysis**: After extracting all items, perform a summary analysis:
          - totalOrders: Count the number of *unique* 'Nomor Pesanan' values.
          - totalItems: Sum the 'Jumlah' for all extracted items.
          - totalRevenue: Calculate the total revenue by summing ('sellingPrice' * 'Jumlah') for all items.
      8.  **Output**: Return the data strictly in the required JSON format. Ensure all numbers are actual numbers, not strings.

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
