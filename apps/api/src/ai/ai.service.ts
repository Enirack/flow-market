import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';

export interface GeneratedListing {
  title: string;
  description: string;
}

export interface ParsedSearchQuery {
  q?: string;
  category?: string;
  maxPrice?: number;
}

export interface ModerationResult {
  flagged: boolean;
  reason?: string;
}

/**
 * Fonctionnalites IA de la plateforme. Tant que AI_API_KEY est vide (mode dev
 * par defaut, meme logique que SMTP_HOST pour les emails), aucun appel reseau
 * n'est effectue : chaque methode retombe sur une heuristique locale.
 * Un echec de l'appel reel retombe egalement sur l'heuristique plutot que de
 * faire echouer la requete.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | undefined;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  async generateServiceListing(raw: string): Promise<GeneratedListing> {
    if (!this.client) return this.mockGenerateListing(raw);
    try {
      const text = await this.complete(
        "Tu es un assistant qui aide des prestataires de services (design, developpement, conseil...) a " +
          "rediger une fiche de service attractive pour une marketplace basee en Afrique de l'Ouest. A partir " +
          'de la description brute fournie par le prestataire, genere un titre accrocheur (moins de 60 ' +
          'caracteres) et une description detaillee (3 a 5 phrases, en francais). Reponds UNIQUEMENT avec un ' +
          'objet JSON de la forme {"title": "...", "description": "..."}, sans texte autour ni bloc markdown.',
        raw,
      );
      return this.parseJson<GeneratedListing>(text) ?? this.mockGenerateListing(raw);
    } catch (error) {
      this.logger.error(`generateServiceListing a échoué, repli local: ${(error as Error).message}`);
      return this.mockGenerateListing(raw);
    }
  }

  async parseSearchQuery(query: string): Promise<ParsedSearchQuery> {
    if (!this.client) return this.mockParseSearchQuery(query);
    try {
      const text = await this.complete(
        'Tu extrais des criteres de recherche structures a partir d\'une requete en langage naturel sur une ' +
          'marketplace de services (categories disponibles : "design-graphique", "developpement-web"). Reponds ' +
          'UNIQUEMENT avec un objet JSON {"q": "mots-cles ou chaine vide", "category": "slug ou absent", ' +
          '"maxPrice": nombre en XOF ou absent}, sans texte autour ni bloc markdown.',
        query,
      );
      return this.parseJson<ParsedSearchQuery>(text) ?? this.mockParseSearchQuery(query);
    } catch (error) {
      this.logger.error(`parseSearchQuery a échoué, repli local: ${(error as Error).message}`);
      return this.mockParseSearchQuery(query);
    }
  }

  async draftReview(rating: number, keywords: string): Promise<string> {
    if (!this.client) return this.mockDraftReview(rating, keywords);
    try {
      const text = await this.complete(
        'Tu rediges un avis client court et naturel (2 a 3 phrases, en francais) pour un service reserve sur ' +
          'une marketplace, a partir d\'une note sur 5 et de quelques mots-cles fournis par le client. Reponds ' +
          'UNIQUEMENT avec le texte de l\'avis, sans guillemets ni texte autour.',
        `Note : ${rating}/5. Mots-cles : ${keywords || 'aucun'}.`,
      );
      return text.trim() || this.mockDraftReview(rating, keywords);
    } catch (error) {
      this.logger.error(`draftReview a échoué, repli local: ${(error as Error).message}`);
      return this.mockDraftReview(rating, keywords);
    }
  }

  async moderateText(text: string): Promise<ModerationResult> {
    if (!this.client) return this.mockModerateText(text);
    try {
      const response = await this.complete(
        'Tu moderes du contenu pour une marketplace de services grand public. Analyse le texte fourni et ' +
          'signale s\'il contient des injures, du harcelement, du spam publicitaire ou des coordonnees de ' +
          'contact visant a contourner la plateforme. Reponds UNIQUEMENT avec un objet JSON {"flagged": ' +
          'true|false, "reason": "motif court ou absent"}, sans texte autour ni bloc markdown.',
        text,
      );
      return this.parseJson<ModerationResult>(response) ?? { flagged: false };
    } catch (error) {
      this.logger.error(`moderateText a échoué, repli local: ${(error as Error).message}`);
      return this.mockModerateText(text);
    }
  }

  private async complete(system: string, userMessage: string): Promise<string> {
    const response = await this.client!.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = response.content.find((b) => b.type === 'text');
    return block && block.type === 'text' ? block.text : '';
  }

  private parseJson<T>(text: string): T | undefined {
    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/```$/, '')
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return undefined;
    }
  }

  // --- Mode mock (sans cle API) : heuristiques locales, aucun appel reseau ---

  private mockGenerateListing(raw: string): GeneratedListing {
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    const words = trimmed.split(' ').filter(Boolean);
    const titleWords = words.slice(0, 6).join(' ');
    const title = titleWords ? titleWords.charAt(0).toUpperCase() + titleWords.slice(1) : 'Nouveau service';
    const description =
      trimmed.length >= 20
        ? trimmed
        : `${trimmed}. Un service professionnel, livré avec soin et dans les délais convenus. N'hésitez pas à me contacter pour discuter de votre projet.`;
    return { title, description };
  }

  private readonly searchStopWords = new Set([
    'je', 'cherche', 'recherche', 'veux', 'voudrais', 'besoin', "d'un", "d'une", 'un', 'une', 'des', 'le',
    'la', 'les', 'de', 'du', 'pour', 'avec', 'qui', 'quelqu\'un', 'pas', 'cher', 'chere', 'petit', 'budget',
    'moins', 'max', 'maximum', 'xof', 'fcfa', 'f', 'et', 'ou', 'rapide', 'rapidement', 'svp', 'merci',
  ]);

  private mockParseSearchQuery(query: string): ParsedSearchQuery {
    const lower = query.toLowerCase();
    const result: ParsedSearchQuery = {};

    const priceMatch = lower.match(/\d{3,7}/);
    if (priceMatch && /pas cher|petit budget|moins de|max|budget/.test(lower)) {
      result.maxPrice = Number(priceMatch[0]);
    }

    if (/logo|design|visuel|identité|identite/.test(lower)) {
      result.category = 'design-graphique';
    } else if (/site|web|développement|developpement|application|app\b/.test(lower)) {
      result.category = 'developpement-web';
    }

    const keywords = lower
      .replace(/[.,;!?]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !this.searchStopWords.has(word) && !/^\d+$/.test(word));
    const q = keywords.join(' ').trim();
    if (q) result.q = q;

    return result;
  }

  private mockDraftReview(rating: number, keywords: string): string {
    const kw = keywords.trim();
    const kwSentence = kw ? ` ${kw.charAt(0).toUpperCase() + kw.slice(1)}.` : '';

    if (rating >= 4) {
      return `Excellent travail, je recommande vivement ce prestataire.${kwSentence} Je referai appel à ses services.`;
    }
    if (rating === 3) {
      return `Prestation correcte dans l'ensemble.${kwSentence} Quelques points pourraient être améliorés.`;
    }
    return `Je suis mitigé sur cette prestation.${kwSentence} J'aurais attendu mieux au vu du tarif.`;
  }

  private readonly blockedTerms = ['merde', 'connard', 'salope', 'arnaque', 'escroc'];

  private mockModerateText(text: string): ModerationResult {
    const lower = text.toLowerCase();
    const hit = this.blockedTerms.find((term) => lower.includes(term));
    if (hit) return { flagged: true, reason: 'Langage inapproprié détecté' };

    const contactPattern = /(whatsapp|telegram|\+?\d{8,})/i;
    if (contactPattern.test(text)) {
      return { flagged: true, reason: 'Tentative de contournement de la plateforme détectée' };
    }

    return { flagged: false };
  }
}
