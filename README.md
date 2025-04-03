# Kanban Board - Salesforce LWC

Este componente implementa uma visualização em Kanban para registros do Salesforce, atualmente configurado para Oportunidades mas facilmente adaptável para outros objetos.

## 📁 Estrutura de Arquivos

```
force-app/main/default/
├── classes/
│   ├── KanbanDataController.cls           # Controlador Apex
│   └── KanbanDataControllerTest.cls       # Testes do controlador
└── lwc/
    └── kanbanPerson/
        ├── kanbanPerson.html              # Template do componente
        ├── kanbanPerson.js                # Lógica do componente
        ├── kanbanPerson.css               # Estilos do componente
        └── kanbanPerson.js-meta.xml       # Metadados do componente
```

## 🔧 Como Adaptar para Outro Objeto

### 1. Modificar o Controlador Apex (force-app/main/default/classes/KanbanDataController.cls)

1. No método getRecords (linhas 1-14):

```apex
@AuraEnabled(cacheable=true)
public static List<SeuObjeto__c> getRecords() {
    return [
        SELECT Id, Name, Status__c, CampoValor__c, CampoData__c,
               CampoRelacionamento__r.Name, CampoProbabilidade__c
        FROM SeuObjeto__c
        ORDER BY CreatedDate DESC
        LIMIT 1000
    ];
}
```

2. No método updateRecordStatus (linhas 16-65):

```apex
if (!Schema.sObjectType.SeuObjeto__c.isUpdateable() ||
    !Schema.sObjectType.SeuObjeto__c.fields.Status__c.isUpdateable()) {
    throw new AuraHandledException('Você não tem permissão para atualizar registros.');
}

Set<String> validStatuses = new Set<String>{
    'Status1',
    'Status2',
    'Status3'
    // Seus status aqui
};
```

### 2. Adaptar o Componente JavaScript (force-app/main/default/lwc/kanbanPerson/kanbanPerson.js)

1. Propriedades API (linhas 15-20):

```javascript
@api statusField = "Status__c";              // Campo de status do seu objeto
@api titleField = "Name";                    // Campo para título do card
@api subtitleField = "CampoRelacionado__r.Name"; // Campo para subtítulo
@api valueField = "CampoValor__c";          // Campo para valor
@api dateField = "CampoData__c";            // Campo para data
```

2. Mapeamento de status (linhas 43-51):

```javascript
statusIconMap = {
  Status1: "utility:icon1",
  Status2: "utility:icon2",
  Status3: "utility:icon3"
};
```

3. Status no método formatData (linhas 103-111):

```javascript
const statuses = ["Status1", "Status2", "Status3"];
```

4. Navegação (linhas 310-318, 515-523):

```javascript
this[NavigationMixin.Navigate]({
  type: "standard__recordPage",
  attributes: {
    recordId: recordId,
    objectApiName: "SeuObjeto__c",
    actionName: "edit" // ou "view"
  }
});
```

### 3. Atualizar o Template HTML (force-app/main/default/lwc/kanbanPerson/kanbanPerson.html)

1. Ícone e título (linhas 15-24):

```html
<lightning-icon
    icon-name="standard:custom_object"  <!-- Altere para o ícone do seu objeto -->
    size="medium"
    alternative-text="Visualização de Registros"
    title="Visualização de Registros"
>
</lightning-icon>
<h1 class="slds-text-heading_medium">
    Visualização de Registros - [Nome do Seu Objeto]
</h1>
```

2. Labels dos botões (linhas 52-54):

```html
<lightning-button
  variant="brand"
  label="Novo [Seu Objeto]"
  title="Criar novo registro"
></lightning-button>
```

### 4. Adaptar os Estilos CSS (force-app/main/default/lwc/kanbanPerson/kanbanPerson.css)

1. Cores dos status (linhas 359-386):

```css
.stage-selector[data-stage="Status1"] .slds-combobox__input {
  background-color: #sua-cor-1;
  color: #sua-cor-texto-1;
}

.stage-selector[data-stage="Status2"] .slds-combobox__input {
  background-color: #sua-cor-2;
  color: #sua-cor-texto-2;
}
```

### 5. Configurar Metadados (force-app/main/default/lwc/kanbanPerson/kanbanPerson.js-meta.xml)

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <targetConfigs>
        <targetConfig targets="lightning__AppPage,lightning__RecordPage">
            <objects>
                <object>SeuObjeto__c</object>
            </objects>
        </targetConfig>
    </targetConfig>
</LightningComponentBundle>
```

### 6. Permissionset (force-app/main/default/permissionsets/Kanban_Board_User.permissionset-meta.xml)

```xml
<objectPermissions>
    <object>SeuObjeto__c</object>
    <allowCreate>true</allowCreate>
    <allowDelete>true</allowDelete>
    <allowEdit>true</allowEdit>
    <allowRead>true</allowRead>
    <modifyAllRecords>false</modifyAllRecords>
    <viewAllRecords>false</viewAllRecords>
</objectPermissions>
<fieldPermissions>
    <field>SeuObjeto__c.Status__c</field>
    <editable>true</editable>
    <readable>true</readable>
</fieldPermissions>
```

## 🔍 Campos Personalizados

No arquivo kanbanPerson.js:

1. Na função filterRecords (linhas 67-78):

```javascript
return records.filter(
  (record) =>
    record.Name?.toLowerCase().includes(searchTermLower) ||
    record.CampoRelacionado__r?.Name?.toLowerCase().includes(searchTermLower) ||
    record.Status__c?.toLowerCase().includes(searchTermLower)
);
```

2. No método getFieldValue (linhas 515-523):

```javascript
getFieldValue(record, field) {
    if (field === "RelatedName") {
        return record.CampoRelacionado__r?.Name;
    }
    return record[field];
}
```

## ⚡ Considerações Importantes

1. Campo de Status:

   - Deve ser um campo do tipo picklist
   - Valores devem corresponder aos definidos no `statusIconMap`
   - Recomendado usar campos indexados para melhor performance

2. Campos Relacionados:

   - Use a notação com \_\_r para campos de lookup/master-detail
   - Exemplo: `CampoRelacionado__r.Name`

3. Performance:
   - Limite de 1000 registros por padrão
   - Ajuste conforme necessidade no método getRecords
   - Use campos indexados sempre que possível
