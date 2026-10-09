import { parse_place_details } from '../functions/local.functions.js';

export type LocalBusca = ReturnType<typeof parse_place_details> & {
  media_nota: number;
  total_reviews: number;
};

export type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  types?: string[];
};

export type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

export type AutocompleteResponse = {
  suggestions?: { placePrediction?: PlacePrediction }[];
};

export type PlacePrediction = {
  placeId: string;
  text?: { text: string };
  structuredFormat?: {
    mainText?: { text: string };
    secondaryText?: { text: string };
  };
};
