/**
 * @fileOverview Zod schemas for the sales extraction flow.
 */

import { z } from 'zod';

export const SaleItemSchema = z.object({
  orderId: z.string().describe('The original order or transaction ID from the source file.'),
  sku: z.string().describe('The Stock Keeping Unit (SKU) of the product.'),
  productName: z.string().describe('The name of the product.'),
  quantity: z.number().describe('The quantity of the product sold.'),
  sellingPrice: z.number().describe('The selling price per unit of the product.'),
});
export type SaleItem = z.infer<typeof SaleItemSchema>;

export const ExtractedSalesSchema = z.object({
  sales: z.array(SaleItemSchema).describe('An array of sales extracted from the document.'),
  analysis: z.object({
      totalOrders: z.number().describe('The total number of unique orders found in the document.'),
      totalItems: z.number().describe('The total number of individual items sold (sum of quantities).'),
      totalRevenue: z.number().describe('The total revenue from all sales (sum of quantity * sellingPrice).'),
  }).describe('A summary analysis of the sales data.')
});
export type ExtractedSales = z.infer<typeof ExtractedSalesSchema>;
