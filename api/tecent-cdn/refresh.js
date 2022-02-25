const tencentcloud = require("tencentcloud-sdk-nodejs");

const CdnClient = tencentcloud.cdn.v20180606.Client;

export default async function handler(req, res) {
  /* 获取参数 */
  let client;
  let {
    SecretId = "SecretId",
      SecretKey = "SecretKey",
      Paths = "Paths",
  } = req.body;

  try {
    Paths = eval(Paths);
  } catch (e) {
    return res.send(Fail(e));
  }


  try {
    const clientConfig = {
      credential: {
        secretId: SecretId,
        secretKey: SecretKey,
      },
      region: "",
      profile: {
        httpProfile: {
          endpoint: "cdn.tencentcloudapi.com",
        },
      },
    };

    client = new CdnClient(clientConfig);
  } catch (e) {
    return res.send(Fail(`Error login in.`, e));
  }

  client.PurgePathCache({
      "Paths": Paths,
      "FlushType": "flush"
    })
    .then(
      (data) => {
        return res.send(Success(data));
        console.log(data);
      },
      (err) => {
        return res.send(Fail(err));
      }
    )
}

function Success(msg) {
  return {
    success: true,
    message: msg
  }
}

function Fail(msg, e) {
  console.log(msg, e);
  return {
    success: false,
    message: msg,
    error: e
  }
}