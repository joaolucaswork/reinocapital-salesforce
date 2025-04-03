# Kanban Board - Salesforce LWC

Este componente implementa uma visualização em Kanban para registros do Salesforce, atualmente configurado para Oportunidades.

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

### 1. Modificar o Controlador Apex (KanbanDataController.cls)

```apex
// Altere a query para o seu objeto
public with sharing class KanbanDataController {
    @AuraEnabled(cacheable=true)
    public static List<SEU_OBJETO__c> getRecords() {
        return [
            SELECT Id, Name, SEU_CAMPO_STATUS__c, SEU_CAMPO_VALOR__c, ...
            FROM SEU_OBJETO__c
            WHERE ...
            ORDER BY CreatedDate DESC
        ];
    }
}
```

### 2. Modificar o Componente JavaScript (kanbanPerson.js)

1. Altere o mapeamento de status:

```javascript
statusIconMap = {
  "Status 1": "utility:icon1",
  "Status 2": "utility:icon2"
  // Adicione seus status
};
```

2. Atualize os campos na função formatData:

```javascript
formatData(records) {
    const statuses = [
        "Status 1",
        "Status 2",
        // Seus status aqui
    ];
}
```

3. Modifique as colunas exibidas:

```javascript
// Altere os campos conforme sua necessidade
{
    label: "Nome",
    field: "Name",
    // Adicione seus campos
}
```

### 3. Atualizar o Meta XML (kanbanPerson.js-meta.xml)

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>58.0</apiVersion>
    <isExposed>true</isExposed>
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__RecordPage</target>
        <target>lightning__HomePage</target>
    </targets>
    <!-- Adicione os objetos que podem usar o componente -->
    <targetConfigs>
        <targetConfig targets="lightning__AppPage,lightning__RecordPage">
            <objects>
                <object>SEU_OBJETO__c</object>
            </objects>
        </targetConfig>
    </targetConfig>
</LightningComponentBundle>
```

## 🎨 Personalizando a Aparência

1. Cores por Status (kanbanPerson.css):

```css
.stage-selector[data-stage="Seu Status"] .slds-combobox__input {
  background-color: #sua-cor;
  color: #cor-texto;
}
```

2. Largura das Colunas:

```css
.col-sua-coluna {
  width: 200px;
  min-width: 100px;
}
```

## 📦 Deploy para Produção

1. **Via VSCode e SFDX:**

```bash
sfdx force:source:deploy -p force-app/main/default/lwc/kanbanPerson,force-app/main/default/classes/KanbanDataController.cls
```

2. **Via Pacote:**

- Use o comando `sfdx force:package:create` para criar um pacote
- Adicione os componentes ao pacote
- Deploy o pacote para produção

## ⚡ Permissões Necessárias

1. Crie um conjunto de permissões:
   - Acesso ao componente LWC
   - Acesso à classe Apex
   - Permissões de Objeto:
     - Read no objeto principal
     - Edit para alterações de status

## 🔍 Campos Personalizáveis

No arquivo kanbanPerson.js, localize e modifique:

1. **Campos Exibidos:**

```javascript
const recordsWithIcons = statusRecords.map((record) => ({
  Id: record.Id,
  Name: record.Name,
  // Adicione seus campos aqui
  SeuCampo__c: record.SeuCampo__c
}));
```

2. **Campos de Ordenação:**

```javascript
getFieldValue(record, field) {
    switch(field) {
        case "SeuCampo":
            return record.SeuCampo__c;
        // Adicione seus campos
    }
}
```

## 🚀 Performance

- O componente usa @wire para cache automático
- Implementa lazy loading para grandes conjuntos de dados
- Otimizado para mobile

## 📱 Responsividade

O componente é totalmente responsivo e se adapta a diferentes tamanhos de tela. Você pode ajustar os breakpoints em kanbanPerson.css:

```css
@media screen and (max-width: seu-tamanho) {
    // Seus ajustes aqui
}
```
