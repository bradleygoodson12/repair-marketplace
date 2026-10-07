import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder',
});

export const REPAIR_EXTRACTION_MODEL = 'claude-sonnet-5';

export interface ExtractedRepairItem {
  title: string;
  description: string;
  categorySlug: string;
}

export interface ExtractedRepairDocument {
  items: ExtractedRepairItem[];
  propertyAddressLine1?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
}

/**
 * Sends a PDF (by its public URL) to Claude and asks it to break the document
 * into individual repair line items, each tagged with the best-matching
 * category slug from `categories`. Uses forced tool-use so the response is
 * always well-formed JSON rather than freeform prose.
 */
export async function extractRepairItemsFromPdf(
  pdfUrl: string,
  categories: { slug: string; name: string }[],
): Promise<ExtractedRepairDocument> {
  const categoryList = categories.map((c) => `- ${c.slug}: ${c.name}`).join('\n');

  const message = await anthropic.messages.create({
    model: REPAIR_EXTRACTION_MODEL,
    max_tokens: 4096,
    tools: [
      {
        name: 'extract_repair_items',
        description:
          'Record every distinct repair or maintenance item found in the document, each tagged with the best-matching contractor category.',
        input_schema: {
          type: 'object',
          properties: {
            propertyAddressLine1: { type: 'string', description: 'Street address, if present in the document' },
            propertyCity: { type: 'string' },
            propertyState: { type: 'string' },
            propertyZip: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Short title, e.g. "Leaking kitchen faucet"' },
                  description: {
                    type: 'string',
                    description: 'Full detail of the issue and any requested fix, in the document\'s own words where possible',
                  },
                  categorySlug: {
                    type: 'string',
                    description: 'The single best-matching category slug from the provided list',
                  },
                },
                required: ['title', 'description', 'categorySlug'],
              },
            },
          },
          required: ['items'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'extract_repair_items' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'url', url: pdfUrl },
          },
          {
            type: 'text',
            text: `This document is a home inspection report or repair addendum. Extract every distinct repair/maintenance item as its own entry — do not merge unrelated issues, and do not include section headers, summaries, or items explicitly marked as already resolved.

For each item, pick the single best-matching category slug from this list (use "handyman" only if nothing else fits):
${categoryList}

If the document clearly states a property address, include it; otherwise omit those fields.`,
          },
        ],
      },
    ],
  });

  const toolUseBlock = message.content.find((block) => block.type === 'tool_use');
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('Claude did not return structured repair items.');
  }

  return toolUseBlock.input as ExtractedRepairDocument;
}
