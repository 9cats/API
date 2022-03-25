const superagent = require('superagent'); /* 轻量级的渐进式 ajax API */
const {
  getCurTime
} = require("./utils")

class ChaoXing {
  /* 构造函数 */
  constructor(account, password) {
    this.account = account; //账号
    this.password = password; //密码
    this.agent = superagent.agent();
  }

  /* 登陆 */
  async login() {
    /* 登陆到 passport2.chaoxing.com */
    let result = await this.agent
      .post('https://passport2.chaoxing.com/fanyalogin') //登陆接口
      .type('form') //发送数据格式 Form
      .send({ //发送数据
        uname: this.account,
        password: Buffer.from(this.password).toString('base64'),
        t: 'true'
      })
      /* 接收数据后的回调 */
      .then(res => {
        /* 解析接收到的数据 */
        let info = eval('(' + res.text + ')');

        /* 判断登陆是否正确 */
        if (info.status == true) {
          console.log(`${getCurTime()}:${this.account}: 登陆成功`)
          return info;
        } else {
          console.log(`${getCurTime()}:${this.account}: 登陆失败，密码错误`)
          return info;
        }
      })

    /* 登陆到 office.chaoxing.com */
    await this.agent.get('https://office.chaoxing.com/front/third/apps/seat/index');

    return result;
  }

  /* 签到 */
  async sign() {
    /* 获取最近的预约信息 */
    let info = await this.agent
      .get('https://office.chaoxing.com/data/apps/seatengine/reservelist')
      .query({
        pageSize: '1',
        seatId: '602'
      })
      .then(res => {
        return res.body.data.reserveList[0];
      })

    /* 签到 */
    let result = await this.agent
      .get('https://office.chaoxing.com/data/apps/seatengine/sign')
      .query({id: info.id})
      .then(res => {
        if (res.body.success) {
          console.log(`${getCurTime()}:${this.account}: 成功签到`);
        } else {
          console.log(`${getCurTime()}:${this.account}: 签到失败`);
        }
        return res.body;
      })
    
      console.log(result)
      return result;
  }
}

// status = {
//   '0': '待履约',
//   '1': '学习中',
//   '2': '已履约',
//   '3': '暂离中',
//   '5': '被监督中',
//   '7': '已取消',
// }

module.exports = {
  ChaoXing
};