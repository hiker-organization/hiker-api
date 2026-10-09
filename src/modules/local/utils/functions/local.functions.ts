import { CITY_TYPES } from '../constants/local.constants.js';
import { PlaceDetailsResponse } from '../types/local.types.js';

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

export function escape_like(text: string) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
