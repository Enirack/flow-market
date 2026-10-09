import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AiService } from './ai.service';

describe('AiService (mode mock, AI_API_KEY vide)', () => {
  const originalEnv = { ...process.env };
  let service: AiService;

  beforeEach(() => {
    delete process.env.AI_API_KEY;
    service = new AiService();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('generates a title and description from raw input without calling any API', async () => {
    const result = await service.generateServiceListing('creation de logo moderne pour startup tech');

    expect(result.title.length).toBeGreaterThan(0);
    expect(result.description.length).toBeGreaterThan(0);
  });

  it('infers a category and price ceiling from a natural-language query', async () => {
    const result = await service.parseSearchQuery('je cherche un logo pas cher, moins de 50000');

    expect(result.category).toBe('design-graphique');
    expect(result.maxPrice).toBe(50000);
  });

  it('drafts a positive review for a high rating', async () => {
    const comment = await service.draftReview(5, 'rapide, professionnel');

    expect(comment.length).toBeGreaterThan(0);
    expect(comment.toLowerCase()).toContain('recommande');
  });

  it('flags obviously toxic content', async () => {
    const result = await service.moderateText('Ce prestataire est un escroc, arnaque totale');

    expect(result.flagged).toBe(true);
  });

  it('does not flag normal content', async () => {
    const result = await service.moderateText('Très bon travail, livré dans les temps.');

    expect(result.flagged).toBe(false);
  });
});
