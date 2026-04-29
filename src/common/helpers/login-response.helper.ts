import { HttpStatus } from '@nestjs/common';

export function login_response<T>(
  message: string,
  token: string,
  status_code: HttpStatus,
) {
  return {
    message: message,
    access_token: token,
    statusCode: status_code,
  };
}
