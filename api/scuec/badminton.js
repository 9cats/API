const Utils = require('../../src/common');
const CryptoJS = require('crypto-js'); /* JavaScript library of crypto standards. */
const superagent = require('superagent'); /* 轻量级的渐进式 ajax API */


/* 测试接口函数 */
export default async function handler(req, res) {
  /* 获取参数 */
  let {
    txrsfrzh = "txrsfrzh",
      yysjd1 = "yysjd1",
      yysjd2 = "yysjd2",
      yycdbh = "yycdbh",

      username = "username",
      password = "password"
  } = req.body;

  //新建未来羽毛球运动员
  let sporter = new Sporter(username, password);

  try {
    await sporter.login();
    let result = 
    await sporter.autoSubmit(txrsfrzh, yysjd1, yysjd2, yycdbh);
    res.send(Utils.Success(result))
  } catch (e) {
    res.send(Utils.Fail("error", e))
  }
}


class Sporter {
  /* 构造函数 */
  constructor(username, password) {
    this.username = username; //账号
    this.password = password; //密码
    this.agent = superagent.agent();
  }

  /* 返回加密后的密码 */
  encryptPassword(key0) {
    let plain = "ABCD".repeat(16) + this.password;
    let config = {
      iv: CryptoJS.enc.Utf8.parse("ABCD".repeat(4)),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
    let key = key0.replace(/(^\s+)|(\s+$)/g, "");
    key = CryptoJS.enc.Utf8.parse(key);

    return CryptoJS.AES.encrypt(plain, key, config).toString();
  }

  /* 获得几天后的日期 */
  getDay(dayNum) {
    let time_server = new Date(); //server 时间
    let time = new Date(time_server.getTime() + (eval(dayNum) + 8) * 24 * 60 * 60 * 1000); //北京时间

    let year = time.getFullYear();
    let month = (time.getMonth() + 1).toString().padStart(2, "0"); //左边需要补0
    let day = time.getDate();

    return `${year}-${month}-${day}`;
  }

  /* 登陆 */
  async login() {
    let pwdEncryptSalt = "";
    let execution = "";

    /* 获取加密盐 execution */
    await this.agent
      .get('http://id.scuec.edu.cn/authserver/login')
      .then(res => {
        /* 从网页中获取 pwdEncryptSalt 和 execution */
        pwdEncryptSalt = /(?<=id="pwdEncryptSalt" value=")\w+(?=" )/.exec(res.text)[0];
        execution = /(?<=name="execution" value=").+(?=" )/.exec(res.text)[0];
      })

    /* 登陆 */
    await this.agent
      .post("http://id.scuec.edu.cn/authserver/login?service=http://wfw.scuec.edu.cn/2021/08/29/book")
      .type('form')
      .send({
        username: this.username,
        password: this.encryptPassword(pwdEncryptSalt),
        execution: execution,
        captcha: "", //验证码
        _eventId: "submit",
        cllt: "userNameLogin",
        dllt: "generalLogin",
        lt: "",
      })

    /* 授权 */
    await this.agent.get("http://id.scuec.edu.cn/authserver/login?service=http://wfw.scuec.edu.cn/2021/08/29/book")
  }

  /* submit */
  async submit(txrsfrzh, yysjd, yycdbh, yyrq) {
    try {
      await this.agent
        .post("https://wfw.scuec.edu.cn/2021/08/29/book/check_playground_status")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send({
          "yysjd": yysjd, //预约的时间段
          "yyrq": yyrq, //预约日期
          "yycdbh": yycdbh, //预约场地编号  11号场地
        })
        .then(res => {
          console.log(res.text);
        })

      return await this.agent
        .post("https://wfw.scuec.edu.cn/2021/08/29/book/book")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send({
          "txrsfrzh": txrsfrzh, //同行人身份认证号
          "yysj": yysjd, //yydsj.replace('(', ''),
          "yyrq": yyrq, //预约日期
          "yycdbh": yycdbh //预约场地编号
        })
        .then(res => {
          console.log(res.text);
          return(res.text);
        })
    } catch (e) {
      console.log(`${Date.parse(new Date())},${e}`);
    }
  }

  /* 自动抢后天的羽毛球 */
  async autoSubmit(txrsfrzh, yysjd1, yysjd2, yycdbh) {
    /* 等待下一天 */
    /*
    for (;;) {
      let result = await this.agent
        .get("https://wfw.scuec.edu.cn/2021/08/29/book/partner")
        .then(res => {
          console.log(res.body.next_next_day == this.getDay(2));
          return res.body.next_next_day == this.getDay(2);
        })

      if(result == true) break;
      else await Utils.delay(1000);
    }
    */

    let result = [];
    result.push(await this.submit(txrsfrzh, yysjd1, yycdbh, this.getDay(2)));
    result.push(await this.submit(txrsfrzh, yysjd2, yycdbh, this.getDay(2)));
    return result;
  }
}