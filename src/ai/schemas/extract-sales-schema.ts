import {z} from 'zod';

const ExtractedSaleItemSchema = z.object({
  orderId: z.string().describe('The unique identifier for the order.'),
  sku: z.string().describe("The product's SKU from the 'Nomor Referensi SKU' column."),
  productName: z.string().describe("The name of the product from the 'Nama Produk' column."),
  quantity: z.number().int().gte(0).describe('The quantity of the item sold.'),
  sellingPrice: z.number().gte(0).describe('The calculated selling price per unit (Total Harga Produk / Jumlah).'),
});

export const ExtractedSalesSchema = z.object({
  items: z.array(ExtractedSaleItemSchema).describe('An array of all sales items extracted from the file.'),
  summary: z.object({
      totalOrders: z.number().int().describe('The total count of unique order IDs.'),
      totalItems: z.number().int().describe('The total sum of quantities for all items.'),
      totalRevenue: z.number().describe('The total revenue from all sales (sum of quantity * sellingPrice).'),
  }).describe('A summary analysis of the sales data.')
});

export type ExtractedSaleItem = z.infer<typeof ExtractedSaleItemSchema>;
export type ExtractedSales = z.infer<typeof ExtractedSalesSchema>;
