export interface JwtConstants {
  secret: string;
  audience: string;
  issuer: string;
  jwtTtl: number;
  refreshTokenTtl: number;
}

export const jwtConstants: JwtConstants = {
  secret: process.env.JWT_SECRET as string,
  audience: process.env.JWT_TOKEN_AUDIENCE as string,
  issuer: process.env.JWT_TOKEN_ISSUER as string,
  jwtTtl: Number(process.env.JWT_TTL ?? 900),
  refreshTokenTtl: Number(process.env.REFRESH_TOKEN_TTL ?? 2592000),
};
