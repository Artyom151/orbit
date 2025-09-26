'use server';
/**
 * @fileOverview An AI flow to generate music recommendations.
 *
 * - createMusicMix - A function that suggests new music based on user's favorites.
 * - CreateMusicMixInput - The input type for the createMusicMix function.
 * - CreateMusicMixOutput - The return type for the createMusicMix function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecommendedTrackSchema = z.object({
  artist: z.string().describe('The artist of the recommended song.'),
  song: z.string().describe('The title of the recommended song.'),
});

const CreateMusicMixInputSchema = z.object({
  favorites: z
    .array(
      z.object({
        artist: z.string(),
        song: z.string(),
      })
    )
    .describe('A list of the user\'s favorite songs and artists.'),
});
export type CreateMusicMixInput = z.infer<typeof CreateMusicMixInputSchema>;

const CreateMusicMixOutputSchema = z.object({
  recommendations: z
    .array(RecommendedTrackSchema)
    .describe('A list of 10 recommended tracks.'),
});
export type CreateMusicMixOutput = z.infer<typeof CreateMusicMixOutputSchema>;

export async function createMusicMix(
  input: CreateMusicMixInput
): Promise<CreateMusicMixOutput> {
  return createMusicMixFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createMusicMixPrompt',
  input: { schema: CreateMusicMixInputSchema },
  output: { schema: CreateMusicMixOutputSchema },
  prompt: `You are an expert music curator and DJ. A user has provided you with a list of their favorite songs. 
Your task is to recommend 10 new songs that they might like. 
The recommendations should be similar in genre, mood, or artist, but should not include songs from the user's favorites list.

User's favorite tracks:
{{#each favorites}}
- Artist: {{artist}}, Song: {{song}}
{{/each}}

Generate a list of 10 new song recommendations.`,
});

const createMusicMixFlow = ai.defineFlow(
  {
    name: 'createMusicMixFlow',
    inputSchema: CreateMusicMixInputSchema,
    outputSchema: CreateMusicMixOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
