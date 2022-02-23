/**
 * 腾讯云 COS 静态网页生成脚本
 */
const fs = require("fs");
const pug = require("pug");
const path = require("path");
const COS = require("cos-nodejs-sdk-v5");
const {
  XMLParser
} = require("fast-xml-parser");

const compiledFunction = pug.compileFile('src/temple.pug');

/* 以下是环境变量 */
var cos = new COS({
  SecretId: process.env.SecretId,
  SecretKey: process.env.SecretKey,
});

const TEMP_PATH = 'tecent_cos_generate_html/';
const statusFile = "_temp_tecent_cos_generate_html";
/* 以上是环境变量 */

export default async function handler(req, res) {
  /* 获取参数 */
  let {
    Region = "Region",
    Bucket = "Bucket",
    Ignore = "Ignore"
  } = req.body;
  /* 转数组 */
  Ignore = eval(Ignore);

  /* 读取当前是否有任务在经行 */
  let promiseArr = [];
  let processing = fs.existsSync(statusFile);
  let tree = { //用于储存树
    Key: "",
    child: []
  };

  /* 还有任务正在经行 */
  if (processing) {
    console.log(`Error start function. It is processing`);
    return res.send("Fail");
  }
  /* 没有任务正在经行 */
  else {
    fs.writeFileSync(statusFile, "233");
    console.log(`Start Function`);
    /* 获取 COS 所有文件信息（路径、大小、修改时间） */
    var data = "";
    try {
      const res = await getObject({
        Bucket: Bucket,
        Region: Region,
        Key: '/'
      });
      data = res.Body;
      console.log('Get bucket catalog: ', Bucket);
    } catch (e) {
      console.log(`Error getting bucket catalog. Error message:`, e)
      return res.send("Fail");
    }

    /* 从上步获得的数据中取出变量 */
    try {
      const parser = new XMLParser();
      const contents = parser.parse(data).ListBucketResult.Contents;

      let current = tree;
      for (let index in contents) {
        let content = contents[index];
        let path = content.Key.split('/');
        /* 根目录文件 && 根目录文件夹 */
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
          current = content;
        }
        /* 文件 */
        else {
          if (!Ignore.includes(path[path.length - 1])) {
            current.child.push(content);
          }
          content.relPath = path[path.length - 1];
        }
        let len = content.relPath.length;
        if (len > 76) {
          content.showInfo = content.LastModified.padStart(24, " ") + ("" + content.Size).padStart(25, " ");
        } else {
          content.showInfo = content.LastModified.padStart(100 - len, " ") + ("" + content.Size).padStart(25, " ");
        }
      }
      console.log(`Process Bucket Infomation`);
    } catch (e) {
      console.log(`Error process bucket catalog. Error message:`, e);
      return res.send("Fail");
    }

    /* 排序 */
    sortFile(tree);

    /* 输出 */
    try {
      generateHtml(tree);
      console.log(`Generate Html successfully`);
    } catch (e) {
      console.log(`Error generateHtml. Error message:`, e);
      return res.send("Fail");
    }
    /* 上传 */
    try {
      const files = traversal(TEMP_PATH);
      promiseArr = files.map(file => {
        const params = {
          Bucket: Bucket,
          Region: Region,
          Key: file.substr(TEMP_PATH.length),
          StorageClass: 'STANDARD',
          Body: fs.createReadStream(file), // 上传文件对象
        }
        return putObject(params);
      })
      await Promise.all(promiseArr);
      console.log(`Put files successfully`);
    } catch (e) {
      console.log('Error update files. Error message:', e);
      return res.send("Fail");
    }

    /* 删除暂存文件 */
    try {
      delDir(TEMP_PATH);
      fs.unlinkSync(statusFile);
      console.log(`Delete temp files successfully`);
    } catch (e) {
      console.log('Update file error. Error message:', e);
      return res.send("Fail");
    }



    /* 响应 */
    return res.send("Success");
  }
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

//生成 HTML
function generateHtml(content) {
  /* 递归 */
  if (!fs.existsSync(TEMP_PATH + content.Key)) {
    fs.mkdirSync(TEMP_PATH + content.Key);
  }

  /* 生成 */
  for (let i in content.child) {
    if (IsDir(content.child[i])) {
      generateHtml(content.child[i]);
    }
  }

  fs.writeFileSync(TEMP_PATH + path.dirname(content.Key + '9cats') + '/index.html', compiledFunction(content));
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


function delDir(dir) {
  if (fs.existsSync(dir)) {
    let files = fs.readdirSync(dir);
    for (let v of files) {
      let newpath = dir + "/" + v;
      let stats = fs.statSync(newpath);
      if (stats.isFile()) {
        fs.unlinkSync(newpath);
      } else {
        delDir(newpath);
      }
    }
    fs.rmdirSync(dir);
  }
}


function traversal(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(function (file) {
    file = dir + '/' + file
    const stat = fs.statSync(file)
    if (stat && stat.isDirectory()) {
      results = results.concat(traversal(file))
    } else {
      results.push(file)
    }
  })
  return results
}