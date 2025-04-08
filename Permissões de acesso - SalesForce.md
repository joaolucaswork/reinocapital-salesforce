# Permissões - SalesForce

O objetivo desse arquivo é definir como quero que funcione os conjuntos de permissões e o grupo de permissão.
Primeiro vamos criar os conjuntos de permissões para ser reutilizados em outro grupo, mas focaremos no grupo dos SDR's

### Nome API das guias

area_comercial
area_gestor
back_office

### Nome API dos objetos

Account
Lead
Opportunity
Task

### Nome API das Páginas Lightning

PaginaGestor
AreaComercial

## Permissões SDR

Primeiro vamos começar definimos quais permissão cada úsuario do time de SDR terá.

O usuario que tem o grupo de SDR atribuido tem as seguintes permissões :

**Permissão de guias**
Permissão para acessar a guia com o nome de api **area_comercial**

**Permissão de objetos**

**Permissão para acessar objetos com esses nomes de API**

- Account
- Lead
- Opportunity
- Task

**Objeto Account**

- Visualizar somente cliente designados para o usuário dele
- Somente tem a permissão de Leitura dos dados do cliente designado

**Objeto Lead**

- Só consegue visualizar os leads que ele criou ou os leads atribuido a ele.
- CRUD para os Leads criados por ele
- Se outro usuario criou o lead e atribuiu a ele, ele não tem permissão para excluir (Somente Ler e Atualizar)

**Objeto Opportunity**

- Só consegue visualizar as oportunidades que ele criou ou as oportunidades atribuidas a ele.
- CRUD para as Oportunidades criadas por ele
- Se outro usuario criou a Oportunidade e atribuiu a ele, ele não tem permissão para excluir (Somente Ler e Atualizar)
