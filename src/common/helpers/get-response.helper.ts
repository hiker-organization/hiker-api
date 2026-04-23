export function get_response<T>(message: string, data: T | []) {
  return {
    message: message,
    data: data,
  };
}
