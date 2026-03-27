// li o livro do progrador pragmático, hoje em dia busco manter apenas uma fonte de verdade possível.
export function create_response<T>(message: string, data: T) {
    return {
        message: message,
        data: data
    }
}