Para esse cenário, a recomendação é utilizar o **compartilhamento do registro** em vez de alterar o proprietário. Isso porque:

- **Manutenção da propriedade original:** Ao manter o proprietário original (por exemplo, o Gestor de operações), você preserva o histórico e a responsabilidade inicial do registro.
- **Flexibilidade de acesso:** Com o compartilhamento, é possível conceder acessos adicionais (como leitura ou edição) para o Head do Back Office ou até para outros usuários sem “mudar” a cadeia de custódia do registro.
- **Relatórios e auditoria:** O registro mantém sua origem e, ao mesmo tempo, registra quem recebeu o acesso extra. Assim, os relatórios podem diferenciar entre o dono original e os usuários com acesso compartilhado, facilitando a análise e a auditoria das atividades.

Campo: NomeClienteInfo\_\_c

Valor: {!$Record.Contas_Bancarias**r.Carteira**r.Name}

Campo: TipoAtivoBO\_\_c

Valor: {!$Record.RecordType.Name}

Campo: ContaBancariaBO\_\_c

Valor: {!$Record.Contas_Bancarias__r.Banco__c} - {!$Record.Contas_Bancarias\_\_r.Name}

Campo: TipoOperacaoBO\_\_c

Valor: {!$Record.TipoOperacaoRelacionamento\_\_r.Name}

A operação {!$Record.Name} – ({!$Record.TipoAtivoBO**c} • {!$Record.TipoOperacaoBO**c}) | na conta {!$Record.ContaBancariaBO__c} | do cliente {!$Record.NomeClienteInfo**c} foi atualizada para o status: {!$Record.Etapa**c}
