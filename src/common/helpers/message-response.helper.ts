import { HttpStatus } from '@nestjs/common';

export function message_response(message: string) {
  return {
    message: message,
  };
}
