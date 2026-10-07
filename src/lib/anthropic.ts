import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder',
});

export const REPAIR_EXTRACTION_MODEL = 'claude-sonnet-5';

const extractedRepairItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  categorySlug: z.string(),
  // Claude's tool-use occasionally returns a numeric field as a numeric
  // string even when the schema says integer — coerce rather than reject.
  pageNumber: z.coerce.number().int(),
});

const extractedRepairDocumentSchema = z.object({
  items: z.array(z.unknown()).default([]),
  propertyAddressLine1: z.string().optional(),
  propertyCity: z.string().optional(),
  propertyState: z.string().optional(),
  propertyZip: z.string().optional(),
});

export type ExtractedRepairItem = z.infer<typeof extractedRepairItemSchema>;
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
    max_tokens: 16000,
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
                  pageNumber: {
                    type: 'integer',
                    description: '1-indexed page number this item (and any related photo) appears on',
                  },
                },
                required: ['title', 'description', 'categorySlug', 'pageNumber'],
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

Also record which page number each item appears on — this is used to attach that page's photo to the request, so accuracy matters here.

If the document clearly states a property address, include it; otherwise omit those fields.`,
          },
        ],
      },
    ],
  });

  if (message.stop_reason === 'max_tokens') {
    throw new Error('That document has too many items to analyze in one pass — try splitting it up.');
  }

  const toolUseBlock = message.content.find((block) => block.type === 'tool_use');
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('Claude did not return structured repair items.');
  }

  const preview = JSON.stringify(toolUseBlock.input).slice(0, 500);

  // Claude's tool-use occasionally serializes the `items` array as a JSON
  // string instead of a native array (seen in practice on larger
  // extractions) -- normalize before validating.
  let normalizedInput = toolUseBlock.input;
  let itemsParseError: string | null = null;
  if (
    normalizedInput &&
    typeof normalizedInput === 'object' &&
    'items' in normalizedInput &&
    typeof (normalizedInput as { items: unknown }).items === 'string'
  ) {
    const itemsString = (normalizedInput as { items: string }).items;
    try {
      const parsedItems = JSON.parse(itemsString);
      normalizedInput = { ...normalizedInput, items: parsedItems };
    } catch (e) {
      itemsParseError = `items was a ${itemsString.length}-char string; JSON.parse failed: ${
        e instanceof Error ? e.message : String(e)
      }. Last 300 chars: ${itemsString.slice(-300)}`;
    }
  }

  const parsed = extractedRepairDocumentSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    throw new Error(
      `Claude's response didn't match the expected format. ${
        itemsParseError ?? `Zod issues: ${JSON.stringify(parsed.error.issues).slice(0, 300)}`
      } Raw response (first 500 chars): ${preview}`,
    );
  }

  // Validate items individually so one malformed entry doesn't discard the
  // whole document — this is the step that previously failed all-or-nothing.
  const validItems: ExtractedRepairItem[] = [];
  const itemErrors: string[] = [];
  for (const rawItem of parsed.data.items) {
    const itemResult = extractedRepairItemSchema.safeParse(rawItem);
    if (itemResult.success) {
      validItems.push(itemResult.data);
    } else {
      itemErrors.push(itemResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '));
    }
  }

  if (validItems.length === 0 && parsed.data.items.length > 0) {
    throw new Error(
      `Claude returned ${parsed.data.items.length} item(s) but none matched the expected shape. First error: ${itemErrors[0]}. Raw response: ${preview}`,
    );
  }

  return {
    items: validItems,
    propertyAddressLine1: parsed.data.propertyAddressLine1,
    propertyCity: parsed.data.propertyCity,
    propertyState: parsed.data.propertyState,
    propertyZip: parsed.data.propertyZip,
  };
}
