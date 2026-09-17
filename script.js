const fs = require('fs');
const readline = require('readline');

// --- 1. Modelos de Dados (POO) ---

class Cliente {
    constructor(id, nome) {
        if (this.constructor === Cliente) throw new Error("classe abstrata!");
        this.id = id;
        this.nome = nome;
        this.placas = new Set();
    }
    adicionarPlaca(p) { if(p) this.placas.add(p.toUpperCase()); }
}

class Estudante extends Cliente {
    constructor(id, nome, saldo = 0) { super(id, nome); this.saldo = saldo; }
    calcularCusto(t) {
        const ent = new Date(t.dataEntrada);
        const sai = new Date(t.dataSaida);
        return ent.toDateString() === sai.toDateString() ? 5.00 : 10.00;
    }
}

class Professor extends Cliente { calcularCusto() { return 0.00; } }

class Empresa extends Cliente {
    constructor(id, nome, debito = 0) { super(id, nome); this.debito = debito; this.inadimplente = false; }
    calcularCusto(t) {
        const ent = new Date(t.dataEntrada); const sai = new Date(t.dataSaida);
        return ent.toDateString() === sai.toDateString() ? 70.00 : 120.00;
    }
}

class ClienteAvulso {
    constructor(placa) { this.placa = placa.toUpperCase(); }
    calcularCusto(t) {
        const ent = new Date(t.dataEntrada); const sai = new Date(t.dataSaida);
        const horas = Math.ceil((sai - ent) / (1000 * 60 * 60));
        if (ent.toDateString() !== sai.toDateString()) return 140.00;
        return horas <= 6 ? horas * 10.00 : 70.00;
    }
}

// --- 2. Gestão de Dados e Persistência ---

class CadastroClientes {
    constructor() {
        this.clientes = new Map();
        this.indicePlacas = new Map();
    }

    async carregarDeCSV(caminho) {
        if (!fs.existsSync(caminho)) return;
        const dados = fs.readFileSync(caminho, 'utf-8');
        dados.split(/\r?\n/).filter(l => l.trim()).forEach(linha => {
            const cols = linha.split(',').map(s => s.trim());
            const [id, nome, campo3, tipoOuPlaca, ...resto] = cols;

            let cli;
            if (tipoOuPlaca === 'Estudante') cli = new Estudante(id, nome, parseFloat(campo3));
            else if (campo3 === 'Professor') cli = new Professor(id, nome);
            else if (tipoOuPlaca === 'Empresa') cli = new Empresa(id, nome, parseFloat(campo3));

            if (cli) {
                const placas = (campo3 === 'Professor') ? [tipoOuPlaca, ...resto] : resto;
                placas.forEach(p => { if(p) { cli.adicionarPlaca(p); this.indicePlacas.set(p.toUpperCase(), cli); } });
                this.clientes.set(id, cli);
            }
        });
    }

    salvarEmCSV(caminho) {
        let txt = "";
        this.clientes.forEach(c => {
            const c3 = c instanceof Professor ? "Professor" : (c.saldo || c.debito || 0);
            txt += `${c.id},${c.nome},${c3},${c.constructor.name},${Array.from(c.placas).join(',')}\n`;
        });
        fs.writeFileSync(caminho, txt);
    }
}

class RegistroDeEntradas_E_Saidas {
    constructor(cadastro) {
        this.cadastro = cadastro;
        this.patio = new Map(); this.historico = []; this.bloqueioAvulsos = new Set();
    }

    autorizarEntrada(placa) {
        const p = placa.toUpperCase();
        if (this.bloqueioAvulsos.has(p)) return "❌ negado: veículo em lista de bloqueio";
        if (this.patio.has(p)) return "❌ erro: placa já está no pátio.";

        const cli = this.cadastro.indicePlacas.get(p);
        if (cli instanceof Professor && Array.from(this.patio.values()).some(t => t.clienteId === cli.id))
            return "❌ negado: professor já possui veículo no pátio.";
        if (cli instanceof Estudante && cli.saldo < 0) return "❌ negado: estudante com saldo devedor.";

        this.patio.set(p, { placa: p, clienteId: cli?.id, tipo: cli?.constructor.name || 'Avulso', entrada: new Date() });
        return `✅ autorizado: ${p}`;
    }

    processarSaida(placa) {
        const p = placa.toUpperCase();
        const t = this.patio.get(p);
        if (!t) return "❌ erro: placa não encontrada.";
        t.dataEntrada = t.entrada; t.dataSaida = new Date();

        const cliObj = t.clienteId ? this.cadastro.clientes.get(t.clienteId) : new ClienteAvulso(p);
        let valor = cliObj.calcularCusto(t);

        const cincoDias = 5 * 24 * 60 * 60 * 1000;
        const freq = this.historico.filter(h => h.placa === p && (new Date() - new Date(h.dataSaida)) < cincoDias).length;
        let desc = "nenhum"; if (t.tipo === 'Avulso' && freq >= 3) { valor *= 0.8; desc = "ClienteFrequente"; }

        if (cliObj instanceof Estudante) cliObj.saldo -= valor;
        else if (cliObj instanceof Empresa) cliObj.debito += valor;

        t.valorPago = valor; t.desc = desc;
        this.historico.push(t); this.patio.delete(p);
        let msg = `✅ saída: r$ ${valor.toFixed(2)} | desc: ${desc}`;
        if (cliObj instanceof Estudante) msg += ` | saldo: r$ ${cliObj.saldo.toFixed(2)}`;
        return msg;
    }

    salvarHistoricoCSV(caminho) {
        const txt = this.historico
            .filter(t => t.dataEntrada instanceof Date && !isNaN(t.dataEntrada) && t.dataSaida instanceof Date && !isNaN(t.dataSaida))
            .map(t => `${t.placa},${t.dataEntrada.toISOString()},${t.dataSaida.toISOString()},${t.valorPago},${t.tipo}`)
            .join('\n');
        fs.writeFileSync(caminho, txt);
    }

    carregarHistoricoCSV(caminho) {
        if (!fs.existsSync(caminho)) return;
        const dados = fs.readFileSync(caminho, 'utf-8');
        dados.split(/\r?\n/).filter(l => l.trim()).forEach(l => {
            const cols = l.split(',');
            const dEnt = new Date(cols[1]); const dSai = new Date(cols[2]);
            if (!isNaN(dEnt) && !isNaN(dSai)) {
                this.historico.push({
                    placa: cols[0],
                    dataEntrada: dEnt,
                    dataSaida: dSai,
                    valorPago: parseFloat(cols[3]) || 0,
                    tipo: cols[4] || 'Avulso'
                });
            }
        });
    }
}

// --- 3. Interface e Relatórios ---

class App {
    constructor() {
        this.cad = new CadastroClientes(); this.reg = new RegistroDeEntradas_E_Saidas(this.cad);
        this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    }

    async iniciar() {
        console.log("carregando dados na inicialização...");
        await this.cad.carregarDeCSV('clientes.csv');
        await this.reg.carregarHistoricoCSV('estacionamento.csv');
        this.menu();
    }

    menu() {
        console.log("\n--- estacme ---");
        console.log("1. entrada | 2. saída | 3. relatórios | 4. fechar");
        this.rl.question("opção: ", op => {
            if (op === '1') this.rl.question("placa: ", p => {
                console.log(this.reg.autorizarEntrada(p));
                const cli = this.cad.indicePlacas.get(p.toUpperCase());
                console.log(`proprietário: ${cli ? cli.nome : "avulso"}`); this.menu();
            });
            else if (op === '2') this.rl.question("placa: ", p => { console.log(this.reg.processarSaida(p)); this.menu(); });
            else if (op === '3') this.gerarRelatorios();
            else if (op === '4') this.finalizar();
            else this.menu();
        });
    }

    gerarRelatorios() {
        console.log("\n--- relatórios gerenciais ---");
        const total = this.reg.historico.reduce((acc, t) => acc + t.valorPago, 0);
        console.log(`1. arrecadação total: r$ ${total.toFixed(2)}`);

        const categorias = ['Estudante', 'Professor', 'Empresa', 'Avulso'];
        categorias.forEach(cat => {
            const soma = this.reg.historico.filter(t => t.tipo === cat).reduce((acc, t) => acc + t.valorPago, 0);
            console.log(`   - ${cat}: r$ ${soma.toFixed(2)}`);
        });

        const impedidos = Array.from(this.cad.clientes.values())
            .filter(c => (c instanceof Estudante && c.saldo < 0) || (c instanceof Empresa && c.inadimplente))
            .map(c => `${c.nome} (${c.constructor.name})`);
        console.log(`2. impedidos: ${impedidos.join(', ') || 'nenhum'}`);

        console.log("3. top 10 frequentes:");
        const freq = {}; this.reg.historico.forEach(t => freq[t.placa] = (freq[t.placa] || 0) + 1);
        Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,10).forEach(e => console.log(`- ${e[0]}: ${e[1]} usos`));

        this.menu();
    }

    finalizar() {
        console.log("salvando dados ao fechar...");
        this.cad.salvarEmCSV('clientes.csv');
        this.reg.salvarHistoricoCSV('estacionamento.csv');
        this.rl.close();
    }
}

new App().iniciar();