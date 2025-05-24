require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Dados simulados de usuários
const users = [
  { id: 1, username: 'user1', password: '123', perfil: 'admin' },
  { id: 2, username: 'user2', password: '123', perfil: 'comum' }
];

// Simulador de repositório
class Repository {
  constructor() {
    this.contracts = [
      { id: 1, empresa: 'empresa1', data_inicio: '2023-01-01' },
      { id: 2, empresa: 'empresa2', data_inicio: '2023-02-01' }
    ];
  }

  // Busca contratos com verificação
  executeSafe(empresa, inicio) {
    return this.contracts.filter(c => c.empresa === empresa && c.data_inicio === inicio);
  }
}

// Função de autenticação
function doLogin(credentials) {
  return users.find(u => u.username === credentials.username && u.password === credentials.password);
}

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const token = req.params.sessionid;

  if (!token) return res.status(401).json({ message: 'Token não fornecido' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
}

// Endpoint de login
app.post('/api/auth/login', (req, res) => {
  const credentials = req.body;
  const userData = doLogin(credentials);

  if (userData) {
    const token = jwt.sign(
      { id: userData.id, perfil: userData.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ sessionid: token });
  } else {
    res.status(401).json({ message: 'Credenciais inválidas' });
  }
});

// Endpoint de listagem de usuários (apenas admin)
app.get('/api/users/:sessionid', authenticateToken, (req, res) => {
  if (req.user.perfil !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  res.status(200).json({ data: users });
});

// Endpoint de contratos com validação de entrada
app.get('/api/contracts/:empresa/:inicio/:sessionid', authenticateToken, (req, res) => {
  const { empresa, inicio } = req.params;

  // Validação contra injeção simples
  if (!/^[\w\s]+$/.test(empresa) || !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
    return res.status(400).json({ message: 'Parâmetros inválidos' });
  }

  const repository = new Repository();
  const result = repository.executeSafe(empresa, inicio);

  if (result && result.length > 0) {
    res.status(200).json({ data: result });
  } else {
    res.status(404).json({ message: 'Dados não encontrados' });
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
