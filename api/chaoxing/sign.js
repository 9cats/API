const chaoxing = require("../../chaoxing/dist/chaoxing")

export default async function handler(req, res) {
  /*--- 获取账号密码 ----*/
  let account = req.body["account"];
  let password = req.body["password"];

  /* 检测是否获取到账号密码 */
  if (!(account && password)) {
    return res.send({
      msg: "登陆失败，请输入账号密码",
      success: false
    })
  }

  let me = chaoxing.agent(account, password);

  /* 登录到学习通 */
  let loginResult = await me.login();
  if (loginResult.status != true) {
    return res.send({
      msg: "登陆失败，请检查账号密码",
      success: false
    })
  }

	/* 签到 */
  let signResult = await me.sign();

  res.send(signResult);
}