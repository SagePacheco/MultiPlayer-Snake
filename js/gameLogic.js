/*jslint node: true */
"use strict";

// Global Variables
var grid = [],
	$playerOneScore = $('#playerOneScore'),
	$playerTwoScore = $('#playerTwoScore'),
	$notificationMessage = $('#notification_message'),
	playType = "single",
	cubeCount = 775,
	gameSpeed = 80, //80
	host = false,
	lookingForGame = false,
	firstRun = true,
	myPlayerName,
	potentialHostName,
	potentialChannel,
	opponentName,
	opponentChannel,
	mySnake,
	yourSnake,
	gameClock,
	keyListener,
	food,
	pubnub;

// Listen for game configuration changes
$('.playType').click(function(){
	$('.playType').removeClass("active");
	$(this).addClass("active");
	playType = $(this).data("game");
});

// Game Timeline
var $titleScreen = $('#title_screen'),
	$title = $('#title'),
	$subtitle = $('#subtitle'),
	$playButton = $('#playButton'),
	$playType = $('.playType'),
	$playerName = $('#playerName'),
	$finishScreen = $('#final_score'),
	$winnerTitle = $('#winner'),
	$winnerSubTitle = $('#gameSummary'),
	$finishButton = $('#finishButton'),
	tl = new TimelineMax();
tl.add( TweenLite.to($titleScreen, 0.5, {opacity:1, display:'flex'}, "intro") );
tl.add( TweenLite.to($title, 0.25, {opacity:1}, "intro") );
tl.add( TweenLite.to($subtitle, 0.25, {opacity:1}, "intro") );
tl.add( TweenLite.to($playButton, 0.25, {opacity:1}, "intro") );
tl.add( TweenLite.to($playType, 0.25, {opacity:1}, "intro") );
tl.add( TweenLite.to($playerName, 0.25, {opacity:1}, "intro") );
tl.addPause("intro");
tl.add( TweenLite.to($titleScreen, 0.5, {opacity:0, display:'none'}, "game start") );
tl.addPause("game start");
tl.add( TweenLite.to($finishScreen, 0.5, {opacity:1, display:'flex'}, "game finish") );
tl.add( TweenLite.to($winnerTitle, 0.25, {opacity:1}, "game finish") );
tl.add( TweenLite.to($winnerSubTitle, 0.25, {opacity:1}, "game finish") );
tl.add( TweenLite.to($finishButton, 0.25, {opacity:1}, "game finish") );
tl.addPause("game finish");

// Main Function that generates grid
function gridConstructor(){
	for (var i = 1; i <= cubeCount; i++){
		$('#grid').append("<div id ='" + i + "'></div>");
		grid[i] = new Cube(i);
	}
}

function notification(message){
	$notificationMessage
	.text(message)
	.css("opacity", "1");
}

function clearNotification(){
	$notificationMessage
	.css("opacity", "0");
}

function startGame(){
	myPlayerName = $('#playerName').val();
	myPlayerName = myPlayerName === "" ? "Player 1" : myPlayerName;
	switch(playType){
		case "single":
			host = true;
			tl.play();
			mySnake = new Snake(myPlayerName, "blue", [250, 251, 252], $playerOneScore);
			snakeFood();
			$playerOneScore.css("left", "50%").css("display", "block");
			keyListener = window.addEventListener('keydown', function(){keyTracker(event, mySnake);});
			gameClock = window.setInterval(function(){
				mySnake.commitDirection();
				mySnake.move();
			}, gameSpeed);
			break;
		case "localMultiplayer":
			notification("Player 1: Directional Pad | Player 2: WASD");
			host = true;
			tl.play();
			setTimeout(function(){
				clearNotification();
			},5000);
			mySnake = new Snake(myPlayerName, "blue", [250, 251, 252], $playerOneScore);
			yourSnake = new Snake("Player 2", "red", [436, 437, 438], $playerTwoScore);
			snakeFood();
			$playerOneScore.css("display", "block");
			$playerTwoScore.css("display", "block");
			keyListener = window.addEventListener('keydown', function(){keyTracker(event, mySnake, yourSnake);});
			gameClock = window.setInterval(function(){
				mySnake.commitDirection();
				yourSnake.commitDirection();
				mySnake.move();
				yourSnake.move();
			}, gameSpeed);
			break;
		case "onlinePlay":
			beginMatchMaking();
			break;
	}
}

function startOnlineGame(){

	if(host){
		mySnake = new Snake(myPlayerName, "blue", [250, 251, 252], $playerOneScore);
		yourSnake = new Snake(opponentName, "red", [436, 437, 438], $playerTwoScore);
		snakeFood();
		keyListener = window.addEventListener('keydown', function(){keyTracker(event, mySnake);});
	} else {
		yourSnake = new Snake(opponentName, "red", [250, 251, 252], $playerTwoScore);
		mySnake = new Snake(myPlayerName, "blue", [436, 437, 438], $playerOneScore);
		keyListener = window.addEventListener('keydown', function(){keyTracker(event, yourSnake);});
	}

	tl.play();

	gameClock = window.setInterval(function(){
		mySnake.commitDirection();
		yourSnake.commitDirection();
	    mySnake.move();
		yourSnake.move();
	}, gameSpeed);

	$playerOneScore.css("display", "block");
	$playerTwoScore.css("display", "block");
}

function updateOpponent(){
	var publishConfig = {
		channel : opponentChannel,
		message : {
			action: "move",
			opponentDirection: mySnake.intendedDirection,
			opponentSnakeArray: mySnake.trailArray,
			opponentColor: mySnake.color,
			opponentScore: mySnake.score
		}
	};
	pubnub.publish(publishConfig);
}

function resetGame(){

	if(playType === "onlinePlay"){
		pubnub.unsubscribeAll();
	}

	// Resetting Global Variables
	pubnub = undefined,
	host = false,
	lookingForGame = false,
	firstRun = true,
	myPlayerName = undefined,
	potentialHostName = undefined,
	potentialChannel = undefined,
	opponentName = undefined,
	opponentChannel = undefined,
	mySnake = undefined,
	yourSnake = undefined,
	gameClock = undefined,
	keyListener = undefined,
	food = undefined;

	grid.map(function(obj){
		obj.occupied = false;
		obj.reverseIt();
	});
	$playerOneScore.text(0).css("left", "45%").css("display", "none");
	$playerTwoScore.text(0).css("display", "none");
}

function declareWinner(losingSnake){
	var winningSnake;
	var subtitle;
	if(playType === "single"){
		winningSnake = mySnake;
		subtitle = "You scored " + winningSnake.score + " points!";
	} else {
		if(mySnake === losingSnake){
			winningSnake = yourSnake;
		} else {
			winningSnake = mySnake;
		}
		subtitle = "Wins! With " + winningSnake.score + " points.";
	}
	console.log("winning snake", winningSnake);
	$('#winner').text(winningSnake.name);
	$('#gameSummary').text(subtitle);
	tl.play();
}

function Cube(cubeNumber){
	this.cubeID = cubeNumber;
	this.color = '#000';
	this.occupied = false;
	this.element = $('#grid #' + cubeNumber);
	
	// Function that animates the cube
	this.animateIt = function (color){
		this.element.css("background-color", color);
		this.occupied = true;
		this.color = color;
	};

	// Reverses animation of a particular animation object.
	this.reverseIt = function (){
		this.element.removeAttr( 'style' );
		this.occupied = false;
	};
}

function keyTracker(event){
	var keyPressed = event.keyCode;
	// console.log("keyCode: " + keyPressed);
	switch(keyPressed){

		// Cool Snake Moves
		case 37:
				// console.log("Detected Left");
				if(mySnake.actualDirection === "Right"){console.log("Snake Bounce blocked");}
				else{
					mySnake.intendedDirection = "Left";
					if(playType === "onlinePlay"){updateOpponent();}
				}
			break;
		case 38:
				// console.log("Detected Up");
				if(mySnake.actualDirection === "Down"){console.log("Snake Bounce blocked");}
				else{
					mySnake.intendedDirection = "Up";
					if(playType === "onlinePlay"){updateOpponent();}
				}
			break;	
		case 39:
				// console.log("Detected Right");
				if(mySnake.actualDirection === "Left"){console.log("Snake Bounce blocked");}
				else{
					mySnake.intendedDirection = "Right";
					if(playType === "onlinePlay"){updateOpponent();}
				}
			break;
		case 40:
				// console.log("Detected Down");
				if(mySnake.actualDirection === "Up"){console.log("Snake Bounce blocked");}
				else{
					mySnake.intendedDirection = "Down";
					if(playType === "onlinePlay"){updateOpponent();}
				}
			break;
	}

	if(playType === "localMultiplayer"){
		switch(keyPressed){
			case 65:
					// console.log("Detected Left");
					if(yourSnake.actualDirection === "Right"){console.log("Snake Bounce blocked");}
					else{
					yourSnake.intendedDirection = "Left";
					}
				break;
			case 87:
					// console.log("Detected Up");
					if(yourSnake.actualDirection === "Down"){console.log("Snake Bounce blocked");}
					else{
					yourSnake.intendedDirection = "Up";
					}
				break;	
			case 68:
					// console.log("Detected Right");
					if(yourSnake.actualDirection === "Left"){console.log("Snake Bounce blocked");}
					else{
					yourSnake.intendedDirection = "Right";
					}
				break;
			case 83:
					// console.log("Detected Down");
					if(yourSnake.actualDirection === "Up"){console.log("Snake Bounce blocked");}
					else{
					yourSnake.intendedDirection = "Down";
					}
				break;		
		}
	}
}

function randomColor(){
	var color = '#'+Math.floor(Math.random()*16777215).toString(16);
	if (color.length === 7){
		return color;
	} else {
		while (color.length < 7){
			color += "0";
		}
		return color;
	}
}

function snakeFood(position, color){
	if(host){
		food = Math.floor(Math.random() * cubeCount);
		
		// Prevents new food unit from occupying snake
		while (isCollision("", food)){
			console.log("Collision Loop Initiated");
			console.log("Changing Food");
			food = Math.floor(Math.random() * cubeCount);
		}

		var currentColor = randomColor();
		grid[food].animateIt(currentColor);
		grid[food].occupied = false;
		if(playType === "onlinePlay"){

			var publishConfig = {
				channel : opponentChannel,
				message : {
					action: "food",
					hostFoodPosition: food,
					hostFoodColor: currentColor
				}
			};
			pubnub.publish(publishConfig, function() {
				// console.log("New Food Published");
			});
		}
	} else {
		food = position;
		// console.log("Food is at position: " + food);
		grid[food].animateIt(color);
		grid[food].occupied = false;
	}
}

function Snake(name, color, trailArray, scoreBoard){
	this.name = name,
	this.score = 0,
	this.color = color,
	this.trailArray = trailArray,
	this.position = trailArray[0],
	this.intendedDirection = 'Right',
	this.actualDirection = 'Right',
	this.scoreBoard = scoreBoard,
	this.commitDirection = function(){
		this.actualDirection = this.intendedDirection;
	}
	this.move = function (){
		switch(this.actualDirection){
			case "Left":
				if ((this.position - 1) % 31 !== 0){
					this.position -= 1;
					// console.log("Moving Snake Left");
				} else {
					this.position += 30;
				}
				break;
			case "Right":
				if (this.position % 31 !== 0){
					this.position += 1;
					// console.log("Moving Snake Right");
				} else {
					this.position -= 30;
				}
				break;
			case "Up":
				if (this.position > 31){
					this.position += -31;
					// console.log("Moving Snake Up");
				} else {
					this.position += 744;
				}
				break;	
			case "Down":
				if (this.position < (cubeCount - 30)){
					this.position += 31;
					// console.log("Moving Snake Down");
				} else {
					this.position += -744;
				}
				break;	
		}
		// Checks for collision. Ends game if true. Occupies position if false.
		if (!isCollision(this.name, this.position)){
			this.trail();
		} else {
			console.log("Game is over");
			console.log("Losing Snake", this);
			clearInterval(gameClock);
			this.loserFlash();
		}
	};
	this.trail = function (){
		// console.log("Trail at call " + this.trailArray);
		// If food is attained. Skip Array Purge. This allows snake to grow.
		// console.log("food = " + food + " and position = " + this.position);
		this.trailArray.unshift(this.position);
		if (this.position === food){
			// Food gathered. Skipping pop.
			this.score++;
			this.color = grid[food].color;
			this.scoreBoard.text(this.score);
			if(host){snakeFood();}
		} else {
			grid[this.position].animateIt(this.color);
			var popped = this.trailArray.pop();
			if (popped >= 0){
				grid[popped].reverseIt();
			}
		}
	};
	this.lagCorrect = function(snakeArray, color, score){

		if(this.score !== score){
			this.updateScore(score);
		}

		if(this.color !== color && this.color !== "blue" && this.color !== "red"){
			this.color = color;
		}

		if(this.trailArray[0] !== snakeArray[0]){
			// Wipe Old Snake
			this.trailArray.map(function(index){
				grid[index].reverseIt();
			});

			this.trailArray = snakeArray;
			this.position = snakeArray[0];

			// Render New Snake
			this.trailArray.map(function(index){
				grid[index].animateIt(this.color);
			}, this);
		}
	};
	this.updateScore = function (newScore){
		this.score = newScore;
		this.scoreBoard.text(this.score);
	};
	this.loserFlash = function (){
		var self = this;

		var flashClock = window.setInterval(function(){
			self.trailArray.map(function(position){
				var flashColor = grid[position].color === "white" ? self.color : "white";
				grid[position].animateIt(flashColor);
			}, self);		
		}, 100);

		setTimeout(function(){
			clearInterval(flashClock);
			declareWinner(self);
			resetGame();
		}, 1000);
	};
}

function isCollision(name, position){
	if (position == food){
		// console.log("Food Gathered");
		return false;
	}
	else if (grid[position].occupied === true){
		console.log(name + " has collided");
		console.log("collision at: " + position);
		return true;
	} else {
		return false;
	}
}

function beginMatchMaking(){

	var newUUID = PubNub.generateUUID();
	pubnub = new PubNub({
		uuid: newUUID,
	    publishKey : 'pub-c-fe32255a-2d44-4996-84db-c7a1e52e7dfc',
	    subscribeKey : 'sub-c-2a5abf52-e339-11e6-8d2d-02ee2ddab7fe',
	    presenceTimeout: 5
	});

	pubnub.addListener({
	    status: function(statusEvent){
	        if (statusEvent.category === "PNConnectedCategory") {
	        	if (firstRun){
	        		initializeMatch();
	        	} else if (host){
					confirmMatch();
				}
	        } else if (statusEvent.category === "PNNNetworkUpCategory"){
	        	notification("Reconnected to Internet");
	        	setTimeout(function(){
	        		clearNotification();
	        	}, 200);
	        } else if (statusEvent.category === "PNNetworkDownCategory"){
	        	notification("Internet Connection Lost");
	        } else if (statusEvent.category === "PNNetworkIssuesCategory"){
	        	notification("Unexpected MultiPlayer Connection Loss");
	        } else if (statusEvent.category === "PNReconnectedCategory"){
	        	notification("Reconnected to Online MultiPlayer Services");
	        	setTimeout(function(){
	        		clearNotification();
	        	}, 200);
	        }
	    },
	    message: function(response){
	    	networkMessageHandler(response);
	    },
	    presence: function(presenceEvent){
	        if(presenceEvent.action === "timeout" && presenceEvent.uuid !== pubnub.getUUID()){
	        	notification("Lost Connection to Opponent. They Have Timed Out.");
	        }
	    }
	});

	// Join Main Lobby and MatchMaking
	pubnub.subscribe({
	    channels: ["snake_lobby", "match_making"],
	    withPresence: true
	});
}

function initializeMatch(){
	firstRun = false;
	var newState = {
	    name: myPlayerName,
	};
	pubnub.setState({ 
	    state: newState,
	    channels: ["snake_lobby"]
	},
	function(){

		pubnub.hereNow({
		    channels: ["snake_lobby"],
		    includeState: true,
		    includeUUIDs: true
		},
		function(status, response){
			console.log("Lobby Status:");
		    console.log(response);
		    var snakeLobby = response.channels.snake_lobby;
			// If lobby is empty add self to lobby

			if(snakeLobby.occupancy === 0 || (snakeLobby.occupancy = 1 && snakeLobby.occupants[0].uuid === pubnub.getUUID())){
				notification("Waiting for an opponent");
				console.log("No occupants. Switching to host");
				host = true;
				lookingForGame = true;
				
			} else {
				// Potential game found
				var potentialHostID;
				var potentialHostName;
				for(var i = 0; i < snakeLobby.occupants.length; i++){
					if (snakeLobby.occupants[i].uuid !== pubnub.getUUID()){
						var currentOccupant = snakeLobby.occupants[i];
						potentialHostID = currentOccupant.uuid;
						potentialHostName = currentOccupant.state.name;
						opponentName = currentOccupant.state.name;
						notification("Possible Opponent Found: " + potentialHostName);
						console.log("Possible Host Found: " + potentialHostName);
						break;
					}
				}

				console.log("Attempting HandShake");
				host = false;
				var potentialChannel = Math.floor((Math.random() * 100) + 1);
				opponentChannel = potentialChannel;
				var publishConfig = {
					channel : "match_making",
					message : {
						potentialHostID: potentialHostID,
						potentialHostName: potentialHostName,
						potentialChannel: potentialChannel,
						guestName: myPlayerName
					}
				};
				pubnub.publish(publishConfig, function() {
					console.log("Publishing Potential Match");
					pubnub.unsubscribeAll();
					pubnub.subscribe({
					    channels: [potentialChannel],
					    withPresence: true
					});
				});
			}
		});
	});
}

function confirmMatch(){
	var publishConfig = {
		channel : opponentChannel,
		message : {
			action: "hello"
		}
	};
	pubnub.publish(publishConfig, function() {
		console.log("Match Confirmed");
	});
}

function networkMessageHandler(response){
	switch(response.channel){
		case 'match_making':
			if(lookingForGame && response.message.potentialHostID === pubnub.getUUID()){
				console.log("Opponent Message recieved");
				opponentName = response.message.guestName;
				notification("Found Opponent: " + opponentName);
				opponentChannel = response.message.potentialChannel;
				pubnub.unsubscribeAll();
				pubnub.subscribe({
				    channels: [opponentChannel],
				    withPresence: true
				});

			} else if(!lookingForGame && response.message.potentialHostID === pubnub.getUUID()){
				console.log("I am being addressed, but I am not looking for a game");
			} else {
				console.log("MatchMaking message does not apply to me");
			}

			break;

		case 'snake_lobby':
			// Do something with lobby
			break;

		default:
			// console.log("Message from private channel");
			if (response.message.action === "hello"){
    			if(host){
    				console.log("I'm the host and the Game is Established");
    			} else {
					console.log("I'm the guest and the Game is Established");
					opponentChannel = response.channel;
    			}
    			notification("Starting Match with " + opponentName);
    			setTimeout(function(){
    				clearNotification();
					startOnlineGame();
    			}, 1000);

    		} else if(response.message.action === "food" && response.publisher !== pubnub.getUUID()){
    			// console.log("Recieved New Food");
    			var hostFoodPosition = response.message.hostFoodPosition;
    			var hostFoodColor = response.message.hostFoodColor;
    			snakeFood(hostFoodPosition, hostFoodColor);

    		} else if(response.message.action === "move" && response.publisher !== pubnub.getUUID()){
    			var message = response.message;
				yourSnake.intendedDirection = message.opponentDirection;
				yourSnake.lagCorrect(message.opponentSnakeArray, message.opponentColor, message.opponentScore);
    		}
			break;
	}
}