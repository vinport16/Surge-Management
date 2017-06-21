var bodyparser = require('body-parser');
var express = require('express');
var sio = require('socket.io');
var YAML = require('yamljs');
var fs = require('fs');
var pg = require('pg');
var nodemailer = require('nodemailer');
var app = express();
var http = require('http').createServer(app);
var io = sio(http);
var port = process.env.PORT || 8080; //runs on heroku or localhost:8080

var pw = "aec2.0";

//listen for port
http.listen(port);

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432';

const client = new pg.Client(connectionString);
client.connect();

pg.connect(connectionString, function(err, client, done) {
  client.query('CREATE TABLE IF NOT EXISTS data(id SERIAL PRIMARY KEY, date VARCHAR(60) not null, box0 INT, box1 INT, box2 INT, box3 INT, box4 INT, box5 INT, box6 INT, box7 INT, box8 INT, total INT, color VARCHAR(10))', function(err, result) {
    done();
  });
});

pg.connect(connectionString, function(err, client, done) {
  client.query('CREATE TABLE IF NOT EXISTS contacts(id SERIAL PRIMARY KEY, email VARCHAR(60) not null, green BOOLEAN, yellow BOOLEAN, red BOOLEAN, black BOOLEAN, remind BOOLEAN)', function(err, result) {
    done();
  });
});

app.use(bodyparser.urlencoded({  //for reading forms
	extended: true
}));
app.use(bodyparser.json());


app.get('/', function(req, res){ //when someone connects initially, send the index
	res.sendFile(__dirname + '/index.html');
});


app.post('/adder', function(req, res){
	if(req.body.pass == pw){  //check password
		res.sendFile(__dirname + '/adder.html');
	}else{
		res.send("incorrect password");
	}
});


app.post('/data', function(req, res){  //construct data table HTML
	if(req.body.pass == pw){  //check password again

		var html = "";

		get_db(function(content){
			fs.readFile("data_top.html", 'utf8', function(err, filetext){
				if (err) throw err;
				html+=filetext;

				html += "<tr>";
				for(var i = content.length-1; i >= 0; i--){
					html += "<th class='rotate'><div style='color:"+content[i].color+"'><span>"+content[i].date+"</span></div></th>";
				}
				html += "</tr><tr>";

				for(var i = content.length-1; i >= 0; i--){
					html += "<td>"+content[i].box0+"</td>";
				}
				html += "</tr><tr>";

				for(var i = content.length-1; i >= 0; i--){
					html += "<td>"+content[i].box1+"</td>";
				}
				html += "</tr><tr>";
				
				for(var i = content.length-1; i >= 0; i--){
					html += "<td>"+content[i].box2+"</td>";
				}
				html += "</tr><tr>";
				
				for(var i = content.length-1; i >= 0; i--){
					html += "<td>"+content[i].box3+"</td>";
				}
				html += "</tr><tr>";
				
				for(var i = content.length-1; i >= 0; i--){
					html += "<td>"+content[i].box4+"</td>";
				}
				html += "</tr><tr>";
				
				for(var i = content.length-1; i >= 0; i--){
					html += "<td>"+content[i].box5+"</td>";
				}
				html += "</tr><tr>";
				
				for(var i = content.length-1; i >= 0; i--){
					html += "<td>"+content[i].box6+"</td>";
				}
				html += "</tr><tr>";
				
				for(var i = content.length-1; i >= 0; i--){
					html += "<td>"+content[i].box7+"</td>";
				}
				html += "</tr><tr>";
				
				for(var i = content.length-1; i >= 0; i--){
					html += "<td>"+content[i].box8+"</td>";
				}
				html += "</tr><tr>";

				for(var i = content.length-1; i >= 0; i--){
					html += "<td>"+content[i].total+"</td>";
				}
				html += "</tr><tr>";
				
				



				fs.readFile("data_bottom.html", 'utf8', function(err, filetext){
					if (err) throw err;
					html+=filetext;
					res.send(html);
				});

			});
		});

	}else{
		res.send("incorrect password");
	}
});

io.on("connection", function(socket){ //Save data entry to db

	socket.on("saveLog", function(data){

		if(data.code  == null){
			console.log("can't log null code data");
		}else{
			add_to_db(data);
			get_contacts(function(contacts){
				var level = data.code.color;
				for(var i = 0; i < contacts.length; i++){
					var send = false;
					if(contacts[i].green && "green" === level ){
						send = true;
					}else if(contacts[i].yellow && "yellow" === level ){
						send = true;
					}else if(contacts[i].red && "red" === level ){
						send = 1==1; // <-- see what I did there
					}else if(contacts[i].black && "black" === level ){
						send = true;
					}
					if(send){
						var body = "score "+data.code.total+"\n";
							body += "IPD "+data.box0+"\n";
							body += "arr/3hrs "+data.box1+"\n";
							body += "arr by 1P "+data.box2+"\n";
							body += "admits w/o beds "+data.box3+"\n";
							body += "ICU# "+data.box4+"\n";
							body += "waiting "+data.box5+"\n";
							body += "wait "+data.box6+"hrs\n";
							body += "ESI2 in WR "+data.box7+"\n";
							body += "ED CC # "+data.box8;

						send_alert(contacts[i].email, level, body);
					}
				}
			});
		}

	});

	socket.on("delete", function(){
		delete_last_entry();
	});

	socket.on("census",function(){
		get_db(function(content){
			if(content[0] != undefined){
				if(Date().substring(0,10) === content[content.length-1].date.substring(0,10)){
					socket.emit("census",{census:content[content.length-1].box0, arrivals:content[content.length-1].box2});
				}
			}
		});

	});

	socket.on("times",function(){
		get_db(function(content){
			if(content[0] != undefined){
				
				socket.emit("times",{score:content[content.length-1].color, scoretime:content[content.length-1].date});
			}
		});
	})

	socket.on("email_report", function(email, report){
		let transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: 'surge.management.robot@gmail.com',
				pass: 'robotmanagementsurge'
			}
		});

  			// setup email data with unicode symbols
  		let mailOptions = {
    	from: '"Surge Management Robot" <surge.management.robot@gmail.com>', // sender address
    	to: email, // list of receivers
    	subject: 'Surge Management Report', // Subject line
    	//text: level+' alert\n'+body // plain text body
    	html: '<b>'+report+'</b>' // html body
	};

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
  	if (error) {
  		return console.log(error);
  	}
  	console.log('Message to %s sent: %s', addr, info.response);
  });
});

	socket.on("contact_req", function(req, res){
		get_contacts(function(dat){
			socket.emit("contact_info", dat);
		});
	});

	socket.on("contact_update", function(contacts){
		rewrite_contacts(contacts);
	});

	app.post('/contacts', function(req, res){ 
		if(req.body.pass == pw){  //check password again
			res.sendFile(__dirname + '/contact_prefs.html');
		}
	});

	app.post('/download', function(req, res){  // download .csv file of data
		if(req.body.pass == pw){  //check password again
			var name = "generated.csv";

			var text =
			"date, "+
			"AM hospital census, "+
			"arrivals in three hours, "+
			"pt arrivals by 1pm, "+
			"admissions without assigned beds, "+
			"ICU beds (not including CTIC or ICCU*), "+
			"people waiting (ambulance & public), "+
			"longest wait (hours) (ambulance or public), "+
			"ESI 2 not bedded*, "+
			"critical care patients*, "+
			"total score, "+
			"color,\n";

			get_db(function(content){

				for(var i = content.length-1; i >= 0; i--){
					text += content[i].date+", "+
					content[i].box0+", "+
					content[i].box1+", "+
					content[i].box2+", "+
					content[i].box3+", "+
					content[i].box4+", "+
					content[i].box5+", "+
					content[i].box6+", "+
					content[i].box7+", "+
					content[i].box8+", "+
					content[i].total+", "+
					content[i].color+", \n";
				}

				fs.writeFile ("generated.csv", text, function(err) { //write data back into file
					if (err) throw err;
					var file = __dirname + '/generated.csv';
					res.download(file);			// here's where the download happens
				});
			});

			
		}
		
	});

});

add_to_db = function(data){
  pg.connect(connectionString, function(err, client, done) {
  	check = true;
  	check = check && data.box0 != '';
  	check = check && data.box1 != '';
  	check = check && data.box2 != '';
  	check = check && data.box3 != '';
  	check = check && data.box4 != '';
  	check = check && data.box5 != '';
  	check = check && data.box6 != '';
  	check = check && data.box7 != '';
  	check = check && data.box8 != '';

  	if(check){
  		client.query("INSERT INTO data (date, box0, box1, box2, box3, box4, box5, box6, box7, box8, total, color) VALUES ('"+data.date+"', "+
    	data.box0+", "+
    	data.box1+", "+
    	data.box2+", "+
    	data.box3+", "+
    	data.box4+", "+
    	data.box5+", "+
    	data.box6+", "+
    	data.box7+", "+
    	data.box8+", "+
    	data.code.total+", '"+
    	data.code.color+"')"   , function(err, result) {
      	done();
      	if (err)
       		{ console.log("Error " + err); }
    	});
  	}else{
  		console.log("some data is undefined, cannot store in db");
  	}
  	
    
  });
}

function get_db(callback){
	pg.connect(connectionString, function(err, client, done) {
    client.query('SELECT * FROM data', function(err, result) {
      done();
      if (err)
       { console.log("Error " + err); }
      else{
      	callback(result.rows);
      }
    });
  });
}

delete_last_entry = function(){
	pg.connect(connectionString, function(err, client, done){
		client.query("DELETE FROM data WHERE id=(SELECT MAX(id) FROM data)", function(err, result){
			done();
			if (err) console.log("Error: " + err);
		});
	});
}

function get_contacts(callback){
	pg.connect(connectionString, function(err, client, done) {
    	client.query('SELECT * FROM contacts', function(err, result) {
      		done();
      		if (err)
       			{ console.log("Error " + err); }
      		else{
      			callback(result.rows);
      		}
   		});
  	});
}

rewrite_contacts = function(data){
  pg.connect(connectionString, function(err, client, done) {
  	client.query("DELETE FROM contacts;", function(err, result){
  		if(err){
  			console.log(err);
  		}else{
  			data = JSON.parse(data);
  			for(var i = 0; i < data.length; i++){
  				client.query("INSERT INTO contacts (email, green, yellow, red, black, remind) VALUES ('"+data[i].email+"', "+
    				data[i].green+", "+
    				data[i].yellow+", "+
    				data[i].red+", "+
    				data[i].black+", "+
    				data[i].remind+");", function(err, result) {
     			 	done();
     			 if (err)
     			  	{ console.log("Error " + err); }
			    });
  			}
  		}
  	});

  	
    
  });
}

send_alert = function(addr, level, body){
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'surge.management.robot@gmail.com',
      pass: 'robotmanagementsurge'
    }
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"Surge Management Robot" <surge.management.robot@gmail.com>', // sender address
    to: addr, // list of receivers
    subject: '', // Subject line
    text: level+' alert\n'+body // plain text body
    //html: '<b>Registration for Political Dialogue confirmed.</b>' // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log('Message to %s sent: %s', addr, info.response);
  });
};
