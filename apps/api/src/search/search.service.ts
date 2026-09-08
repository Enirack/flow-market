import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Meilisearch, type Index } from 'meilisearch';

export interface ServiceSearchDocument {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  categorySlug: string;
  providerId: string;
  providerName: string;
  providerSlug: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  createdAt: number;
}

export interface SearchServicesParams {
  q?: string;
  categorySlug?: string;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
  page: number;
  limit: number;
}

export interface SearchServicesResult {
  hits: ServiceSearchDocument[];
  total: number;
  page: number;
  totalPages: number;
}

const SERVICES_INDEX = 'services';

const SORT_MAP: Record<string, string[]> = {
  price_asc: ['price:asc'],
  price_desc: ['price:desc'],
  rating: ['rating:desc'],
  newest: ['createdAt:desc'],
};

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private readonly client = new Meilisearch({
    host: process.env.MEILI_HOST!,
    apiKey: process.env.MEILI_MASTER_KEY!,
  });

  async onModuleInit(): Promise<void> {
    try {
      const index = this.client.index(SERVICES_INDEX);
      await index.updateSettings({
        searchableAttributes: ['title', 'description', 'providerName', 'category'],
        filterableAttributes: ['categorySlug', 'providerId'],
        sortableAttributes: ['price', 'rating', 'createdAt'],
      });
    } catch (error) {
      this.logger.warn(`Could not configure Meilisearch index: ${(error as Error).message}`);
    }
  }

  private index(): Index<ServiceSearchDocument> {
    return this.client.index<ServiceSearchDocument>(SERVICES_INDEX);
  }

  async indexService(doc: ServiceSearchDocument): Promise<void> {
    await this.index().addDocuments([doc], { primaryKey: 'id' });
  }

  async removeService(id: string): Promise<void> {
    await this.index().deleteDocument(id);
  }

  async reindexAll(docs: ServiceSearchDocument[]): Promise<number> {
    await this.index().deleteAllDocuments();
    if (docs.length > 0) {
      await this.index().addDocuments(docs, { primaryKey: 'id' });
    }
    return docs.length;
  }

  async searchServices(params: SearchServicesParams): Promise<SearchServicesResult> {
    const { q = '', categorySlug, sort = 'relevance', page, limit } = params;

    const result = await this.index().search(q, {
      ...(categorySlug ? { filter: [`categorySlug = "${categorySlug}"`] } : {}),
      ...(SORT_MAP[sort] ? { sort: SORT_MAP[sort] } : {}),
      offset: (page - 1) * limit,
      limit,
    });

    return {
      hits: result.hits,
      total: result.estimatedTotalHits ?? 0,
      page,
      totalPages: Math.max(1, Math.ceil((result.estimatedTotalHits ?? 0) / limit)),
    };
  }
}
