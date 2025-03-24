me ajude a criar uma classe apex para eu usar em uma automação do flow. observe:

hoje eu uso uma automação no flow acionada por registro, ela funciona assim:

quando alguma pessoa atualiza um registro no objeto "Operação Back Office" (Nome da API é BackOffice**c) (expecificamente o campo "Etapa" Api = Etapa**c) é rodado uma ação que publica essa mensagem no chatter

A operação {!$Record.Name} ({!$Record.TipoAtivoBO**c} / {!$Record.TipoOperacaoBO**c}) do cliente {!$Record.NomeClienteInfo__c} foi atualizada para o status {!$Record.Etapa\_\_c}

Porém, no chatter essa mensagem não faz o que eu quero (que é marcar o registro e o cliente), por que o flow não tem essa função.

Esqueci de falar que não existe um campo customizado Account no objeto Back Office, ele não cuida disso. quem cuida é outro fluxo que, quando uma operação é criada no objeto OperacaoInvestimento**c ele cria um novo registro no objeto BackOffice**c e manda o nome do cliente para um campo personalizado de texto no objeto BackOffice**c ("NomeClienteInfo**c)

então preciso criar uma classe apex para fazer isso funcionar, me ajude a figurar e como construir isso, ou otimizar no sales force, ou fazer de uma forma mais simples
