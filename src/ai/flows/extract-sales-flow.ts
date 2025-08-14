
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
    ExtractSalesInputSchema,
    ExtractSalesOutputSchema,
} from '@/ai/schemas/extract-sales-schema';

export type ExtractSalesInput = z.infer<typeof ExtractSalesInputSchema>;
export type ExtractSalesOutput = z.infer<typeof ExtractSalesOutputSchema>;

const extractionPrompt = ai.definePrompt({
    name: 'extractSalesPrompt',
    input: { schema: ExtractSalesInputSchema },
    output: { schema: ExtractSalesOutputSchema },
    prompt: `You are an expert data extraction agent. Your task is to analyze the provided file (image or PDF) containing one or more shipping labels or delivery notes ("Daftar Pengiriman").

You have been provided with a list of existing products in the database. Use this list as your primary reference for matching items.
Existing Products:
{{#if products}}
  {{#each products}}
- SKU/ID: {{id}}, Name: {{name}}
  {{/each}}
{{else}}
- No products in the database.
{{/if}}

Extract the following information for each distinct delivery note you find in the document:
1.  **items**: A list of all products. For each product, extract:
    -   **sku**: Match the product from the file to the "Existing Products" list. Use the existing product's SKU/ID if a confident match is found based on name or code. If no match is found, generate a logical, consistent, and unique SKU based on the product name (e.g., 'GLASWOOL 1M KUNING' could become 'GLW-KNG-1M').
    -   **name**: The full name or description of the product (e.g., 'GLASWOOL 1M KUNING', 'ECERAN PUTIH 25 X 30 CM').
    -   **quantity**: The number of units for that product.
    -   **price**: The price per unit of the product.
2.  **total**: The final total amount for that specific delivery note.

Carefully analyze the entire document. There might be multiple delivery notes on a single page. Return each one as a separate object in the 'sales' array.

Analyze this file: {{media url=fileDataUri}}
`,
});

const extractSalesFlow = ai.defineFlow(
    {
        name: 'extractSalesFlow',
        inputSchema: ExtractSalesInputSchema,
        outputSchema: ExtractSalesOutputSchema,
    },
    async (input) => {
        const { output } = await extractionPrompt(input);
        return output!;
    }
);

export async function extractSales(input: ExtractSalesInput): Promise<ExtractSalesOutput> {
    return await extractSalesFlow(input);
}
