const http = require('http');

const data = JSON.stringify({
  title: 'Test Task',
  description: 'Test description',
  priority: 'medium',
  category: 'Homework',
  dueDate: '2026-10-10',
  estimatedTime: 60,
  assignees: [],
  approvalRequired: false,
  subtasks: []
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/tasks',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
