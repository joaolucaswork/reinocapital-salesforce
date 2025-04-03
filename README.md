# Kanban Board - Componente LWC Genérico

Este componente implementa uma visualização em Kanban configurável para qualquer objeto do Salesforce.

## 📖 Como Usar com Diferentes Objetos

### 1. Configurar o Componente no Builder

1. Arraste o componente "Kanban Board Genérico" para sua página
2. Configure as propriedades:
   - Nome da API do Objeto (ex: "Account", "Contact", "Custom_Object\_\_c")
   - Campo de Status (campo que define as colunas)
   - Campo de Título (geralmente "Name")
   - Campo de Subtítulo (opcional, pode usar campos relacionados como "Owner.Name")
   - Campo de Valor (opcional, campo numérico)
   - Campo de Data (opcional)
   - Textos personalizados para botões e pesquisa

### 2. Adaptar o Controller Apex

1. Copie o `KanbanDataController.cls` e renomeie para seu objeto
2. Modifique o método `getRecords()`:

```apex
@AuraEnabled(cacheable=true)
public static List<SeuObjeto__c> getRecords() {
    return [
        SELECT Id, Name, Status__c, Campo1__c, Campo2__c,
               CampoRelacionado__r.Name
        FROM SeuObjeto__c
        ORDER BY CreatedDate DESC
        LIMIT 1000
    ];
}
```

3. Atualize os outros métodos substituindo `Opportunity` por seu objeto:

```apex
SeuObjeto__c record = new SeuObjeto__c(
    Id = recordId,
    Status__c = newStatus
);
```

### 3. Configurar Status Válidos

1. No controller Apex, atualize a lista de status válidos:

```apex
Set<String> validStatuses = new Set<String>{
    'Status1',
    'Status2',
    'Status3'
};
```

2. No componente JavaScript, atualize o `statusIconMap` e `validStatuses`:

```javascript
statusIconMap = {
    'Status1': 'utility:icon1',
    'Status2': 'utility:icon2',
    'Status3': 'utility:icon3'
};

get validStatuses() {
    return ['Status1', 'Status2', 'Status3'];
}
```

### 4. Adaptar as Permissões

1. Atualize o arquivo de permissões:

```xml
<objectPermissions>
    <object>SeuObjeto__c</object>
    <allowCreate>true</allowCreate>
    <allowDelete>true</allowDelete>
    <allowEdit>true</allowEdit>
    <allowRead>true</allowRead>
</objectPermissions>
```

## 🎨 Personalizando a Aparência

### 1. Cores dos Status

No arquivo CSS (`kanbanPerson.css`), defina cores para seus status:

```css
.stage-selector[data-stage="Status1"] .slds-combobox__input {
  background-color: #sua-cor-1;
  color: #sua-cor-texto-1;
}
```

### 2. Ícones dos Status

No JavaScript, defina ícones do Lightning Design System para cada status:

```javascript
statusIconMap = {
  Status1: "utility:seu_icone_1",
  Status2: "utility:seu_icone_2"
};
```

## 📋 Exemplos de Uso

### Cliente (Account)

```html
<c-kanban-person
  object-api-name="Account"
  status-field="Status__c"
  title-field="Name"
  subtitle-field="Type"
  value-field="AnnualRevenue"
  date-field="CreatedDate"
  new-button-label="Novo Cliente"
  search-placeholder="Pesquisar clientes..."
>
</c-kanban-person>
```

### Lead

```html
<c-kanban-person
  object-api-name="Lead"
  status-field="Status"
  title-field="Name"
  subtitle-field="Company"
  value-field="AnnualRevenue"
  date-field="CreatedDate"
  new-button-label="Novo Lead"
  search-placeholder="Pesquisar leads..."
>
</c-kanban-person>
```

### Caso (Case)

```html
<c-kanban-person
  object-api-name="Case"
  status-field="Status"
  title-field="CaseNumber"
  subtitle-field="Subject"
  value-field="Priority"
  date-field="CreatedDate"
  new-button-label="Novo Caso"
  search-placeholder="Pesquisar casos..."
>
</c-kanban-person>
```

## ⚡ Considerações Importantes

1. Campo de Status:

   - Deve ser um campo do tipo picklist
   - Os valores devem corresponder aos definidos no `statusIconMap`
   - Recomendado usar campos indexados para melhor performance

2. Campos Relacionados:

   - Use a notação com ponto para campos de lookup/master-detail
   - Exemplo: `Account.Owner.Name`

3. Performance:

   - Limite padrão de 1000 registros
   - Use campos indexados sempre que possível
   - Evite campos de fórmula complexos

4. Personalização:
   - Todos os textos são configuráveis
   - Cores e ícones podem ser personalizados por CSS
   - Layout responsivo para diferentes tamanhos de tela
