
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const ExtractSalesInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A PDF or image file containing sales data, provided as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  products: z.array(ProductSchema).optional().describe("A list of existing products in the database to help with matching."),
});

const SaleItemSchema = z.object({
    sku: z.string().describe("The SKU or a generated unique identifier for the product. Should match an existing product ID if possible."),
    name: z.string().describe("The name of the product."),
    quantity: z.number().describe("The quantity of the product sold."),
    price: z.number().describe("The price per unit of the product."),
});

const SaleSchema = z.object({
    items: z.array(SaleItemSchema).describe("List of items in the sale."),
    total: z.number().describe("The total amount for this specific sale."),
});

export const ExtractSalesOutputSchema = z.object({
  sales: z.array(SaleSchema).describe("An array of sales extracted from the document."),
});

export type ExtractedSale = z.infer<typeof SaleSchema>;
export type ExtractedSaleItem = z.infer<typeof SaleItemSchema>;
