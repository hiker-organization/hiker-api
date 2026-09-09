export const user_fdMock = {
    foto_url: 'avatar.png',
    nome_exibicao: 'Victor Hugo',
    nome_usuario: 'victorhugodev',
    reputacao: 10,
    reviews: [
      {
        id: 1,
        oculto: false,
        local: 'Restaurante Central',
        nota: 5,
        descricao: 'Muito bom!',
        qnt_likes: 2,
        qnt_dislikes: 0,
        createdAt: new Date(),
        tags: [{ tag: { descritivo: 'Ambiente familiar' } }],
        fotos: [{ url: 'foto1.jpg' }, { url: 'foto2.jpg' }],
      },
    ]
}