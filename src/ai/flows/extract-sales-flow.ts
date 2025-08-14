
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

Extract the following information for each distinct delivery note you find in the document:
1.  **items**: A list of all products. For each product, extract:
    -   **sku**: The product's SKU or code (e.g., 'GLW-KNG-1M', 'PT-ECR-2530').
    -   **name**: The full name or description of the product (e.g., 'GLASWOOL 1M KUNING', 'ECERAN PUTIH 25 X 30 CM').
    -   **quantity**: The number of units for that product.
    -   **price**: The price per unit of the product.
2.  **total**: The final total amount for that specific delivery note.

The user has specified that SKUs are crucial. If you cannot find a clear SKU, try to generate a logical, consistent, and unique one based on the product name. For example, 'GLASWOOL 1M KUNING' could become 'GLW-KNG-1M'. 'PUTIH 30X60 CM' could be 'PTH-3060'.

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
