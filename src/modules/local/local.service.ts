import {
  BadGatewayException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { get_response } from '../../common/helpers/get-response.helper.js';
import { PrismaService } from '../prisma/prisma.service.js';

type PlacePrediction = {
  placeId: string;
  text?: { text: string };
  structuredFormat?: {
    mainText?: { text: string };
    secondaryText?: { text: string };
  };
};

type AutocompleteResponse = {
  suggestions?: { placePrediction?: PlacePrediction }[];
};

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

export type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  types?: string[];
};

const local_select = {
  place_id: true,
  nome: true,
  cidade: true,
  estado: true,
  sigla_estado: true,
  pais: true,
  sigla_pais: true,
  is_cidade: true,
  endereco: true,
};

const CITY_TYPES = ['locality', 'administrative_area_level_2'];
const TOP_TAGS = 10;

// Turns the Google Places details into the columns of the Local table.
export function parse_place_details(
  placeId: string,
  details: PlaceDetailsResponse,
) {
  const components = details.addressComponents ?? [];
  const find = (type: string) =>
    components.find((c) => c.types?.includes(type));

  const city = find('locality') ?? find('administrative_area_level_2');
  const state = find('administrative_area_level_1');
  const country = find('country');

  return {
    place_id: placeId,
    nome: details.displayName?.text ?? city?.longText ?? 'Local',
    cidade: city?.longText ?? null,
    estado: state?.longText ?? null,
    sigla_estado: state?.shortText ?? null,
    pais: country?.longText ?? null,
    sigla_pais: country?.shortText ?? null,
    is_cidade: (details.types ?? []).some((t) => CITY_TYPES.includes(t)),
    endereco: details.formattedAddress ?? null,
  };
}

@Injectable()
export class LocalService {
  private readonly logger = new Logger(LocalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string) {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.api_key(),
        },
        body: JSON.stringify({
          input: q,
          languageCode: 'pt-BR',
          regionCode: 'br',
        }),
      },
    );

    if (!response.ok) {
      this.logger.error(
        `Google Places ${response.status}: ${await response.text()}`,
      );
      throw new BadGatewayException(
        'Não foi possível buscar locais no momento.',
      );
    }

    const body = (await response.json()) as AutocompleteResponse;
    const locais = (body.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is PlacePrediction => !!p)
      .map((p) => ({
        place_id: p.placeId,
        nome: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        endereco: p.structuredFormat?.secondaryText?.text ?? null,
      }));

    return get_response('locais encontrados.', locais, HttpStatus.OK);
  }

  // Places that fail to load are left out, the cards just don't show their location.
  async get_locais(ids: string[]) {
    const unique = [...new Set(ids)];
    const cached = await this.prisma.local.findMany({
      where: { place_id: { in: unique } },
      select: local_select,
    });

    const cachedIds = new Set(cached.map((local) => local.place_id));
    const fetched = await Promise.all(
      unique
        .filter((id) => !cachedIds.has(id))
        .map((id) => this.fetch_and_save(id).catch(() => null)),
    );

    const locais = [...cached, ...fetched.filter((local) => local !== null)];
    return get_response('locais encontrados.', locais, HttpStatus.OK);
  }

  // RF7: rating, number of reviews and most used labels of the place.
  async get_local(placeId: string) {
    const local = await this.find_or_fetch(placeId);
    const where = { id_local: placeId, oculto: false, deletedAt: null };

    const [stats, tagCounts] = await Promise.all([
      this.prisma.review.aggregate({
        where,
        _avg: { nota: true },
        _count: { _all: true },
      }),
      this.prisma.tag_review.groupBy({
        by: ['id_tag'],
        where: { review: where },
        _count: { id_tag: true },
        orderBy: { _count: { id_tag: 'desc' } },
        take: TOP_TAGS,
      }),
    ]);

    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagCounts.map((t) => t.id_tag) } },
      select: { id: true, descritivo: true },
    });
    const names = new Map(tags.map((tag) => [tag.id, tag.descritivo]));

    return get_response(
      'Local encontrado',
      {
        ...local,
        media_nota: stats._avg.nota,
        total_reviews: stats._count._all,
        tags: tagCounts.map((t) => names.get(t.id_tag)).filter(Boolean),
      },
      HttpStatus.OK,
    );
  }

  private async find_or_fetch(placeId: string) {
    const cached = await this.prisma.local.findUnique({
      where: { place_id: placeId },
      select: local_select,
    });
    if (cached) return cached;

    try {
      return await this.fetch_and_save(placeId);
    } catch (e) {
      // Without the Google details the page still opens with the name saved in a review.
      const review = await this.prisma.review.findFirst({
        where: { id_local: placeId },
        select: { local: true },
      });
      if (!review) throw e;
      return {
        place_id: placeId,
        nome: review.local,
        cidade: null,
        estado: null,
        sigla_estado: null,
        pais: null,
        sigla_pais: null,
        is_cidade: false,
        endereco: null,
      };
    }
  }

  private async fetch_and_save(placeId: string) {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR&regionCode=br`,
      {
        headers: {
          'X-Goog-Api-Key': this.api_key(),
          'X-Goog-FieldMask':
            'id,displayName,formattedAddress,addressComponents,types',
        },
      },
    );

    if (response.status === 404 || response.status === 400)
      throw new NotFoundException('Local não encontrado.');

    if (!response.ok) {
      this.logger.error(
        `Google Places details ${response.status}: ${await response.text()}`,
      );
      throw new BadGatewayException(
        'Não foi possível carregar o local no momento.',
      );
    }

    const data = parse_place_details(
      placeId,
      (await response.json()) as PlaceDetailsResponse,
    );
    return this.prisma.local.upsert({
      where: { place_id: placeId },
      create: data,
      update: data,
      select: local_select,
    });
  }

  private api_key() {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'Busca de locais não configurada.',
      );
    }
    return apiKey;
  }
}
