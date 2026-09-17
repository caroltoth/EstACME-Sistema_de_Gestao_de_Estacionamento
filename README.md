# EstACME-Sistema_de_Gestao_de_Estacionamento
Projeto desenvolvido no 2º semestre do curso de Análise e Desenvolvimento de Sistemas na PUCRS. Trata-se de um sistema construído em Node.js para o gerenciamento de pátios de estacionamento. O foco desta fase é a aplicação prática do paradigma de Programação Orientada a Objetos (POO), utilizando conceitos de herança e polimorfismo.

Funcionalidades:
Gestão de Clientes: O sistema lida com diferentes categorias de usuários, como Estudante, Professor, Empresa e Cliente Avulso. Cada categoria possui regras de negócio e tarifas de cobrança específicas.  
Controle de Pátio: Autoriza ou bloqueia entradas e saídas de veículos com base em validações automáticas (como verificação de saldo devedor, inadimplência ou lista de bloqueio).  
Relatórios Gerenciais: O menu permite gerar balanços detalhados, incluindo a arrecadação total e por categoria, a relação de clientes impedidos de entrar e um ranking com os 10 veículos mais frequentes.  
Persistência de Dados: Lê e salva automaticamente as informações cadastradas e o histórico de movimentação do estacionamento em arquivos externos do tipo CSV.  

Pré-requisitos e Execução:
Para rodar o projeto na sua máquina, siga os passos abaixo:
1. Certifique-se de ter o Node.js instalado no seu computador.
2. Baixe o código principal script.js e os arquivos de dados originais clientes.csv e estacionamento.csv. Salve todos esses arquivos exatamente na mesma pasta.
4. Abra o terminal nessa pasta e inicie o programa com o comando:node script.js  
