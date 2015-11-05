//SCRATCHX EXTENSION FOR CODEPAD V 1.0

(function(ext) {
    // Cleanup function when the extension is unloaded
     var device = null;
    var rawData = null;
	var sliderValue = 100;
	var knobValue = 10;
	var degreeValue = 90;
	var distanceValue = 20;
	var lumValue = 50;
	var buttonValue = 0;
	var count = 0;
	var inputArray = [];
    function processData() {
        var bytes = new Uint8Array(rawData);
		
		if (watchdog) { 
             // Seems to be a valid PicoBoard. 
             clearTimeout(watchdog); 
             watchdog = null; 
         } 
		if(bytes[0] == 255)
		{
		   console.log("valid codepad packet received")
		   sliderValue = bytes[1];
		   knobValue = bytes[2];
		   distanceValue = bytes[3];
		   lumValue = bytes[4];
		   degreeValue = bytes[5];
		   //buttonValue = bytes[5];
		}
		if(bytes[0] == 254)
		{
		   console.log("remote button pressed")
		   buttonValue = bytes[1];
		}
        console.log(bytes);

        //console.log(inputs);
        rawData = null;
    }

    function appendBuffer( buffer1, buffer2 ) {
        var tmp = new Uint8Array( buffer1.byteLength + buffer2.byteLength );
        tmp.set( new Uint8Array( buffer1 ), 0 );
        tmp.set( new Uint8Array( buffer2 ), buffer1.byteLength );
        return tmp.buffer;
    }

    // Extension API interactions
    var potentialDevices = [];
    ext._deviceConnected = function(dev) {
		console.log('New device');
        potentialDevices.push(dev);
		console.log(potentialDevices.length);
        if (!device) {
			console.log('Trying next');
            tryNextDevice();
        }
    }

    var poller = null;
    var watchdog = null;
    function tryNextDevice() {
        // If potentialDevices is empty, device will be undefined.
        // That will get us back here next time a device is connected.
        device = potentialDevices.shift();
        if (!device) {
			console.log('Return 1');
			return;
		}

        device.open({ stopBits: 0, bitRate: 9600, ctsFlowControl: 0 }, deviceOpened);
        
    };
	
	function deviceOpened(dev) {
		if (!dev) {
            console.log('Dev open failed');
            tryNextDevice();
            return;
        }
	
		device.set_receive_handler(function(data) {
            console.log('Received: ' + data.byteLength);
            if(!rawData || rawData.byteLength >= 6) rawData = new Uint8Array(data);
            else rawData = appendBuffer(rawData, data);

            if(rawData.byteLength >=6) {
                //console.log(rawData);
                processData();
                //device.send(pingCmd.buffer);
            }
        });

        // Tell the PicoBoard to send a input data every 50ms
	//CODEPAD - populate ping command with command information for LEDs, colour changes, etc. 
	//Exchange 8 byte packets
	
        var pingCmd = new Uint8Array(5);
        pingCmd[0] = 3;
        poller = setInterval(function() {
            device.send(pingCmd.buffer);
        }, 100);
        watchdog = setTimeout(function() {
            // This device didn't get good data in time, so give up on it. Clean up and then move on.
            // If we get good data then we'll terminate this watchdog.
			console.log('Timeout');
            clearInterval(poller);
            poller = null;
            device.set_receive_handler(null);
            device.close();
            device = null;
            tryNextDevice();
        }, 1000);
	}

    ext._deviceRemoved = function(dev) {
        if(device != dev) return;
        if(poller) poller = clearInterval(poller);
        device = null;
    };

    ext._shutdown = function() {
        if(device) device.close();
        if(poller) poller = clearInterval(poller);
        device = null;
    };

    ext._getStatus = function() {
        if(!device) return {status: 1, msg: 'PicoBoard disconnected'};
        if(watchdog) return {status: 1, msg: 'Probing for PicoBoard'};
        return {status: 2, msg: 'PicoBoard connected'};
    }

    ext.whenslider = function(lessormore, sliderthreshold)
    {

	if(lessormore == '<')
	   return sliderValue < sliderthreshold;
	else
	   return sliderValue > sliderthreshold;

    };
	ext.whenknob = function(lessormore, knobthreshold){
	
	if(lessormore == '<')
	   return knobValue < knobthreshold;
	else
	   return knobValue > knobthreshold;

     	};
	
	ext.whendistance = function(lessormore, distancethreshold){
	if(lessormore == '<')
	   return distanceValue < distancethreshold;
	else
	   return distanceValue > distancethreshold;
     
	};

	ext.whenlight = function(lessormore, lightthreshold){
	if(lessormore == '<')
	   return lumValue < lightthreshold;
	else
	   return lumValue > lightthreshold;
     return true;
	};

	ext.whenbutton = function(buttonnumber){
	   
	   console.log('calling function buttoncheck');
	   console.log(buttonnumber);
	   console.log('button pressed is '+ buttonValue);
	   if(buttonnumber == 'up')
	      buttonnumber = 10;
	      
	   if(buttonnumber == 'down')
	      buttonnumber = 11;
           
           if(buttonnumber == buttonValue)
	   {
	      buttonValue = 99;
	      return true;
	   }
	   else
	      return false;
     	};


//commands
	ext.ledonoff = function(lednumber, operation){
	
	var LEDCmd = new Uint8Array(5);
        LEDCmd[0] = 4;
	LEDCmd[1] = 99;
	
	
	LEDCmd[1] = lednumber * 10;
	
	if(operation == 'ON')
	      LEDCmd[1] = LEDCmd[1]+1;
	   	
	console.log("Sending LED request");
	console.log(LEDCmd);
        device.send(LEDCmd.buffer);
            
     
	};

	ext.ledcolour = function(lednumber, colour){
	
	var LEDColourCmd = new Uint8Array(5);
	LEDColourCmd[0] = 5;
	
	LEDColourCmd[1] = lednumber;
	if(colour == 'RED')
	{
	   LEDColourCmd[2] = 0xff;
	   LEDColourCmd[3] = 0;
	   LEDColourCmd[4] = 0;
	}
	if(colour == 'GREEN')
	{
	   LEDColourCmd[2] = 0;
	   LEDColourCmd[3] = 0xff;
	   LEDColourCmd[4] = 0;
	}
	if(colour == 'BLUE')
	{
	   LEDColourCmd[2] = 0;
	   LEDColourCmd[3] = 0;
	   LEDColourCmd[4] = 0xff;
	}
	console.log("Sending LED colour request");
	console.log(LEDColourCmd);
        device.send(LEDColourCmd.buffer);
     //return ;
	};

	ext.motordirection = function(direction){

     //return ;
	};

	ext.turnmotor = function(motordegrees){
	
	var TurnMotorCmd = new Uint8Array(5);
	TurnMotorCmd[0] = 6;
	
	TurnMotorCmd[1] = motordegrees;
	
	console.log("Sending turn motor request");
	console.log(TurnMotorCmd);
        device.send(TurnMotorCmd.buffer);
     //return ;
	};

	ext.getsliderval = function(){

     return sliderValue;
	};

	ext.getknobval = function(){

     return knobValue;
	};

	ext.getdistanceval = function(){

     return distanceValue;
	};

	ext.getlightval = function(){

     return lumValue;
	};
/*
	ext.getdegreeval = function(){

     return degreeValue;
	};
*/	
	ext.getbuttonval = function(){

     return buttonValue;
	};

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
['h', 'when slider %m.lessmore %n', 'whenslider' , '>' , 30],
['h', 'when knob %m.lessmore %n', 'whenknob' , '>' , 50],
['h', 'when distance %m.lessmore %n', 'whendistance' , '>' , 10],
['h', 'when light %m.lessmore %n', 'whenlight' , '>', 25],
['h', 'when button %m.butnum is pressed', 'whenbutton' , '1'],
[' ', 'turn LED %m.butnum %m.onoff', 'ledonoff' , '1', 'ON'],
[' ', 'set LED %m.butnum colour to %m.col', 'ledcolour' , '1', 'RED'],
[' ', 'set motor direction to  %m.dir', 'motordirection' , 'clockwise'],
[' ', 'turn motor to  %n degrees', 'turnmotor' , 10],
['r', 'slider', 'getsliderval' ],
['r', 'knob', 'getknobval' ],
['r', 'distance', 'getdistanceval' ],
['r', 'luminosity', 'getlightval' ],
['r', 'button', 'getbuttonval' ] /*,
['r', 'degrees', 'getdegreeval' ] */
        ]  ,

        menus:  {
              lessmore: ['<' , '>'],
		   butnum: ['1','2', '3', '4','5','6','7','8','9','0','up','down'],
			  onoff: ['ON', 'OFF'],
			  col: ['RED', 'BLUE', 'GREEN'],
			  dir: ['clockwise', 'anti-clockwise']
        }
    };

    // Register the extension
    ScratchExtensions.register('CodePad', descriptor, ext,{type:'serial'});
})({});
