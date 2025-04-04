import https from 'https';

const options = {
  method: 'POST',
  hostname: 'control.msg91.com',
  port: null,
  path: '/api/v5/otp?otp_expiry=1&template_id=6748181ad6fc056ab24745e3&mobile=918299274388&authkey=430687AwnfuLS3xxp67481945P1',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = https.request(options, (res) => {
  const chunks = [];

  res.on('data', (chunk) => {
    chunks.push(chunk);
  });

  res.on('end', () => {
    const body = Buffer.concat(chunks);
    console.log(body.toString());
  });
});

req.end();