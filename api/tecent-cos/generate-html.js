/**
 * 腾讯云 COS 静态网页生成脚本
 */
const fs = require("fs");
const pug = require("pug");
const path = require("path");
const COS = require("cos-nodejs-sdk-v5");
const {XMLParser} = require("fast-xml-parser");

const compiledFunction = pug.compileFile(path.resolve(process.cwd(), 'src/temple.pug'));
const parser = new XMLParser();

//全局变量
var cos;

/* 以上是环境变量 */

export default async function handler(req, res) {
  /* 获取参数 */
  let {
    SecretId = "SecretId",
      SecretKey = "SecretKey",
      Region = "Region",
      Bucket = "Bucket",
      Ignore = "Ignore"
  } = req.body;
  /* 使用 SecretId 和 SecretKey 登陆腾讯云 */
  try {
    cos = new COS({
      SecretId: SecretId,
      SecretKey: SecretKey,
    });
  } catch (e) {
    return res.send(Fail(`Error login in tecnet cloud.`, e));
  }


  /* 转数组 */
  if (Ignore && Ignore != "") {
    try {
      Ignore = eval(Ignore);
    } catch (e) {
      return res.send(Fail(`Error get params of ignore.`, e));
    }
  }

  /* 读取当前是否有任务在经行 */
  let promiseArr = []; //用于异步上传文件
  let contents; //存放所有的文件及信息
  let tree = { //将contents转为树
    Key: "",
    child: []
  };

  /* 开始执行任务 */
  console.log(`Start Function`);
  /* 获取 COS 所有文件信息（路径、大小、修改时间） */
  let data = "";
  try {
    const res = await getObject({
      Bucket: Bucket,
      Region: Region,
      Key: '/'
    });
    data = res.Body;
    console.log('Get bucket catalog: ', Bucket);
  } catch (e) {
    return res.send(Fail(`Error get bucket catalog.`, e));
  }

  /* 从上步获得的数据中取出变量 */
  try {
    contents = parser.parse(data).ListBucketResult.Contents;

    let current = tree;
    for (let index in contents) {
      let content = contents[index];
      let path = content.Key.split('/');
      /* 根目录文件 || 根目录文件夹 */
      if ((path.length == 1) || (path.length == 2 && path[1] == '')) {
        current = tree;
      }
      /* 文件夹 */
      if (path[path.length - 1] == '') {
        if (!Ignore.includes(path[path.length - 2])) {
          current.child.push(content);
        }
        content.child = [];
        content.relPath = path[path.length - 2];
        content.relName = path[path.length - 2] + '/';
        current = content;
      }
      /* 文件 */
      else {
        if (!Ignore.includes(path[path.length - 1])) {
          current.child.push(content);
        }
        content.relPath = path[path.length - 1];
        content.relName = path[path.length - 1];
      }
      /* 处理额外的文件信息，用于显示 */
      let len = content.relName.length;
      if (len > 76) {
        content.showInfo = content.LastModified.padStart(24, " ") + ("" + content.Size).padStart(25, " ");
      } else {
        content.showInfo = content.LastModified.padStart(100 - len, " ") + ("" + content.Size).padStart(25, " ");
      }
    }
    console.log(`Process Bucket Infomation`);
  } catch (e) {
    return res.send(Fail(`Error process bucket catalog.`, e));
  }

  /* 排序 */
  sortFile(tree);

  /* 输出 */
  try {
    let DirList = [tree];
    for (let i in contents) {
      if (IsDir(contents[i])) {
        DirList.push(contents[i]);
      }
    }

    promiseArr = DirList.map(Dir => {
      const params = {
        Bucket: Bucket,
        Region: Region,
        Key: Dir.Key + 'index.html',
        StorageClass: 'STANDARD',
        Body: compiledFunction(Dir), // 上传文件对象
      }
      return putObject(params);
    })

    await Promise.all(promiseArr);
    console.log(`Generate and put files successfully`);
  } catch (e) {
    return res.send(Fail(`Error generate or put.`, e));
  }

  /* 响应 */
  return res.send(Success("Mission completed"));
}


//排序
function sortFile(content) {
  /* 递归 */
  for (let i in content.child) {
    if (IsDir(content.child[i])) {
      sortFile(content.child[i]);
    }
  }
  /* 排序 */
  content.child.sort((a, b) => {
    if (IsDir(a) && !IsDir(b)) return -1;
    if (IsDir(b) && !IsDir(a)) return 1;
    return a - b;
  })
}

//判断 content 是否是文件夹
function IsDir(content) {
  let path = content.Key.split('/');
  return path[path.length - 1] == '';
}

function getObject(params) {
  return new Promise((resolve, reject) => {
    cos.getObject(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    })
  })
}

function putObject(params) {
  return new Promise((resolve, reject) => {
    cos.putObject(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    })
  })
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