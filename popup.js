(function() {
  
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfworker.mjs';
    // Declaração de variáveis
    let pdfTextoGlobal = ''; 
    const pdfFileInput = document.getElementById('pdfUpload');
    const resultElement = document.getElementById('result');
    const uploadButton = document.getElementById('uploadButton');
    const fileNameDisplay = document.getElementById('fileNameDisplay'); 

    // Desabilita o botão inicialmente
   uploadButton.disabled = true;

    // Lógica para ler o arquivo
    pdfFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            fileNameDisplay.textContent = "";
            uploadButton.disabled = true;
            return;
        }

        fileNameDisplay.textContent = file.name;
        resultElement.textContent = "Processando...";
        uploadButton.disabled = true;

        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            
            pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(function(pdfDoc) {
                let totalPages = pdfDoc.numPages;
                let textPromises = [];
                for (let i = 1; i <= totalPages; i++) {
                    textPromises.push(
                        pdfDoc.getPage(i).then(page => page.getTextContent()).then(textContent => textContent.items.map(item => item.str).join(' '))
                    );
                }
                Promise.all(textPromises).then(function(pagesText) {
                    pdfTextoGlobal = pagesText.join('\n'); 
                    resultElement.textContent = "Arquivo lido com sucesso. Clique em 'Enviar'";
                    uploadButton.disabled = false; //habilita novamente o botão de enviar
                });
            }).catch(function(error) {
                console.error('Erro ao processar o PDF:', error);
                resultElement.textContent = 'Erro ao processar o PDF.';
                uploadButton.disabled = true;
            });
        };
        reader.readAsArrayBuffer(file);
    });

    // Lógica do botão "Enviar"
    uploadButton.addEventListener('click', () => {
        if (!pdfTextoGlobal) {
            resultElement.textContent = "Nenhum texto de PDF foi processado.";
            return;
        }
        extrairEExibirDados(pdfTextoGlobal);
    });

    // Regex
    function extrairEExibirDados(pdfTexto) {
        const padroes = {
           delegacia: /Delegacia do caso:\s*(.*?)(?=Local do caso:|Número do Procedimento:|$)/i,
           local_caso: /Local do caso:\s*(.*?)(?=Número do Procedimento:|$)/i,
           local: /Tipo do local do fato:\s*(.*?)(?=Data Início do fato:|$)/i,
            procedimento:  /Número do procedimento:\s*(.*?)(?=Data de autuação:|$)/i,
            autuacao: /Data de autuação:\s*(\d{2}\/\d{2}\/\d{4})/i,
            resumo: /Resumo do fato:\s*([^\n,;]+)(?=Tipo do Local do Fato:|$)/i,
            data_fato: /Data Início do fato:\s*(\d{2}\/\d{2}\/\d{4})/i,
            endereco: /Endereço do fato:\s*(.*?)(?=Vítima|Órgão lesado:|$)/i,
            nome: /(?:Investigado|conduzido):\s*(.*?)(?=natural de|,|$)/i,
            local: /Tipo do local do fato:\s*(.*?)(?=Data Início do fato:|$)/i,
            filiacao: /filho\(a\)\s+de\s+(.*?)(?=\,\s+nascido|\s*natural de|\s*instrução|$)/i,
            cpf: /CPF nº [:\s]*([\d.\-]+)(?=,|\s*bairro|\s*CEP|$)/i,
            vitima: /Órgão lesado:[:\s]*((?:(?![\n,.]).)+)(?=Meios Empregados:|$)/i,
            nacionalidade: /natural de \s*([^.\n,]+)/i, //regex ok "natural de"
            naturalidade: /natural de \s*([^.\n,]+)/i,//Pega o mesmo dado de Nacionalidade "natural de"
            nascimento: /nascido\(a\)\s+aos\s+(\d{2}\/\d{2}\/\d{4})/i,
            escolaridade: /instrução\s*([\s\S]+?)(?=\n\w+:|CPF|profissão|$)/i,
            logradouro:  /(?:residente na\(o\)|bairro)\s+(.*?)(?=,?\s*CEP|$)/i,
           tipificacao: /(?:Tipifica(?:ç|c)ão\s*Penal|Tipificação):\s*([\s\S]+?)(?=(?:OBSERVAÇÕES|Obs.:|$))/i,
        };
        //armazenar todos os resultados extraídos de uma vez

        let resultados = {};
        for (const chave in padroes) {
            const match = pdfTexto.match(padroes[chave]);
            resultados[chave] = (match && match[1]) ? match[1].trim() : null;
        }
        console.log('Texto após a delegacia:', pdfTexto.match(/Delegacia do caso:\s*([^\n]+)/i));
        console.log('Valor da observacoes:', resultados.observacoes);
        console.log("Valor de Tipificação>", pdfTexto.match(/Tipificação Penal:\s*/i));
        //FALSE/TRUE
       
        let procedimento_fla = false;
        let indiciamento_d = false; 
        let indiciamento_i = false;
        //verificar se o procedimento começa com FLA(flagrante)
        if (resultados.procedimento && resultados.procedimento.startsWith('FLA')) {
            procedimento_fla = true;

        }
        
            
        const textoCompleto = pdfTexto.toLowerCase();
        
        if (textoCompleto.includes('indiciamento direto')) {
            indiciamento_d = true;
        } 
        
        else if (textoCompleto.includes('indiciamento indireto')) {
            indiciamento_i= true;
        }


        let dados_gerais = {
            delegacia: resultados.delegacia,
            local_caso: resultados.local_caso,
            procedimento: resultados.procedimento,
            autuacao: resultados.autuacao
        };

        let dados_fato = {
            resumo: resultados.resumo,
            local: resultados.local,
            data_fato: resultados.data_fato,
            endereco: resultados.endereco,
            vitima: resultados.vitima
        };

        let qualificacao = {
            nome: resultados.nome,
            filiacao: resultados.filiacao,
            cpf: resultados.cpf,
            nacionalidade: resultados.nacionalidade,
            nascimento: resultados.nascimento,
            naturalidade: resultados.naturalidade,
            escolaridade: resultados.escolaridade.replace(/,/g,''),
            logradouro: resultados.logradouro,
            tipificacao: resultados.tipificacao
        };

        let output = '';

        output += '### DADOS GERAIS\n';
        for (const key in dados_gerais) {
            const label = key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
            output += `${label}: ${dados_gerais[key] || 'Não encontrado'}\n`;
        }
        output += '\n';

        output += '### DADOS DO FATO\n';
        for (const key in dados_fato) {
            const label = key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
            output += `${label}: ${dados_fato[key] || 'Não encontrado'}\n`;
        }
        output += '\n';

        output += '### QUALIFICAÇÃO\n';
        for (const key in qualificacao) {
            const label = key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
            output += `${label}: ${qualificacao[key] || 'Não encontrado'}\n`;
        }
        output += '\n### OBSERVAÇÃO\n';
        output += `Flagrante?: ${procedimento_fla}\n`;
        output += `Indiciamento Direto: ${indiciamento_d}\n`;
        output += `Indiciamento Indireto: ${indiciamento_i}\n`;

        resultElement.textContent = output;
    }
    
    function preencherFormulario(dados) {
        document.addEventListener('DOMContentLoaded', () => {
            const uploadButton = document.getElementById('uploadButton');
            const preencherButton = document.getElementById('preencherButton');
            // Adiciona um evento de clique ao botão de upload
            uploadButton.addEventListener('click', () => {
                // Quando o botão de upload é clicado, exibe o botão de preencher
                preencherButton.style.display = 'block';
            });
        });
    }
    preencherFormulario();

    
})();