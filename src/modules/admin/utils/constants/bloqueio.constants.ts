import type { Prisma } from '../../../../../generated/prisma/client.js';

// Blocked by the classifier (hiker-moderation) and not reverted by an admin.
// An admin confirming it (decisao_admin OFENSIVA) keeps it automatic. Any
// other OFENSIVA review was blocked by an admin moderating a report.
export const bloqueio_automatico: Prisma.ReviewWhereInput = {
  status: 'OFENSIVA',
  classificacao: {
    is: {
      ofensivo: true,
      OR: [{ decisao_admin: null }, { decisao_admin: 'OFENSIVA' }],
    },
  },
};
