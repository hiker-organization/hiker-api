import { HttpStatus } from '@nestjs/common';

export function message_response(message: string, status_code: HttpStatus) {
  return {
    message: message,
    statusCode: status_code,
  };
}
