import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

export type GoogleAccount = {
  google_id: string;
  email: string;
  nome: string | null;
  foto: string | null;
};

// Checks the ID token the app gets from the Google sign-in: signed by Google, not
// expired and issued to one of our OAuth clients.
@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();

  async verify(idToken: string): Promise<GoogleAccount> {
    const audience = [
      process.env.GOOGLE_WEB_CLIENT_ID,
      // iOS tokens may carry the iOS client instead of the web one.
      process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter((id): id is string => !!id);
    if (audience.length === 0) {
      throw new InternalServerErrorException(
        'Login com Google não configurado.',
      );
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Login com Google inválido.');
    }

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException(
        'Sua conta Google não tem um email verificado.',
      );
    }

    return {
      google_id: payload.sub,
      email: payload.email,
      nome: payload.name ?? null,
      foto: payload.picture ?? null,
    };
  }
}
