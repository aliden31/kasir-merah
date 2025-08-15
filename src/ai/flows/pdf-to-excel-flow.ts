
'use server';
/**
 * @fileOverview A flow that converts a PDF file to an Excel file.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import * as XLSX from 'xlsx';

const PdfToExcelInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A PDF file containing sales data, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type PdfToExcelInput = z.infer<typeof PdfToExcelInputSchema>;

const PdfToExcelOutputSchema = z.object({
  excelDataUri: z
    .string()
    .describe(
      "The converted Excel file as a data URI with Base64 encoding."
    ),
});
export type PdfToExcelOutput = z.infer<typeof PdfToExcelOutputSchema>;

export async function pdfToExcel(input: PdfToExcelInput): Promise<PdfToExcelOutput> {
  return pdfToExcelFlow(input);
}

const pdfToExcelFlow = ai.defineFlow(
  {
    name: 'pdfToExcelFlow',
    inputSchema: PdfToExcelInputSchema,
    outputSchema: PdfToExcelOutputSchema,
  },
  async (input) => {
    // Placeholder implementation
    const salesData = [
        { SKU: '123', 'Nama Produk': 'Produk Contoh 1', 'Jumlah': 2, 'Harga Satuan': 10000, 'Total': 20000 },
        { SKU: '456', 'Nama Produk': 'Produk Contoh 2', 'Jumlah': 1, 'Harga Satuan': 15000, 'Total': 15000 },
    ];
    
    // 2. Create a new workbook and a worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(salesData);

    // 3. Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Penjualan');

    // 4. Generate the Excel file in Base64
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

    // 5. Create the data URI
    const excelDataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;

    return { excelDataUri };
  }
);
