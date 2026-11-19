import { HttpStatus } from '@nestjs/common';

export function create_response<T>(message: string, data: T) {
  return {
    message: message,
    data: data,
  };
}
