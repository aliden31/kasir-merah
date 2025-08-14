
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { extractSales, ExtractSalesInput } from './extract-sales-flow';

const PdfToExcelInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A PDF or image file containing sales data, provided as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type PdfToExcelInput = z.infer<typeof PdfToExcelInputSchema>;

const PdfToExcelOutputSchema = z.object({
  excelDataB64: z.string().optional().describe("The generated Excel file data as a Base64 encoded string."),
  error: z.string().optional().describe("An error message if the conversion failed."),
});
export type PdfToExcelOutput = z.infer<typeof PdfToExcelOutputSchema>;

export async function convertPdfToExcel(input: PdfToExcelInput): Promise<PdfToExcelOutput> {
  return await pdfToExcelFlow(input);
}

const pdfToExcelFlow = ai.defineFlow(
  {
    name: 'pdfToExcelFlow',
    inputSchema: PdfToExcelInputSchema,
    outputSchema: PdfToExcelOutputSchema,
  },
  async (input) => {
    const extractedData = await extractSales(input);
    
    if (!extractedData || extractedData.sales.length === 0) {
        return { error: 'Tidak ada data yang dapat diekstrak dari file.' };
    }

    const allItems = extractedData.sales.flatMap(sale => 
        sale.items.map(item => ({
            "Nama SKU": item.name,
            "SKU": item.sku,
            "Jumlah": item.quantity,
            "Harga Satuan (IDR)": item.price,
            "Total (IDR)": item.price * item.quantity,
        }))
    );

    if (allItems.length === 0) {
        return { error: 'Tidak ada item penjualan yang ditemukan dalam data yang diekstrak.' };
    }

    const worksheet = XLSX.utils.json_to_sheet(allItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Penjualan');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

    return { excelDataB64: wbout };
  }
);

    