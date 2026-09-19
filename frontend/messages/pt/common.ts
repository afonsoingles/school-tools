const common = {
  actions: {
    save: "Guardar",
    saveChanges: "Guardar alterações",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    create: "Criar",
    add: "Adicionar",
    close: "Fechar",
    confirm: "Confirmar",
    retry: "Tentar novamente",
    search: "Pesquisar",
    back: "Voltar",
    done: "Concluir",
    remove: "Remover",
    send: "Enviar",
    copy: "Copiar",
    copied: "Copiado",
    logout: "Terminar sessão",
  },
  state: {
    loading: "A carregar…",
    saving: "A guardar…",
    error: "Algo correu mal. Tenta novamente.",
    none: "Nenhum",
    optional: "opcional",
    empty: "Ainda não há nada aqui.",
  },
  fields: {
    name: "Nome",
    email: "Email",
    date: "Data",
    time: "Hora",
    type: "Tipo",
    status: "Estado",
    subject: "Disciplina",
    grade: "Nota",
    class: "Aula",
    actions: "Ações",
  },
  filters: {
    all: "Todos",
    today: "Hoje",
    upcoming: "Próximos",
    past: "Passados",
  },
  subjectSelect: {
    placeholder: "Escolhe uma disciplina",
  },
  dateTimePicker: {
    placeholder: "Escolhe uma data e hora",
  },
  passwordHint:
    "A palavra-passe deve ter 8 a 50 caracteres e incluir pelo menos uma minúscula e uma maiúscula.",
  counter: {
    items: "{count, plural, one {# item} other {# itens}}",
  },
}

export default common
