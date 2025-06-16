import { Service, Characteristic, AccessoryPlugin, API, Logging, CharacteristicValue, } from 'homebridge';
import { DweloAPI, Sensor } from './DweloAPI';


export class DweloThermostatAccessory implements AccessoryPlugin {
  private readonly service: Service;
  private readonly informationService: Service;

  constructor(
    private readonly log: Logging,
    private readonly api: API,
    private readonly dwelo: DweloAPI,
    private readonly name: string,
    private readonly deviceId: number,
  ) {
    this.log.info(`Initializing DweloThermostatAccessory: ${name}`);

    this.service = new this.api.hap.Service.Thermostat(this.name);

    this.service
      .getCharacteristic(this.api.hap.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    this.service
      .getCharacteristic(this.api.hap.Characteristic.TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));

    this.service
      .getCharacteristic(this.api.hap.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.getCurrentMode.bind(this));

    this.service
      .getCharacteristic(this.api.hap.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getTargetMode.bind(this))
      .onSet(this.setTargetMode.bind(this));

    this.informationService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'Dwelo')
      .setCharacteristic(this.api.hap.Characteristic.Model, 'Thermostat')
      .setCharacteristic(this.api.hap.Characteristic.SerialNumber, this.deviceId);
  }

  // 🔍 Get most recent sensor data
  private async getSensorValue(type: string): Promise<string | null> {
    const sensors: Sensor[] = await this.dwelo.sensors(Number(this.deviceId));
    this.log.debug(`[Dwelo] Sensors for ${this.name}: ${JSON.stringify(sensors, null, 2)}`);
    const match = sensors.find(s => s.sensorType === type);
    return match?.value ?? null;
  }

  private async getCurrentTemperature(): Promise<number> {
    const val = await this.getSensorValue('current_temperature');
    const num = parseFloat(val ?? '');
    this.log.info(`[Dwelo] Current temp for ${this.name}: ${num}`);
    return isNaN(num) ? 22 : num;
  }

  private async getTargetTemperature(): Promise<number> {
    const val = await this.getSensorValue('target_temperature');
    const num = parseFloat(val ?? '');
    this.log.info(`[Dwelo] Target temp for ${this.name}: ${num}`);
    return isNaN(num) ? 22 : num;
  }

  private async setTargetTemperature(value: CharacteristicValue): Promise<void> {
    this.log.info(`[Dwelo] Set target temp for ${this.name} to ${value}`);
    await this.dwelo.setDeviceTemp(Number(this.deviceId), Number(value));
  }

  private async getCurrentMode(): Promise<number> {
    const val = await this.getSensorValue('mode');
    const mode = val ?? 'off';
    return mode === 'cooling' ? 2 : mode === 'heating' ? 1 : 0;
  }

  private async getTargetMode(): Promise<number> {
    const val = await this.getSensorValue('mode');
    const mode = val ?? 'off';
    return mode === 'cooling' ? 2 : mode === 'heating' ? 1 : 0;
  }

  private async setTargetMode(value: CharacteristicValue): Promise<void> {
    const mode = value === 2 ? 'cooling' : value === 1 ? 'heating' : 'off';
    this.log.info(`[Dwelo] Set mode for ${this.name} to ${mode}`);
    await this.dwelo.setDeviceMode(Number(this.deviceId), mode);
  }

  getServices(): Service[] {
    return [this.informationService, this.service];
  }
}
