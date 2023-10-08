import { useEffect } from 'react';
import type {PropsWithChildren} from 'react';
import RNFS from 'react-native-fs';

const WINDFILE = RNFS.DocumentDirectoryPath + '/windInfoData.json';
const SAVED_WIND_INFO = RNFS.DocumentDirectoryPath + '/savedWindInfo.json';
export const SWITCH_KEY_SPEED = "WIND SPEED";
export const SWITCH_KEY_DIRECTION = "WIND DIRECTION";

const consoleErrorMessage = async (functionType: string, error: object) => {
    console.log("WIND API - "+functionType+"JSON() Error: "+error.message, error);
}

const writeJSONDataToSave = async (windSpeed: number, windDir: number) => {
    return (JSON.stringify({
            "current": {
                "wind_speed": windSpeed,
                "wind_deg": windDir,
            }
    }))
}

const saveJSON = async (data: string, file: string) => {
    RNFS.writeFile(file, data, "ascii")
            .then((success) => {
                console.log("Saved to file");
            })
            .catch((error) => {
                consoleErrorMessage("save",error);
            }
    );
 }

const readJSON = async (attribute: string, file: object) => {
    RNFS.readFile(file, "ascii")
        .then((data) => {
            const currentData = JSON.parse(data);
            if(attribute === WIND_SPEED_KEY) {
               return currentData.current.wind_speed;
            }
            else if(attribute === WIND_DEG_KEY) {
                return currentData.current.wind_deg;
            }
        })
        .catch((error) => {
            consoleErrorMessage("read",error);
        });
}

const getWindData = async (data:string, switchKey:string) => {

    switch (switchKey){
        case SWITCH_KEY_SPEED:
            return data.current.wind_speed;
        case SWITCH_KEY_DIRECTION:
            return data.current.wind_deg;
    }

}

export const fetchData = async (lat: number, lng: number, api:string, switchKey:string) => {
  try {
    const response = await fetch(api);
    const newData = await response.json();
    return getWindData(newData, switchKey);
  } catch (error) {
    console.error(consoleErrorMessage("fetchData",error));
    return null;
  }
};