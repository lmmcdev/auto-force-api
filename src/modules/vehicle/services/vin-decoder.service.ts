export interface VinDecoderResult {
  vin: string;
  make: string | null;
  model: string | null;
  modelYear: number | null;
  manufacturer: string | null;
  plantCity: string | null;
  vehicleType: string | null;
  bodyClass: string | null;
  series: string | null;
  trim: string | null;
  engineModel: string | null;
  engineCylinders: string | null;
  displacement: string | null;
  fuelType: string | null;
  driveType: string | null;
  transmission: string | null;
  errorCode: string | null;
  errorText: string | null;
  additionalErrorText: string | null;
  rawResponse?: any;
}

export class VinDecoderService {
  private readonly NHTSA_API_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

  async decodeVin(vin: string): Promise<VinDecoderResult> {
    if (!vin || vin.trim().length === 0) {
      throw new Error('VIN is required');
    }

    const trimmedVin = vin.trim();

    // Basic VIN format validation (17 characters)
    if (trimmedVin.length !== 17) {
      throw new Error('VIN must be exactly 17 characters');
    }

    try {
      const url = `${this.NHTSA_API_URL}/DecodeVin/${encodeURIComponent(trimmedVin)}?format=json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`NHTSA API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // NHTSA returns Results array with key-value pairs
      const results = data.Results || [];

      const getValueByVariable = (variableName: string): string | null => {
        const item = results.find((r: any) => r.Variable === variableName);
        return item?.Value || null;
      };

      const result: VinDecoderResult = {
        vin: trimmedVin,
        make: getValueByVariable('Make'),
        model: getValueByVariable('Model'),
        modelYear: this.parseYear(getValueByVariable('Model Year')),
        manufacturer: getValueByVariable('Manufacturer Name'),
        plantCity: getValueByVariable('Plant City'),
        vehicleType: getValueByVariable('Vehicle Type'),
        bodyClass: getValueByVariable('Body Class'),
        series: getValueByVariable('Series'),
        trim: getValueByVariable('Trim'),
        engineModel: getValueByVariable('Engine Model'),
        engineCylinders: getValueByVariable('Engine Number of Cylinders'),
        displacement: getValueByVariable('Displacement (L)'),
        fuelType: getValueByVariable('Fuel Type - Primary'),
        driveType: getValueByVariable('Drive Type'),
        transmission: getValueByVariable('Transmission Style'),
        errorCode: getValueByVariable('Error Code'),
        errorText: getValueByVariable('Error Text'),
        additionalErrorText: getValueByVariable('Additional Error Text'),
        rawResponse: data,
      };

      return result;
    } catch (error: any) {
      throw new Error(`Failed to decode VIN: ${error.message}`);
    }
  }

  private parseYear(yearStr: string | null): number | null {
    if (!yearStr) return null;
    const parsed = parseInt(yearStr, 10);
    return isNaN(parsed) ? null : parsed;
  }
}

export const vinDecoderService = new VinDecoderService();
