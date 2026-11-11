import { HttpStatus } from '@nestjs/common';

export function login_response(
  message: string,
  access_token: string,
  refresh_token: string,
) {
  return {
    message,
    access_token,
    refresh_token,
  };
}
