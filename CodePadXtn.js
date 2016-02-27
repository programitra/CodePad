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
	var LED1ColourCmd = new Uint8Array(3);
    var LED2ColourCmd = new Uint8Array(3);	
    var LED3ColourCmd = new Uint8Array(3);
    var LED4ColourCmd = new Uint8Array(3);	
	var LED5ColourCmd = new Uint8Array(3);
    var LED6ColourCmd = new Uint8Array(3);	
    var LED7ColourCmd = new Uint8Array(3);
    var LED8ColourCmd = new Uint8Array(3);	
	
	 LED1ColourCmd[2] = 0xff;
     LED2ColourCmd[2] = 0xff;	
     LED3ColourCmd[2] = 0xff;
     LED4ColourCmd[2] = 0xff;
	 LED5ColourCmd[2] = 0xff;
     LED6ColourCmd[2] = 0xff;
     LED7ColourCmd[2] = 0xff;
     LED8ColourCmd[2] = 0xff;

	
    function processData() {
        var bytes = new Uint8Array(rawData);
		
		if (watchdog) { 
             // Seems to be a valid CodePad. 
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
            console.log('Device open failed');
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

        // Tell the CodePad to send a input data every 100 ms
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
        if(!device) return {status: 1, msg: 'CodePad disconnected'};
        if(watchdog) return {status: 1, msg: 'Probing for CodePad'};
        return {status: 2, msg: 'CodePad connected'};
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
	var count = 1;
	var LEDCmd = new Uint8Array(5);
        LEDCmd[0] = 4;
	LEDCmd[1] = 99;
	
	if(lednumber == 'all')
	{
		count = 9;
		lednumber = 1;
	}
    do
    {	
		LEDCmd[1] = lednumber * 10;
				
		if(operation == 'ON')
			  LEDCmd[1] = LEDCmd[1]+1;
			
		if (lednumber == 1)
		{
			LEDCmd[2] = LED1ColourCmd[0];
			LEDCmd[3] = LED1ColourCmd[1];
			LEDCmd[4] = LED1ColourCmd[2];
		
		}
		if (lednumber == 2)
		{
			LEDCmd[2] = LED2ColourCmd[0];
			LEDCmd[3] = LED2ColourCmd[1];
			LEDCmd[4] = LED2ColourCmd[2];
		}
		if (lednumber == 3 )
		{
			LEDCmd[2] = LED3ColourCmd[0];
			LEDCmd[3] = LED3ColourCmd[1];
			LEDCmd[4] = LED3ColourCmd[2];
		}
		if (lednumber == 4 )
		{
			LEDCmd[2] = LED4ColourCmd[0];
			LEDCmd[3] = LED4ColourCmd[1];
			LEDCmd[4] = LED4ColourCmd[2];
		}
		if (lednumber == 5 )
		{
			LEDCmd[2] = LED5ColourCmd[0];
			LEDCmd[3] = LED5ColourCmd[1];
			LEDCmd[4] = LED5ColourCmd[2];
		}
		if (lednumber == 6 )
		{
			LEDCmd[2] = LED6ColourCmd[0];
			LEDCmd[3] = LED6ColourCmd[1];
			LEDCmd[4] = LED6ColourCmd[2];
		}
		if (lednumber == 7 )
		{
			LEDCmd[2] = LED7ColourCmd[0];
			LEDCmd[3] = LED7ColourCmd[1];
			LEDCmd[4] = LED7ColourCmd[2];
		}
		if (lednumber ==  8 )
		{
			LEDCmd[2] = LED8ColourCmd[0];
			LEDCmd[3] = LED8ColourCmd[1];
			LEDCmd[4] = LED8ColourCmd[2];
		}
		console.log("Sending LED request");
		console.log(LEDCmd);
		device.send(LEDCmd.buffer);
		count--;
        lednumber++;
	} while(count > 1);
    };
	
	ext.ledcolour = function(lednumber, colour){
	
	var count = 1;
	//LEDColourCmd[0] = 5;
	
	//LEDColourCmd[1] = lednumber;
	if(lednumber == 'all')
	{
		count = 9;
		lednumber = 1;
	}
	do
	{
		if (lednumber == 1 )
		{
			if(colour == 'RED')
			{
			   LED1ColourCmd[0] = 0xff;
			   LED1ColourCmd[1] = 0;
			   LED1ColourCmd[2] = 0;
			}
			if(colour == 'GREEN')
			{
			   LED1ColourCmd[0] = 0;
			   LED1ColourCmd[1] = 0xff;
			   LED1ColourCmd[2] = 0;
			}
			if(colour == 'BLUE')
			{
			   LED1ColourCmd[0] = 0;
			   LED1ColourCmd[1] = 0;
			   LED1ColourCmd[2] = 0xff;
			}
			console.log(LED1ColourCmd);
		}
		if (lednumber == 2 )
		{
			if(colour == 'RED')
			{
			   LED2ColourCmd[0] = 0xff;
			   LED2ColourCmd[1] = 0;
			   LED2ColourCmd[2] = 0;
			}
			if(colour == 'GREEN')
			{
			   LED2ColourCmd[0] = 0;
			   LED2ColourCmd[1] = 0xff;
			   LED2ColourCmd[2] = 0;
			}
			if(colour == 'BLUE')
			{
			   LED2ColourCmd[0] = 0;
			   LED2ColourCmd[1] = 0;
			   LED2ColourCmd[2] = 0xff;
			}
			console.log(LED2ColourCmd);
		}
		if (lednumber == 3 )
		{
			if(colour == 'RED')
			{
			   LED3ColourCmd[0] = 0xff;
			   LED3ColourCmd[1] = 0;
			   LED3ColourCmd[2] = 0;
			}
			if(colour == 'GREEN')
			{
			   LED3ColourCmd[0] = 0;
			   LED3ColourCmd[1] = 0xff;
			   LED3ColourCmd[2] = 0;
			}
			if(colour == 'BLUE')
			{
			   LED3ColourCmd[0] = 0;
			   LED3ColourCmd[1] = 0;
			   LED3ColourCmd[2] = 0xff;
			}
			console.log(LED3ColourCmd);
		}
		if (lednumber == 4 )
		{
			if(colour == 'RED')
			{
			   LED4ColourCmd[0] = 0xff;
			   LED4ColourCmd[1] = 0;
			   LED4ColourCmd[2] = 0;
			}
			if(colour == 'GREEN')
			{
			   LED4ColourCmd[0] = 0;
			   LED4ColourCmd[1] = 0xff;
			   LED4ColourCmd[2] = 0;
			}
			if(colour == 'BLUE')
			{
			   LED4ColourCmd[0] = 0;
			   LED4ColourCmd[1] = 0;
			   LED4ColourCmd[2] = 0xff;
			}
			console.log(LED4ColourCmd);
		}
		if (lednumber == 5 )
		{
			if(colour == 'RED')
			{
			   LED5ColourCmd[0] = 0xff;
			   LED5ColourCmd[1] = 0;
			   LED5ColourCmd[2] = 0;
			}
			if(colour == 'GREEN')
			{
			   LED5ColourCmd[0] = 0;
			   LED5ColourCmd[1] = 0xff;
			   LED5ColourCmd[2] = 0;
			}
			if(colour == 'BLUE')
			{
			   LED5ColourCmd[0] = 0;
			   LED5ColourCmd[1] = 0;
			   LED5ColourCmd[2] = 0xff;
			}
			console.log(LED5ColourCmd);
		}
		if (lednumber == 6 )
		{
			if(colour == 'RED')
			{
			   LED6ColourCmd[0] = 0xff;
			   LED6ColourCmd[1] = 0;
			   LED6ColourCmd[2] = 0;
			}
			if(colour == 'GREEN')
			{
			   LED6ColourCmd[0] = 0;
			   LED6ColourCmd[1] = 0xff;
			   LED6ColourCmd[2] = 0;
			}
			if(colour == 'BLUE')
			{
			   LED6ColourCmd[0] = 0;
			   LED6ColourCmd[1] = 0;
			   LED6ColourCmd[2] = 0xff;
			}
			console.log(LED6ColourCmd);
		}
		if (lednumber == 7 )
		{
			if(colour == 'RED')
			{
			   LED7ColourCmd[0] = 0xff;
			   LED7ColourCmd[1] = 0;
			   LED7ColourCmd[2] = 0;
			}
			if(colour == 'GREEN')
			{
			   LED7ColourCmd[0] = 0;
			   LED7ColourCmd[1] = 0xff;
			   LED7ColourCmd[2] = 0;
			}
			if(colour == 'BLUE')
			{
			   LED7ColourCmd[0] = 0;
			   LED7ColourCmd[1] = 0;
			   LED7ColourCmd[2] = 0xff;
			}
			console.log(LED7ColourCmd);
		}
		if (lednumber == 8 )
		{
			if(colour == 'RED')
			{
			   LED8ColourCmd[0] = 0xff;
			   LED8ColourCmd[1] = 0;
			   LED8ColourCmd[2] = 0;
			}
			if(colour == 'GREEN')
			{
			   LED8ColourCmd[0] = 0;
			   LED8ColourCmd[1] = 0xff;
			   LED8ColourCmd[2] = 0;
			}
			if(colour == 'BLUE')
			{
			   LED8ColourCmd[0] = 0;
			   LED8ColourCmd[1] = 0;
			   LED8ColourCmd[2] = 0xff;
			}
			console.log(LED8ColourCmd);
		}
		console.log("Set LED colour request");
		console.log(count);
		count--;
		lednumber++;
	} while(count > 1);
    //    device.send(LEDColourCmd.buffer);
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
[' ', 'turn LED %m.lednum %m.onoff', 'ledonoff' , '1', 'ON'],
[' ', 'set LED %m.lednum colour to %m.col', 'ledcolour' , '1', 'RED'],
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
		   butnum: ['1','2', '3', '4','5','6','7','8','9','0','plus','minus'],
		   lednum: ['1','2', '3', '4','5','6','7','8', 'all'],
			  onoff: ['ON', 'OFF'],
			  col: ['RED', 'BLUE', 'GREEN'],
			  dir: ['clockwise', 'anti-clockwise']
        }
    };

    // Register the extension
    ScratchExtensions.register('CodePad', descriptor, ext,{type:'serial'});
})({});
