// Lógica para automação de preenchimento de formulários em navegadores
 
const dadospdf = {
    nome: '',
    email: '',
}
function preencherFormulario(dados) {
    const campoNome = document.querySelector('input[name="nome"]');
    if (campoNome) {
        campoNome.value = dados.nome;
        campoNome.dispatchEvent(new Event('input', { bubbles: true }));
    }
}
preencherFormulario(dadospdf);