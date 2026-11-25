import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';

export type ClassificacaoResultado = {
  ofensivo: boolean;
  probabilidade: number;
  modelo_versao: string;
};

// Client of the offensive content classifier (hiker-moderation, on GCP).
@Injectable()
export class ModeracaoService {
  private readonly logger = new Logger(ModeracaoService.name);

  // Returns null when the classifier is not configured or fails, so a review is
  // never lost because of it: it is saved without classification and the
  // backfill of hiker-moderation classifies it later.
  async classificar(texto: string): Promise<ClassificacaoResultado | null> {
    const url = process.env.MODERACAO_URL;
    if (!url) return null;

    try {
      const response = await fetch(`${url}/classificar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.MODERACAO_API_KEY ?? '',
        },
        body: JSON.stringify({ texto }),
        signal: AbortSignal.timeout(
          Number(process.env.MODERACAO_TIMEOUT_MS ?? 10000),
        ),
      });

      if (!response.ok) {
        this.logger.warn(
          `Moderacao ${response.status}: ${await response.text()}`,
        );
        return null;
      }

      const body = (await response.json()) as ClassificacaoResultado;
      return {
        ofensivo: body.ofensivo,
        probabilidade: body.probabilidade,
        modelo_versao: body.modelo_versao,
      };
    } catch (error) {
      this.logger.warn(`Moderacao indisponivel: ${String(error)}`);
      return null;
    }
  }
}
