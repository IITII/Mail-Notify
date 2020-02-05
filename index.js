const config = require('./config.json');
const nodeMailer = require('nodemailer');
const transporter = nodeMailer.createTransport(config.office365Config);
const BodyParser = require('koa-bodyparser');
const Koa = require('koa');
const Router = require('koa-router');
const log4js = require('koa-log4');
const serve = require('koa-static');
const convert = require('koa-convert');
const path = require('path');

const logger = log4js.getLogger(config.loggerName);
const app = new Koa();
const router = Router();

logger.level = config.loggerLevel;


app.use(convert(BodyParser({
    encode: 'utf-8',
    formLimit: '20mb',
    jsonLimit: "7mb",
    textLimit: "5mb",
    onerror: (err, ctx) => {
        ctx.response.body = err
    }
})));
app.use(router.routes());

function web() {
    // 静态资源目录对于相对入口文件index.js的路径
    // const staticPath = './public';
    // app.use(log4js.koaLogger(log4js.getLogger('http'), {level: config.loggerLevel}));
    // app.use(serve(path.join(__dirname, staticPath)));
    app.listen(config.port, () => {
        logger.info('Service is listening on port: ' + config.port)
    });
}

/**
 * 发送邮件
 * For more, please read https://nodemailer.com/message/
 * @param fromEmail 发件 Email
 * @param toEmail   收件 Email
 * @param cc        抄送
 * @param bcc       秘密抄送
 * @param subject   主题
 * @param text      正文文本
 * @param html      正文 html
 * @param attachments   附件
 * @param sender        发件人
 * @param attachDataUrls    Boolean value, 如果为 true，则将 html 里面的 data:images 转换为嵌入式的附件
 * @param encoding  字符编码
 * @returns {Promise<void>} error
 */
async function sendMail(fromEmail, toEmail,
                        sender = fromEmail,
                        cc = null, bcc = null,
                        subject, text,
                        html = null, attachments = null,
                        attachDataUrls = null,
                        encoding = 'utf-8') {
    transporter.sendMail({
        from: fromEmail,
        to: toEmail,
        sender: sender,
        cc: cc,
        bcc: bcc,
        subject: subject,
        text: text,
        html: html,
        attachments: attachments,
        attachDataUrls: attachDataUrls,
        encoding: encoding
    })
        .catch(e => {
            logger.error(e);
            return e;
        });
    return null;
}

/**
 * 校验IP
 * @param ip 欲校验 IP
 * @returns {boolean|boolean} 结果
 */
function authIP(ip) {
    if (ip === "" || ip === undefined || ip === null)
        return false;
    let key = "";
    config.auth.requestIP.some(value => {
        if (value === ip) {
            key = value;
            return true;//仅提前结束循环
        }
    });
    return key === ip && key !== "";
}

/**
 * 校验用户名和密码
 * @param name 用户名
 * @param pass 密码
 * @returns {boolean} 校验结果
 */
function authNamePass(name, pass) {
    if (name === "" || name === undefined || name === null ||
        pass === "" || pass === undefined || pass === null)
        return false;
    let npMap = new Map();
    config.auth.namePass.some(value => {
        npMap.set(value[0], value[1]);
    });
    if (npMap.has(name)) {
        if (npMap.get(name).toString() === pass) {
            return true;
        }
    }
    return false;
}

/**
 * 校验
 * @param authMethod 校验方式。0: 与，1：或, 2: 只校验ip，3：只校验
 * @param ip 校验IP
 * @param name 用户名
 * @param pass 密码
 */
function auth(authMethod, ip = "", name = "", pass = "") {
    let returnValue = false;
    try {
        switch (authMethod) {
            case "0":
                returnValue = authIP(ip) && authNamePass(name, pass);
                break;
            case "1":
                returnValue = authIP(ip) || authNamePass(name, pass);
                break;
            case "3":
                returnValue = authIP(ip);
                break;
            case "4":
                returnValue = authNamePass(name, pass);
                break;
        }
        return returnValue === true;
    } catch (e) {
        logger.error(e);
        return false;
    }
}

router.get('/', async (ctx) => {
    try {
        let data = ctx.query;
        logger.debug(data);
        logger.debug(ctx.ip);
        if (data.authMethod === "" || data.authMethod === undefined || data.authMethod === null) {
            ctx.response.status = 203;
            ctx.response.body = "Non-Authoritative Information";
            logger.debug(ctx.response.status+": "+ ctx.req.url);
            return null;
        }
        if (!auth(data.authMethod, ctx.ip, data.name, data.pass)) {
            ctx.response.status = 401;
            ctx.response.body = "Authorized Fail";
            logger.debug(ctx.response.status+": "+ ctx.req.url);
            return null;
        }
        await sendMail(
            data.fromEmail, data.toEmail, data.sender,
            data.cc, data.bcc,
            data.subject, data.text
        )
            .then(()=>{
                logger.info("Sent successfully!!!");
                ctx.response.status = 200;
                ctx.response.body = "OK";
                logger.debug(ctx.response.status+": "+ ctx.req.url);
                return null;
            })
            .catch((e)=>{
                logger.error(e);
                ctx.response.status = 500;
                ctx.response.body = "Internal Server Error";
                return null;
            });
    } catch (e) {
        ctx.response.status = 400;
        ctx.response.body = "Bad Request";
        logger.debug(ctx.response.status+": "+ ctx.req.url);
        return null;
    }
});
web();