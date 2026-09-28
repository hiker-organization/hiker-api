import {
  BadGatewayException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { get_response } from '../../common/helpers/get-response.helper.js';

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

@Injectable()
export class LocalService {
  private readonly logger = new Logger(LocalService.name);

  async search(q: string) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('Busca de locais não configurada.');
    }

    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({ input: q, languageCode: 'pt-BR', regionCode: 'br' }),
    });

    if (!response.ok) {
      this.logger.error(`Google Places ${response.status}: ${await response.text()}`);
      throw new BadGatewayException('Não foi possível buscar locais no momento.');
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
}
