import { CreateReviewDTO } from '../dtos/create-review.dto.js';

export const ReviewMock: CreateReviewDTO = {
    descricao: 'Ótimo lugar para visitar!',
    local_id: '12345',
    local: 'Praia do Sol',
    nota: 5,
    oculto: false,
    tags: ['praia', 'sol', 'verão'],
};