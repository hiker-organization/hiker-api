import { HttpStatus } from '@nestjs/common';

export function get_response<T>(
  message: string,
  data: T | [],
  status_code: HttpStatus,
) {
  return {
    message: message,
    data: data,
    status: status_code,
  };
}
