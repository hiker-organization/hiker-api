import {
  afterEach,
  beforeEach,
  describe,
  jest,
  it,
  expect,
} from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { parse_place_details } from './utils/functions/local.functions.js';
import { LocalService } from './local.service.js';

const parkDetails = {
  id: 'park1',
  displayName: { text: 'Parque da Cidade' },
  formattedAddress: 'Av. Jundiaí, Jundiaí - SP, Brasil',
  types: ['park', 'point_of_interest'],
  addressComponents: [
    {
      longText: 'Jundiaí',
      shortText: 'Jundiaí',
      types: ['locality', 'political'],
    },
    {
      longText: 'São Paulo',
      shortText: 'SP',
      types: ['administrative_area_level_1', 'political'],
    },
    { longText: 'Brasil', shortText: 'BR', types: ['country', 'political'] },
  ],
};

describe('parse_place_details', () => {
  it('reads city, state and country of a place', () => {
    expect(parse_place_details('park1', parkDetails)).toEqual({
      place_id: 'park1',
      nome: 'Parque da Cidade',
      cidade: 'Jundiaí',
      estado: 'São Paulo',
      sigla_estado: 'SP',
      pais: 'Brasil',
      sigla_pais: 'BR',
      is_cidade: false,
      endereco: 'Av. Jundiaí, Jundiaí - SP, Brasil',
    });
  });

  it('marks a city', () => {
    const city = parse_place_details('city1', {
      ...parkDetails,
      displayName: { text: 'Jundiaí' },
      types: ['locality', 'political'],
    });
    expect(city.is_cidade).toBe(true);
  });

  it('uses the municipality when there is no locality', () => {
    const place = parse_place_details('x', {
      displayName: { text: 'Pico' },
      addressComponents: [
        {
          longText: 'Campos do Jordão',
          types: ['administrative_area_level_2'],
        },
      ],
    });
    expect(place.cidade).toBe('Campos do Jordão');
  });
});

describe('LocalService', () => {
  let service: LocalService;
  let prisma: any;
  const fetchMock = jest.fn<typeof fetch>();
  const originalFetch = global.fetch;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.GOOGLE_PLACES_API_KEY = 'key';
    global.fetch = fetchMock;
    prisma = {
      local: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
      $queryRaw: jest.fn(),
      review: { aggregate: jest.fn() },
      tag_review: { groupBy: jest.fn() },
      tag: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<LocalService>(LocalService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('only calls Google for places not cached yet', async () => {
    prisma.local.findMany.mockResolvedValue([{ place_id: 'a', nome: 'A' }]);
    fetchMock.mockResolvedValue(new Response(JSON.stringify(parkDetails)));
    prisma.local.upsert.mockImplementation((args: any) =>
      Promise.resolve(args.create),
    );

    const result = await service.get_locais(['a', 'park1', 'a']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/places/park1');
    expect((result.data as any[]).map((l) => l.place_id)).toEqual([
      'a',
      'park1',
    ]);
  });

  it('leaves out places that fail to load', async () => {
    prisma.local.findMany.mockResolvedValue([]);
    fetchMock.mockResolvedValue(new Response('error', { status: 500 }));

    const result = await service.get_locais(['broken']);

    expect(result.data).toEqual([]);
  });

  it('returns the rating, total and labels of a place', async () => {
    prisma.local.findUnique.mockResolvedValue({
      place_id: 'park1',
      nome: 'Parque',
    });
    prisma.review.aggregate.mockResolvedValue({
      _avg: { nota: 4.5 },
      _count: { _all: 2 },
    });
    prisma.tag_review.groupBy.mockResolvedValue([{ id_tag: 2 }, { id_tag: 1 }]);
    prisma.tag.findMany.mockResolvedValue([
      { id: 1, descritivo: 'trilha' },
      { id: 2, descritivo: 'cachoeira' },
    ]);

    const result = await service.get_local('park1');

    expect(result.data).toMatchObject({
      nome: 'Parque',
      media_nota: 4.5,
      total_reviews: 2,
      tags: ['cachoeira', 'trilha'],
    });
    expect(prisma.review.aggregate.mock.calls[0][0].where).toEqual({
      id_local: 'park1',
      oculto: false,
      deletedAt: null,
    });
  });

  it('reuses a place already saved', async () => {
    prisma.local.findUnique.mockResolvedValue({ place_id: 'a', nome: 'A' });

    const local = await service.ensure_local('a');

    expect(local).toEqual({ place_id: 'a', nome: 'A' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves a new place with the Google details', async () => {
    prisma.local.findUnique.mockResolvedValue(null);
    fetchMock.mockResolvedValue(new Response(JSON.stringify(parkDetails)));
    prisma.local.upsert.mockImplementation((args: any) =>
      Promise.resolve(args.create),
    );

    const local = await service.ensure_local('park1');

    expect(local).toMatchObject({ place_id: 'park1', cidade: 'Jundiaí' });
    expect(prisma.local.upsert).toHaveBeenCalledTimes(1);
  });

  it('rejects a place Google does not know', async () => {
    prisma.local.findUnique.mockResolvedValue(null);
    fetchMock.mockResolvedValue(new Response('not found', { status: 404 }));

    await expect(service.ensure_local('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.local.upsert).not.toHaveBeenCalled();
  });

  it('searches ignoring accents and only places with visible reviews', async () => {
    const rows = [
      { place_id: 'b', nome: 'Parque B', media_nota: 5, total_reviews: 4 },
    ];
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await service.buscar(' jundiai ');

    expect(result.data).toEqual(rows);
    const [strings, ...values] = prisma.$queryRaw.mock.calls[0];
    const sql = (strings as string[]).join('?');
    expect(sql).toContain('unaccent(l.nome) ILIKE unaccent(?)');
    expect(sql).toContain('r.oculto = false AND r."deletedAt" IS NULL');
    expect(values[0]).toEqual('%jundiai%');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('matches % and _ literally', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await service.buscar('100%_x');

    expect(prisma.$queryRaw.mock.calls[0][1]).toEqual('%100\\%\\_x%');
  });
});
