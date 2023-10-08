import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View, PermissionsAndroid, Image } from 'react-native';
import { tw } from 'tailwind-react-native-classnames';
import Geolocation from 'react-native-geolocation-service';
import LinearGradient from 'react-native-linear-gradient';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import axios from 'axios';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import IdleTimerManager from 'react-native-idle-timer';
import Tts from 'react-native-tts';

import sniperOverlay from './assets/images/overlay.png';
import greenCircle from './assets/images/greenCircle.png';
import promptOverlay from './assets/images/proximityuntriggered.png';
import bgCircle from './assets/images/bgCircle.png';
import checkImage from './assets/images/check.png';
import scopeImage from './assets/images/scope.png';

import { fetchData, SWITCH_KEY_SPEED, SWITCH_KEY_DIRECTION, SWITCH_KEY_ZONE } from './windAPI.tsx'
import { magnetometer ,setUpdateIntervalForType, SensorTypes} from 'react-native-sensors'

const Stack = createStackNavigator();
const manager = new BleManager();
const serviceUUID = "0000FFE0-0000-1000-8000-00805F9B34FB";
const characteristicUUID = "0000FFE1-0000-1000-8000-00805F9B34FB";
var currProxState = 0;
var prevProxState = 0; // default is not scoped in
var currButtonState = 1;
var prevButtonState = 1; // default is 1 (not clicked)
var currPromptStylingString = "absolute top-0 left-0 w-full h-full object-contain opacity-90"; // show overlay
var notScanned = true;
var prevTouchState = 0;
var currTouchState = 0;
var currZoomLevel = 1.0;

const OPENWEATHER_KEY = '7fe9c50948cb08ad6b333a8784000233';

function App({navigation}) {
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'To use the app, we need access to your location',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location permission granted');
      } else {
        console.log('Location permission denied');
      }
    } catch (error) {
      console.warn('Error requesting location permission and bluetooth:', error);
    }
  };

  useEffect(() => {
    // Initialize TTS
    Tts.getInitStatus().then(() => {
        console.log('TTS is initialized');
        Tts.setDefaultVoice('en-us-x-ana#female_1-local');
    });

    // Clean up TTS when the component unmounts
    return () => {
        Tts.stop();
    };
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="home" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="home" component={HomeScreen} />
        <Stack.Screen name="scope" component={ScopeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function windData(){
    return
}

function HomeScreen() {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [displayCity, setDisplayCity] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [windDir, setWindDir] = useState('');

  useEffect(() => {
    const watchLocation = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
      },
      (error) => {
        console.log('Error getting location:', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => {
      Geolocation.clearWatch(watchLocation);
    };
  }, []);

// Josh: This below code is not done, temporary conversion from latitute to longitude to a city
// Charges my Google API Key to format cities, may fail depending on Google servers + Axios
  const reverseCity = async (latitude, longitude) => {
    const API_KEY = 'AIzaSyDzpX5KsaBvWhhMIXauTaYnENBLkUWiu68';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}`;

    try {
      const response = await axios.get(url);
      const { results } = response.data;

      if (results.length > 0) {
        const locationDataRaw = response.data.plus_code.compound_code;
        const locationDataClean = locationDataRaw.substring(locationDataRaw.indexOf(' ')+1);
        setDisplayCity(locationDataClean);
        console.log('City:', locationDataClean);
      } else {
        console.log('No results found');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    if (location) {
        reverseCity(location.latitude, location.longitude);
        const lat = location.latitude;
        const lng = location.longitude;
        const fetchDataAndUpdate = async () => {
            const API_URL_FORMATTED = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&units=imperial&exclude=minutely,hourly,daily,alerts&appid=${OPENWEATHER_KEY}`;
            const speedData = await fetchData(lat, lng, API_URL_FORMATTED, SWITCH_KEY_SPEED);
            const directionData = await fetchData(lat, lng, API_URL_FORMATTED, SWITCH_KEY_DIRECTION);

            setWindSpeed(speedData);
            setWindDir(directionData);
            console.log("wind speed: "+speedData+" wind direction: "+directionData);
        };

        fetchDataAndUpdate();
    }
  }, [location]);

  const [time, setTime] = useState({
      seconds: new Date().getSeconds().toString().padStart(2,'0'),
      minutes: new Date().getMinutes().toString().padStart(2,'0'),
      hours: new Date().getHours().toString().padStart(2,'0'),
      zone: new Date().toLocaleTimeString('en-CA',{timeZoneName:'short'}).split(' ')[2]
    });



    //get time dynamically https://www.educative.io/answers/how-to-create-a-dynamic-digital-clock-in-react
    useEffect(()=>{
      const interval = setInterval(() => {
          const updatedDate = new Date();
          setTime({
              seconds: updatedDate.getSeconds().toString().padStart(2,'0'),
              minutes: updatedDate.getMinutes().toString().padStart(2,'0'),
              hours: updatedDate.getHours().toString().padStart(2,'0'),
              zone: updatedDate.toLocaleTimeString('en-CA',{timeZoneName:'short'}).split(' ')[2]
          });
      }, 1000);
      return () => clearInterval(interval);
    },[])

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#79868E', '#282D31']}
        style={{ flex: 1 }}>
        <View className="absolute blur-md opacity-20 z-0 h-screen" >
            <Image source={bgCircle} className= "absolute top-[40px] left-[-22px] "/>
            <Image source={bgCircle} className= "absolute top-[439px] left-[328px] "/>
            <Image source={bgCircle} className= "absolute h-8 w-8 top-[400px] left-[50px] "/>
            <Image source={bgCircle} className= "absolute h-40 w-40 top-[580px] left-[-35px] "/>
            <Image source={bgCircle} className= "absolute h-44 w-44 bottom-[-70px] left-[270px] "/>
        </View>
        <SafeAreaView className="flex-1">
          <View className="flex-row border-b border-white pt-4">
            <View className="self-start p-4 pt-1 justify-end ml-auto border-l border-white flex flex-row">
                <View className="h-10 w-10 mr-3">
                    <Image source={checkImage} className= "h-10 w-10"/>
                </View>
                <View>
                    <Text className="font-InterBold uppercase tracking-tighter" style={{ color: 'white', fontSize: 16 }}>
                                {displayCity ? `${displayCity}` : 'Loading...'}
                    </Text>
                    <Text className="text-[#3CD642] text-sm font-InterMedium uppercase tracking-tighter">{windSpeed ? `Wind Speed: ${windSpeed} MPH` : 'Loading...'}</Text>
                </View>
            </View>
          </View>

          <View className="self-start p-3 m-2 mt-16"
            style={{
                alignSelf: 'flex-start', // Adjust the positioning of the time elements
                padding: 10, // Add some padding around the time elements
                margin: 2,
            }}>
            <Text className="font-InterMedium text-white text-5xl tracking-tighter">Welcome back, Agent 47.</Text>
            <Text className="font-Inter text-white text-2xl mt-8 tracking-tighter" style={{ fontFamily: 'monospace' }}>{time.hours}:{time.minutes}:{time.seconds} {(time.hours <= 12) ? `AM` : `PM`} ({time.zone})</Text>

          </View>
          <View className="self-start absolute bottom-0 left-0 pb-8 pl-2">
            <TouchableOpacity className={activitySelectionButtons} onPress={() => scopePressed({ navigation, windSpeed, windDir })}>
               <View className="h-14 w-14 mr-4">
                  <Image source={scopeImage} className= "h-14 w-14"/>
               </View>
               <View>
                  <Text className={redText}>NERF GUN</Text>
                  <Text className={activitySelectionButtonText}>SCOPE</Text>
               </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// on buttons pressed at home screen
const scopePressed = ({ navigation, windSpeed, windDir }) => {
    navigation.navigate("scope", {w_speed: windSpeed, w_direction: windDir});
    console.log("DEBUG: Scope pressed");

    Tts.speak('Gun ready. Agent 47, you are ready for action.')
    console.log("DEBUG: Scope pressed, sent in windspeed "+windSpeed+" and dir:"+windDir);
}

// scope screen layout
function ScopeScreen ({route}) {
  const [distance, setDistance] = useState("--");
  const [promptChanged, setPromptChanged] = useState(0);
  const [touched, setTouched] = useState(0);
  const [clicked, setClicked] = useState(0);
  const windSpeed = route.params.w_speed;
  const windDirection = route.params.w_direction;
  const [compassDirection, setCompassDirection] = useState('Unknown');
  const [compassAngle, setCompassAngle] = useState(null);

  const connectDevice = async (device: Device) => {
    console.log('establishing connection to hm-10:', device.name);
    device.connect()
        .then((connectedDevice) => {
              console.log('Connected to HM-10:', connectedDevice.id);
              return discoverServicesAndCharacteristics(connectedDevice);
        })
        .then(async (connectedDevice) => {
              while (true) {
                  updateValues(connectedDevice);
                  await sleep(100);
              }
        })
        .catch((error) => {
              console.error('Error connecting to HM-10:', error);
        });
  };

  const discoverServicesAndCharacteristics = async (device) => {
    try {
      const connectedDevice = await device.discoverAllServicesAndCharacteristics();
      const services = await connectedDevice.services();

      return connectedDevice;
    } catch (error) {
      console.error('Error discovering services and characteristics:', error);
    }
  };

  //read the arduino value from here
  const updateValues = (connectedDevice: Device) => {
    connectedDevice.readCharacteristicForService(serviceUUID, characteristicUUID)
      .then((characteristic) => {
        const decode = (str: string):string => Buffer.from(str, 'base64').toString('binary');
        const base64Value = characteristic.value;
        const stringValue = decode(base64Value);
        parseValFromArduino(stringValue);
    })
  }

  // parse the value and set to the state holder
  const parseValFromArduino = (str: String) => {
    const separator = ",";
    const parts = str.split(separator);
    // alert distance
    setDistance(parts[1]);
    // alert zoom touch sensor
    currTouchState = Number(parts[2]);
    if (checkTouchStateSwitch()) setTouched(1); // if state switch detected, set touched to true, trigger rerender
    prevTouchState = Number(parts[2]);
    // alert prox sensor 
    var temp;
    if (parts[0] == "SCOPE_IN") temp = 1;
    else temp = 0;
    currProxState = temp;
    if (checkProxStateSwitch()) {
      console.log("state switch detected");
      if (temp == 1) currPromptStylingString = "absolute top-0 left-0 w-full h-full object-contain opacity-0"; //hide prompt
      else currPromptStylingString = "absolute top-0 left-0 w-full h-full object-contain opacity-90"; //show prompt
      setPromptChanged(1) //notify the change to rerender;
    }
    prevProxState = temp;
    // alert button to trigger voice
    currButtonState = Number(parts[3]);
    if (checkButtonStateSwitch()) setClicked(1); // if state switch detected, set touched to true, trigger rerender
    prevButtonState = Number(parts[3]);
  }

  // for touch sensor: zooming in and out
  const checkTouchStateSwitch = () => {
    if (prevTouchState != currTouchState) { // state switch detected!
      return true;
    } else { // state didnt switch
      return false;
    }
  }

  // for prox sensor: check if scoped in/ out
  const checkProxStateSwitch = () => {
    if (prevProxState != currProxState) { // state switch detected!
      return true;
    } else { // state didnt switch
      return false;
    }
  }

   // for button: triggering the voice
   // the sensor works like this:
   // when the button isn't clicked, it outputs 1
   // when clicked/ held, it outputs 0
   // this function should only return true when the state changes from 1 -> 0 
   const checkButtonStateSwitch = () => {
    if (prevButtonState == 1 && currButtonState == 0) { // state switch detected!
      return true;
    } else { // state didnt switch
      return false;
    }
  }

  if (notScanned) {
    manager.startDeviceScan(null, null, (error, scannedDevice) => {
      console.log('scanning');
        if (error) {
          console.warn("Device scanning error: "+error);
        }
  
        if (scannedDevice && scannedDevice.name == 'sniper') {
          manager.stopDeviceScan();
          console.log("Arduino found, attempting connection");
          notScanned = false;
          connectDevice(scannedDevice);
        }
    });

     // stop scanning devices after 5 seconds
    setTimeout(() => {
      manager.stopDeviceScan();
    }, 5000);
  }

 //compass
     useEffect(() => {

      let isMounted = true;

          // Set the update interval for the magnetometer (optional)
          setUpdateIntervalForType(SensorTypes.magnetometer, 100); // Set the update interval to 100 milliseconds (adjust as needed)

          // Subscribe to magnetometer updates
          const subscription = magnetometer.subscribe(({ x, y }) => {
            if (isMounted) {
              // Calculate the angle in radians
              const angleRad = Math.atan2(y, x);

              // Convert the angle from radians to degrees (0 to 360)
              const angleDeg = (angleRad >= 0 ? angleRad : 2 * Math.PI + angleRad) * (180 / Math.PI);

              // Calculate the compass direction based on the angle
              let compassDir = 'Unknown';
              if (angleDeg >= 0 && angleDeg < 22.5) {
                compassDir = 'N ';
              } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
                compassDir = 'NE';
              } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
                compassDir = 'E ';
              } else if (angleDeg >= 112.5 && angleDeg < 157.5) {
                compassDir = 'SE';
              } else if (angleDeg >= 157.5 && angleDeg < 202.5) {
                compassDir = 'S ';
              } else if (angleDeg >= 202.5 && angleDeg < 247.5) {
                compassDir = 'SW';
              } else if (angleDeg >= 247.5 && angleDeg < 292.5) {
                compassDir = 'W ';
              } else if (angleDeg >= 292.5 && angleDeg < 337.5) {
                compassDir = 'NW';
              } else if (angleDeg >= 337.5 && angleDeg < 360) {
                compassDir = 'N ';
              }

              setCompassAngle(angleDeg.toFixed(2));
              setCompassDirection(compassDir);
            }
          });

          return () => {
            isMounted = false;
            // Unsubscribe from the magnetometer updates when the component unmounts
            subscription.unsubscribe();
          };
        }, []);

  useEffect(() => {
      requestCameraPermission();
  }, []);
  const requestCameraPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'To use the scope, the app needs access to your camera.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Camera permission granted');
      } else {
        console.log('Camera permission denied');
      }
    } catch (error) {
      console.warn('Error requesting camera permission:', error);
    }
  }

  const devices = useCameraDevices();
  const device = devices?.back;

  if (!device) {
      return null; // Return null or a loading component when no device is available
  }

  // for moving the green circle
  var stylingStringCircle = "";
  // TODO: need to offset later
  if (Number(distance) <= 150) stylingStringCircle = "absolute top-0 left-[49.5%] h-full object-contain opacity-0";
  else if (currZoomLevel != 1.0) stylingStringCircle = "absolute top-0 left-[49.5%] h-full object-contain opacity-0";
  else if (Number(distance) <= 200) stylingStringCircle = "absolute top-0 left-[66.5%] h-full object-contain opacity-100";
  else if (Number(distance) <= 250) stylingStringCircle = "absolute top-0 left-[69%] h-full object-contain opacity-100";
  else stylingStringCircle = "absolute top-0 left-[72%] h-full object-contain opacity-0";

  // for changing the camera zoom level
  if (Number(touched) == 1) { // touched, zoom 0.5x
    if (currZoomLevel <= 1.5) currZoomLevel += 0.5; // add 0.5 zoom to it
    else currZoomLevel = 1.0; // if out of bound, reset it
    setTouched(0); // reset it
  }
  if (Number(promptChanged) == 1) setPromptChanged(0);

  if (Number(clicked) == 1) {
    console.log("clicked!"); //OVER HERE JOSH THIS SHOULD TRIGGER THE VOICE ACCORDINGLY
    const ttsText = "Your wind speed is " + windSpeed + "miles per hour, and wind direction is +" + windDirection + "degrees.";
    Tts.speak(ttsText);
    setClicked(0); //reset it
  }

  return(

      <View className="flex-1 w-full h-full">
            <Camera
              className="flex-1 justify-end items-center aspect-w-16 aspect-h-9"
              device={device}
              isActive={true}
              zoom={currZoomLevel}
              captureFormat="photo"
            />
    
              <Image source={sniperOverlay} className="absolute top-0 left-0 w-full h-full object-contain opacity-90"/>
              <Image source={greenCircle} className={stylingStringCircle} />
              <Text className="absolute text-red-500 top-[30%] left-[40%] -rotate-90" >{currZoomLevel.toFixed(1)}x zoom</Text>
              <Text className="absolute text-red-500 top-[30%] left-[52%] -rotate-90" >{distance} cm</Text>
              <Text className="absolute text-red-500 top-[48%] -rotate-90" >{compassAngle + `\u00B0`} {compassDirection}</Text>
              <Image source={promptOverlay} className={currPromptStylingString}/>
      </View>
  );
}


const activitySelectionButtons = "self-start bg-white p-4 pl-6 pr-12 m-2 flex flex-row rounded";
const activitySelectionButtonText = "text-black text-4xl font-InterBold uppercase tracking-tighter";
const redText = "text-[#F9013C] text-xs font-InterMedium uppercase tracking-tighter ";

export default App;
