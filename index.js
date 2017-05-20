var bodyparser = require('body-parser');
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var port = process.env.PORT || 8080; //runs on heroku or localhost:8080

//listen for port
http.listen(port);

app.use(bodyparser.urlencoded({  //for reading forms
  extended: true
}));
app.use(bodyparser.json());


app.get('/', function(req, res){ //when someone connects initially, send the index
	res.sendFile(__dirname + '/index.html');
});

app.post('/adder', function(req, res){
	if(req.body.pass == "password"){
		res.sendFile(__dirname + '/adder.html');
	}else{
		res.send("incorrect password");
	}
});