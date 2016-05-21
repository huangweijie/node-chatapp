var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};
	//启动socket.io服务器
exports.listen = function(server) {
	io = socketio.listen(server);	//启动socketio服务器，允许搭载在已有http服务器上
	io.set('log level',1);
	io.sockets.on('connection',function (socket) {	//定义每个用户连接的处理逻辑
		guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);	//赋访客名
		joinRoom(socket,'Lobby');	//放入聊天室Lobby
			//处理用户消息，更名，聊天室创建和变更
		handleMessageBroadcasting(socket,nickNames);	
		handleNameChangeAttempts(socket,nickNames,namesUsed);	
		handleRoomJoining(socket);
			//用户请求时提供已被占用的聊天室列表
		socket.on('rooms',function() {
			socket.emit('rooms',io.sockets.manager.rooms);
		});
			//用户断开后处理逻辑
		handleClientDisconnection(socket,nickNames,namesUsed);
	});
};
	//分配昵称
function assignGuestName(socket,guestNumber,nickNames,namesUsed) {
	var name = 'Guest' + guestNumber;
	nickNames[socket.id] = name;
	socket.emit('nameResult', {
		success : true,
		name : name
	});
	namesUsed.push(name);
	return guestNumber + 1;	//昵称计数器
}
	//加入聊天室
function joinRoom(socket,room) {
	socket.join(room);	//进入房间
	currentRoom[socket.id] = room;		//记录当前房间
	socket.emit('joinResult', {room : room});
	socket.broadcast.to(room).emit('message', {
		text : nickNames[socket.id] + '  has joined ' + room + '.'
	});
		//汇总房间里用户
	var usersInRoom = io.sockets.clients(room);
	if(usersInRoom.length > 1) {
		var usersInRoomSummary = 'Users currently in ' + room + ': ';
		for(var index in usersInRoom){
			var userSocketId = usersInRoom[index].id;
			if(userSocketId != socket.id) {
				if(index > 0) {
					usersInRoomSummary += ',  ';
				}
			usersInRoomSummary += nickNames[userSocketId];			
			}
		}
		usersInRoomSummary += '.';
		socket.emit('message', {text : usersInRoomSummary});
	}
}
	//更名请求处理逻辑
function handleNameChangeAttempts(socket,nickNames,namesUsed) {
	socket.on('nameAttempt',function (name) {	//添加nameAttempt事件监听器
		if(name.indexOf('Guest') == 0) {
			socket.emit('nameResult', {
				success : false,
				message : 'Names cannot begin with "Guest".'
			});
		}else {
			if(namesUsed.indexOf(name) == -1) {	//名字没被注册
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex]; //删掉之前用的名字
				socket.emit('nameResult', {
					success : true,
					name : name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text : previousName + ' is now known as ' + name + '.'
				});
			}else {	//名字被注册
				socket.emit('nameResult', {
					success : false,
					message : 'That name is already in use.'
				});
			}
		}
	});
}
	//转发消息
function handleMessageBroadcasting(socket) {
	socket.on('message', function (message) {
		socket.broadcast.to(message.room).emit('message', {
			text : nickNames[socket.id] + ': ' + message.text
		});
	});
}
	//创建房间
function handleRoomJoining(socket) {
	socket.on('join', function (room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket,room.newRoom);
	});
}
	//用户断开连接
function handleClientDisconnection(socket) {
	socket.on('disconnect', function() {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}