let MostrarSenha = document.getElementById("VerSenha");
let Senha = document.getElementById("senha");
const userAgent = navigator.userAgent;
let trava = false;

// LÓGICA CORRIGIDA: Variáveis para controlar o tipo de busca
let taskType = 'Normal'; 
let includeDrafts = false; // NOVA VARIÁVEL GLOBAL para controlar a busca de rascunhos

MostrarSenha.addEventListener("click", () => {
    Senha.type = Senha.type === "password" ? "text" : "password";
});

function Atividade(Titulo, Atividade) {
    const div = document.createElement("div");
    div.className = "Notificacao";

    const h1 = document.createElement("h1");
    h1.textContent = Titulo;

    const p = document.createElement("p");
    p.textContent = Atividade;

    div.appendChild(h1);
    div.appendChild(p);

    const article = document.getElementById("TamanhoN");
    article.appendChild(div);

    setTimeout(() => {
        div.style.animation = "sumir 1.5s ease";
        div.addEventListener("animationend", () => {
          div.remove();
        })
    }, 2500);
}

const options = {
    TEMPO: 1, //Tempo atividade em Minutos
    ENABLE_SUBMISSION: true, //Habilitar envio de atividades
    LOGIN_URL: 'https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken',
    getLoginData: function() {
        return {
            user: document.getElementById('ra').value,
            senha: document.getElementById('senha').value,
        };
    },
};

function makeRequest(url, method = 'GET', headers = {}, body = null) {
  const options = {
    method,
    headers: {
      'User-Agent': navigator.userAgent,
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    options.body = body;
  }

  return fetch(url, options)
    .then(res => {
      if (!res.ok) throw new Error(`❌ HTTP ${method} ${url} => ${res.status}`);
      return res.json();
    });
}

function loginRequest() {
    if (trava) {
        Atividade('SALA-DO-FUTURO', 'Aguarde, processo em andamento...');
        return;
    }
    trava = true;

    const headers = {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': navigator.userAgent,
        'Ocp-Apim-Subscription-Key': '2b03c1db3884488795f79c37c069381a',
    };

    makeRequest(options.LOGIN_URL, 'POST', headers, JSON.stringify(options.getLoginData()))
        .then(data => {
            console.log('✅ Login bem-sucedido:', data);
            Atividade('SALA-DO-FUTURO', 'Logado com sucesso!');
            sendRequest(data.token);
        })
        .catch(error => {
            Atividade('SALA-DO-FUTURO', 'Nao foi possivel logar!');
            setTimeout(() => {
                trava = false;
            }, 2000);
        });
}

function sendRequest(token) {
  const url = 'https://edusp-api.ip.tv/registration/edusp/token';
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Host: 'edusp-api.ip.tv',
    'x-api-realm': 'edusp',
    'x-api-platform': 'webclient',
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Connection": "keep-alive",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
  };

  fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token }),
  })
    .then(response => {
      if (!response.ok)
        throw new Error(`❌ Erro HTTP Status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log('✅ Informações do Aluno:', data);
      fetchUserRooms(data.auth_token);
    })
    .catch(error => {
        console.error('❌ Erro na requisição:', error);
        trava = false;
    });
}

// FUNÇÃO REESTRUTURADA para juntar tarefas de todas as turmas
function fetchUserRooms(token) {
  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': token,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Connection": "keep-alive",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",       
    },
  };

  fetch('https://edusp-api.ip.tv/room/user?list_all=true&with_cards=true', fetchOptions)
    .then(response => {
      if (!response.ok) throw new Error(`❌ Erro: ${response.statusText}`);
      return response.json();
    })
    .then(data => {
      console.log('✅ Salas do usuário:', data);
      if (data.rooms && data.rooms.length > 0) {
        Atividade('TAREFA-SP','Procurando atividades em todas as turmas...');
        
        // 1. Cria um array de "promessas", uma para cada turma
        const allRoomPromises = data.rooms.map(room => fetchTasks(token, room.name));

        // 2. Espera todas as buscas terminarem
        Promise.all(allRoomPromises).then(resultsFromAllRooms => {
            // 3. Junta os resultados de todas as turmas em um único array
            const allFoundTasks = [].concat(...resultsFromAllRooms);

            if (allFoundTasks.length > 0) {
                // 4. Mostra o modal de seleção com a lista completa
                showTaskSelection(allFoundTasks, token);
            } else {
                Atividade('TAREFA-SP', `Nenhuma atividade do tipo "${taskType}" encontrada.`);
            }
            trava = false; // Libera a trava
        });

      } else {
        console.warn('⚠️ Nenhuma sala encontrada..');
        trava = false;
      }
    })
    .catch(error => {
        console.error('❌ Erro na requisição de salas:', error);
        trava = false;
    });
}

// FUNÇÃO REESTRUTURADA para retornar as tarefas de UMA turma
function fetchTasks(token, room) {
    const encodedRoom = encodeURIComponent(room); 

    // LÓGICA DE BUSCA TOTALMENTE CORRIGIDA COM O PARÂMETRO 'with_apply_moment'
    const allUrls = {
        'Normal':   { label: 'Normal',   url: `https://edusp-api.ip.tv/tms/task/todo?expired_only=false&filter_expired=true&with_answer=true&publication_target=${encodedRoom}&answer_statuses=pending&with_apply_moment=false` },
        'Rascunho': { label: 'Rascunho', url: `https://edusp-api.ip.tv/tms/task/todo?expired_only=false&filter_expired=true&with_answer=true&publication_target=${encodedRoom}&answer_statuses=draft&with_apply_moment=true` },
        'ExpiradaPendente': { label: 'Expirada', url: `https://edusp-api.ip.tv/tms/task/todo?expired_only=true&filter_expired=false&with_answer=true&publication_target=${encodedRoom}&answer_statuses=pending&with_apply_moment=true` },
        'ExpiradaRascunho': { label: 'Expirada', url: `https://edusp-api.ip.tv/tms/task/todo?expired_only=true&filter_expired=false&with_answer=true&publication_target=${encodedRoom}&answer_statuses=draft&with_apply_moment=true` }
    };

    let urlsToFetch = [];

    // Define quais URLs buscar com base no botão clicado
    if (taskType === 'Normal') {
        urlsToFetch.push(allUrls['Normal']);
        if (includeDrafts) {
            urlsToFetch.push(allUrls['Rascunho']); // Busca normais + rascunhos não expirados
        }
    } else if (taskType === 'Rascunho') {
        urlsToFetch.push(allUrls['Rascunho']); // Busca APENAS rascunhos não expirados
    } else if (taskType === 'Expirada') {
        urlsToFetch.push(allUrls['ExpiradaPendente']); // Busca TODAS expiradas (pendentes e rascunhos)
        urlsToFetch.push(allUrls['ExpiradaRascunho']);
    }

    const fetchOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': token,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Connection": "keep-alive",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
        },
    };

    const requests = urlsToFetch.map(({ label, url }) =>
        fetch(url, fetchOptions)
        .then(response => response.json())
        .then(data => ({ label, data }))
        .catch(error => null)
    );

    // Retorna a promessa que, quando resolvida, contém as tarefas desta turma
    return Promise.all(requests).then (results => {
        let tasksForThisRoom = [];
        results.forEach(result => {
            if (result && result.data.length > 0) {
                const tasksWithType = result.data.map(task => ({...task, type: result.label, room: room }));
                tasksForThisRoom = tasksForThisRoom.concat(tasksWithType);
            }
        });
        return tasksForThisRoom; // Retorna a lista de tarefas encontradas
    });
}

function showTaskSelection(tasks, token) {
    createTaskSelectionModal(tasks, (selectedTask) => {
        console.log('Tarefa selecionada para fazer:', selectedTask.title);
        loadTasks([selectedTask], token, selectedTask.room, selectedTask.type);
    });
}

function loadTasks(data, token, room, tipo) {
  const isRedacao = task =>
    task.tags.some(t => t.toLowerCase().includes('redacao')) ||
    task.title.toLowerCase().includes('redação');

  if (!data || data.length === 0) {
    return; 
  }
  
  const orderedTasks = data.filter(task => !isRedacao(task));
  
  iniciarModalGlobal(orderedTasks.length);

  orderedTasks.forEach((task, i) => {
    const taskId = task.id;
    const taskTitle = task.title;

    const url = `https://edusp-api.ip.tv/tms/task/${taskId}/apply?preview_mode=false`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-realm': 'edusp',
      'x-api-platform': 'webclient',
      'x-api-key': token,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Connection": "keep-alive",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",        
    };

    fetch(url, { method: 'GET', headers })
      .then(response => {
        if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);
        return response.json();
      })
      .then(details => {
        const answersData = {};
        details.questions.forEach(question => {
          const questionId = question.id;
          let answer = {}; // Resposta padrão
          const qType = question.type;

          if (qType === 'info') return; // Pula questões que são apenas informativas

          // --- LÓGICA DE RESPOSTA APRIMORADA PARA VÁRIOS TIPOS ---
          if (qType === 'media') {
            answer = { status: 'error', message: 'Type=media system require url' };
          } else if (qType === 'text_ai' || qType === 'discursive') {
            answer = { "0": "Nao sei a resposta." }; // Resposta de texto genérica
          } else if (qType === 'fill-letters') {
            answer = "a"; // Letra genérica
          } else if (qType === 'cloud' || qType === 'order-sentences' || qType === 'fill-words') {
            answer = []; // Array vazio para respostas baseadas em lista
          } else if (question.options && typeof question.options === 'object') {
            // Lógica existente para múltipla escolha (que já funciona bem)
            const optionIds = Object.keys(question.options);
            if (optionIds.length > 0) {
                const randomIndex = Math.floor(Math.random() * optionIds.length);
                const randomOptionId = optionIds[randomIndex];
                
                optionIds.forEach(id => {
                    answer[id] = (id === randomOptionId);
                });
            }
          }
          // --- FIM DA CORREÇÃO ---

          answersData[questionId] = {
            question_id: questionId,
            question_type: qType,
            answer,
          };
        });
        
        Atividade('TAREFA-SP', `Fazendo atividade: ${taskTitle}`);
        console.log(`📝 Tarefa: ${taskTitle}`);
        if (options.ENABLE_SUBMISSION) {
          submitAnswers(taskId, answersData, token, room,taskTitle, i + 1, orderedTasks.length);
        }
      })
      .catch(error =>
        console.error(`❌ Erro ao buscar detalhes da tarefa: ${taskId}:`, error)
      );
  });
}

function delay(ms) {  
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function submitAnswers(taskId, answersData, token, room, taskTitle, index, total) {
  let draft_body = {
    status: 'submitted',
    accessed_on: 'room',
    executed_on: room,
    answers: answersData,
  };

  console.log(`⏳ Aguardando ${options.TEMPO} minutos e realizando a tarefa ID: ${taskId}...`);

  if (document.getElementById('globalModalOverlay')) {
    atualizarModalGlobal(taskTitle, options.TEMPO * 20, index, total);
  }

  await delay(options.TEMPO * 20 * 1000);

  try {
    const response = await fetch(`https://edusp-api.ip.tv/tms/task/${taskId}/answer`, {
        method: 'POST',
        headers: {
            'X-Api-Key': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(draft_body)
    });
    const response_json = await response.json();

    // --- VERIFICAÇÃO DE SEGURANÇA ADICIONADA ---
    if (!response.ok || !response_json.id) {
        console.error('❌ Falha ao enviar a resposta inicial. Resposta do servidor:', response_json);
        Atividade('TAREFA-SP', '❌ Erro ao enviar a atividade - ' + taskTitle);
        return; // Para a execução para evitar mais erros
    }
    // --- FIM DA VERIFICAÇÃO ---

    const new_task_id = response_json.id;
    fetchCorrectAnswers(taskId, new_task_id, token,taskTitle);
  } catch (error) {
    console.error('❌ Erro ao enviar as respostas:', error);
  }
}

function fetchCorrectAnswers(taskId, answerId, token,taskTitle) {
  const url = `https://edusp-api.ip.tv/tms/task/${taskId}/answer/${answerId}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-api-realm': 'edusp',
    'x-api-platform': 'webclient',
    'x-api-key': token,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Connection": "keep-alive",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",      
  };

  fetch(url, { method: 'GET', headers })
    .then(response => {
      if (!response.ok) throw new Error(`❌ Erro ao buscar respostas corretas! Status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log('📂 Respostas corretas recebidas:', data);
      putAnswer(data, taskId, answerId, token,taskTitle);
    })
    .catch(error =>
      console.error('❌ Erro ao buscar respostas corretas:', error)
    );
}

function putAnswer(respostasAnteriores, taskId, answerId, token,taskTitle) {
  const url = `https://edusp-api.ip.tv/tms/task/${taskId}/answer/${answerId}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-api-realm': 'edusp',
    'x-api-platform': 'webclient',
    'x-api-key': token,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Connection": "keep-alive",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",      
  };

  const novasRespostasPayload = transformJson(respostasAnteriores);

  fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(novasRespostasPayload),
  })
    .then(response => {
      if (!response.ok) throw new Error(`❌ Erro ao enviar respostas corrigidas! Status: ${response.status}`);
      return response.json();
    })
    .then(data => {
        Atividade('TAREFA-SP','✅ Atividade Concluida - ' + taskTitle);
      console.log('✅ Respostas corrigidas enviadas com sucesso:', data);
    })
    .catch(error => {
      Atividade('TAREFA-SP','❌ Erro ao corrigir a atividade - ' + taskTitle);
      console.error('❌ Erro ao enviar respostas corrigidas:', error);
    });
}

function transformJson(jsonOriginal) {
    if (!jsonOriginal || !jsonOriginal.task || !jsonOriginal.task.questions) {
      throw new Error("Estrutura de dados inválida para transformação.");
    }
    let novoJson = {
      accessed_on: jsonOriginal.accessed_on,
      executed_on: jsonOriginal.executed_on,
      answers: {}
    };
    for (let questionId in jsonOriginal.answers) {
      let questionData = jsonOriginal.answers[questionId];
      let taskQuestion = jsonOriginal.task.questions.find(q => q.id === parseInt(questionId));
      if (!taskQuestion) {
        console.warn(`Questão com ID ${questionId} não encontrada!`);
        continue;
      }
      let answerPayload = {
        question_id: questionData.question_id,
        question_type: taskQuestion.type,
        answer: null
      };
      try {
        switch (taskQuestion.type) {
          case "order-sentences":
            if (taskQuestion.options && taskQuestion.options.sentences && Array.isArray(taskQuestion.options.sentences)) {
              answerPayload.answer = taskQuestion.options.sentences.map(sentence => sentence.value);
            }
            break;
          case "fill-words":
            if (taskQuestion.options && taskQuestion.options.phrase && Array.isArray(taskQuestion.options.phrase)) {
              answerPayload.answer = taskQuestion.options.phrase
                .map(item => item.value)
                .filter((_, index) => index % 2 !== 0);
            }
            break;
          case "text_ai":
            let cleanedAnswer = removeTags(taskQuestion.comment || '');
            answerPayload.answer = { "0": cleanedAnswer };
            break;
          case "fill-letters":
            if (taskQuestion.options && taskQuestion.options.answer !== undefined) {
              answerPayload.answer = taskQuestion.options.answer;
            }
            break;
          case "cloud":
            if (taskQuestion.options && taskQuestion.options.ids && Array.isArray(taskQuestion.options.ids)) {
              answerPayload.answer = taskQuestion.options.ids;
            }
            break;
          default:
            if (taskQuestion.options && typeof taskQuestion.options === 'object') {
              answerPayload.answer = Object.fromEntries(
                Object.keys(taskQuestion.options).map(optionId => {
                  const optionData = taskQuestion.options[optionId];
                  const answerValue = (optionData && optionData.answer !== undefined) ? optionData.answer : false;
                  return [optionId, answerValue];
                })
              );
            }
            break;
        }
        novoJson.answers[questionId] = answerPayload;
      } catch (err) {
        console.error(`Erro ao processar questão ID ${questionId}:`, err);
        continue;
      }
    }
    return novoJson;
}

function removeTags(htmlString) {
  return htmlString.replace(/<[^>]*>?/gm, '');
}

// --- Event Listeners para os botões ---

document.getElementById('Enviar').addEventListener('submit', (e) => {
    e.preventDefault();
    // LÓGICA CORRIGIDA: Botão principal busca normais E rascunhos
    taskType = 'Normal';
    includeDrafts = true;
    loginRequest();
});

const botaoPendente = document.querySelector('#FazerPendente');
if (botaoPendente) {
    botaoPendente.addEventListener('click', (event) => {
        event.preventDefault();
        // LÓGICA ALTERADA: Botão agora busca APENAS rascunhos
        taskType = 'Rascunho';
        includeDrafts = false;
        console.log('Botão "Fazer Rascunhos" foi clicado. Buscando tarefas em rascunho.');
        loginRequest();
    });
}

const botaoExpirada = document.querySelector('#FazerExpirada');
if (botaoExpirada) {
    botaoExpirada.addEventListener('click', (event) => {
        event.preventDefault();
        taskType = 'Expirada';
        includeDrafts = false;
        console.log('Botão "Fazer Atividade Expirada" foi clicado. Buscando tarefas expiradas.');
        loginRequest();
    });
}
