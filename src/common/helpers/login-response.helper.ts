export function login_response<T>(message: string, token: string) {
  return {
    message: message,
    access_token: token,
  };
}
