const express = require('express');
const { spawn } = require('child_process');
const memoize = require('memoizee'); 

const app = express();
const port = 3000;

app.get('/exec1', (req, res) => {
  const cmd = req.query.cmd;

  const child = spawn('sh', ['-c', cmd]);

  let output = '';
  let errorOutput = '';
  child.stdout.on('data', (data) => output += data);
  child.stderr.on('data', (data) => errorOutput += data);

  child.on('close', (code) => {
    if (code === 0) {
      res.send(output);
    } else {
      res.status(500).send(`Command failed with code ${code}: ${errorOutput}`);
    }
  });
});

const memoizedExec2 = (cmd, callback) => {
  let cache = {};

  return (cmd, callback) => {
    if (cache[cmd]) {
      callback(null, cache[cmd]);
      return;
    }

    const child = spawn('sh', ['-c', cmd]);

    let output = '';
    let errorOutput = '';
    child.stdout.on('data', (data) => output += data);
    child.stderr.on('data', (data) => errorOutput += data);

    child.on('close', (code) => {
      if (code === 0) {
        cache[cmd] = output;
        callback(null, output);
      } else {
        callback(`Command failed with code ${code}: ${errorOutput}`);
      }
    });
  };
};

const memoizedExec2Instance = memoizedExec2();

app.get('/exec2', (req, res) => {
  const cmd = req.query.cmd;

  memoizedExec2Instance(cmd, (err, result) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(result);
    }
  });
});

const memoizedExec3 = memoize((cmd) => {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', cmd]);

    let output = '';
    let errorOutput = '';
    child.stdout.on('data', (data) => output += data);
    child.stderr.on('data', (data) => errorOutput += data);

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(`Command failed with code ${code}: ${errorOutput}`);
      }
    });
  });
});

app.get('/exec3', (req, res) => {
  const cmd = req.query.cmd;

  memoizedExec3(cmd)
    .then((result) => res.send(result))
    .catch((err) => res.status(500).send(err));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});