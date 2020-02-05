### Mail Notify
> A simple email notification program via get method.
* First of All, rename `sample_config.json` to `config.json`
#### Mail config 
* See : [https://nodemailer.com/smtp/](https://nodemailer.com/smtp/)

```js
nodemailer.createTransport({
  host: "my.smtp.host",
  port: 465,
  secure: true, // use TLS
  auth: {
    user: "username",
    pass: "pass"
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  }
});
```
#### Use
* Some example

```bash
curl http://192.168.12.1:3000/\?authMethod\=3\&fromEmail\=no-reply@baidu.cn\&toEmail\=test@baidu.cn\&sender\=Test\&subject\=cURLTest\&text\=test
curl http://192.168.12.1:3000/\?authMethod\=4\&name=1\&pass=1\&fromEmail\=no-reply@baidu.cn\&toEmail\=test@baidu.cn\&sender\=Test\&subject\=cURLTest\&text\=test
```

#### Any problem ?
* Just open a issue and I'll work for you.