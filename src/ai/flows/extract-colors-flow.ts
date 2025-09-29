'use server';
/**
 * @fileOverview An AI flow to extract dominant colors from an image.
 *
 * - extractColors - Extracts two dominant colors for a gradient.
 * - ExtractColorsInput - The input type for the extractColors function.
 * - ExtractColorsOutput - The return type for the extractColors function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractColorsInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractColorsInput = z.infer<typeof ExtractColorsInputSchema>;

const ExtractColorsOutputSchema = z.object({
  colors: z
    .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
    .length(2)
    .describe('An array of two hex color codes, e.g., ["#FFFFFF", "#000000"].'),
});
export type ExtractColorsOutput = z.infer<typeof ExtractColorsOutputSchema>;

export async function extractColors(
  input: ExtractColorsInput
): Promise<ExtractColorsOutput> {
  return extractColorsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractColorsPrompt',
  input: { schema: ExtractColorsInputSchema },
  output: { schema: ExtractColorsOutputSchema },
  prompt: `You are an expert color palette designer. Analyze the provided image and identify the two most dominant and aesthetically pleasing colors.

Return these two colors as an array of two hex color codes that would look good in a gradient.

Image: {{media url=imageDataUri}}`,
});

const extractColorsFlow = ai.defineFlow(
  {
    name: 'extractColorsFlow',
    inputSchema: ExtractColorsInputSchema,
    outputSchema: ExtractColorsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
