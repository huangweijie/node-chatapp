var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};
		//静态http文件服务
	//404错误
function send404(response) {
	response.writeHead(404,{'Content-Type' : 'text/plain'});
	response.write('Error 404 : resource not found.');
	response.end();
}
	//文件数据服务
function sendFile(response,filePath,fileContents) {
	response.writeHead(
		200,
		{"content-type" : mime.lookup(path.basename(filePath))}
	);
	response.end(fileContents);
}
	//缓存服务(从缓存中取数据比访问文件系统快)
function serveStatic(response,cache,absPath) {
	if(cache[absPath]) {		//判断是否在缓存中
		sendFile(response,absPath,cache[absPath]);	//返回文件
	}else {
		fs.exists(absPath,function (exists){	//查找文件是否存在
			if(exists) {
				fs.readFile(absPath,function (err,data) {	//读取文件
					if(err) {
						send404(response);
					}else {
						cache[absPath] = data;
						sendFile(response,absPath,data);
					}
				});
			}else {
				send404(response);
			}
		});
	}
}
	//创建和启动http服务器
var server = http.createServer(function (request,response) {
	var filePath = false;
	if(request.url == '/') {
		filePath = 'public/index.html';	//返回默认html文件
	}else {
		filePath = 'public' + request.url;	//将文件路径转化为文件相对路径
	}
	var absPath = './' + filePath;
	serveStatic(response,cache,absPath);	//返回静态文件
});
server.listen(3000,function() {
	console.log("Server listening on port http://127.0.0.1:3000.");
});
	//设置socket.io服务器
var chatServer = require('./lib/chat_server');
chatServer.listen(server);
