import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { VehicleService } from "../services/vehicle.service";
import { CreateVehicleDto } from "../dto/create-vehicle.dto";
import { UpdateVehicleDto } from "../dto/update-vehicle.dto";
import { Vehicle } from "../entities/vehicle.entity";
const vehiclesRoute = "v1/vehicles";
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    return this.vehicleService.create(createVehicleDto);
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehicleService.findAll();
  }

  async findOne(id: string): Promise<Vehicle | null> {
    return this.vehicleService.findOne(id);
  }

  async update(
    id: string,
    updateVehicleDto: UpdateVehicleDto
  ): Promise<Vehicle | null> {
    return this.vehicleService.update(id, updateVehicleDto);
  }

  async remove(id: string): Promise<void> {
    return this.vehicleService.remove(id);
  }

  async findByVin(vin: string): Promise<Vehicle | null> {
    return this.vehicleService.findByVin(vin);
  }

  async findByTagNumber(tagNumber: string): Promise<Vehicle | null> {
    return this.vehicleService.findByTagNumber(tagNumber);
  }

  async findByStatus(status: "Active" | "Inactive"): Promise<Vehicle[]> {
    return this.vehicleService.findByStatus(status);
  }

  async findByMakeAndYear(make: string, year: number): Promise<Vehicle[]> {
    return this.vehicleService.findByMakeAndYear(make, year);
  }
}

const vehicleService = new VehicleService();
const vehicleController = new VehicleController(vehicleService);

export async function vehicleCheck(
  request: HttpRequest,
  context: InvocationContext
  ): Promise<HttpResponseInit>{
    try { 
      context.log("esto trabaja")
      const response : HttpResponseInit = {
        status: 200,
        jsonBody: {message:"Vehicle Check"}
      } 
      return response;
    } catch (error) {
      return {
        status: 500,
        jsonBody: {error: "Vehicle check failed"}
      }
    }
  }

  export async function vehicleGet(
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit>{
    try {
      return {
        status: 200,
        jsonBody: {message: "Here are all the vehicles"}
      }
    } catch (error) {
      return{
        status:500,
        jsonBody: {error: "There is not vehicles"}
      }
    }
  }

  export async function vehiclePost(
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit>{
    try {
      return {
        status: 200,
        jsonBody: {message: "Post vehicle is ready"}
      }
    } catch (error) {
      return {
        status: 500,
        jsonBody: {message: "Post vehicle is not ready"}
      }
    }
  }

  export async function vehicleDelete(
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit>{
    try {
      return {
        status: 200,
        jsonBody: {message: "Delete vehicle is ready"}
      }
    } catch (error) {
      return {
        status: 500,
        jsonBody: {message: "Delete vehicle is not ready"}
      }
    }
  }

  export async function vehiclePut(
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit>{
    try {     
        
      return {
        status: 200,
        jsonBody: {message: "Put vehicle is ready"}
      }
    } catch (error) {
      return {
        status: 500,
        jsonBody: {message: "Put vehicle is not ready"}
      }
    }
  }
  
  app.http( "vehicle-check", {
    methods: ["GET"],
    authLevel: "anonymous",
    route:`${vehiclesRoute}/check`,
    handler: vehicleCheck,
  });
  
  app.http("vehicle-get-all", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: vehiclesRoute,
    handler:vehicleGet,
  });
  
  app.http("vehicle-post", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: vehiclesRoute,
    handler:vehiclePost,
  });

  app.http("vehicle-delete", {
    methods: ["DELETE"],
    authLevel: "anonymous",
    route: vehiclesRoute,
    handler:vehicleDelete,
  });

  app.http("vehicle-put", {
    methods: ["PUT"],
    authLevel: "anonymous",
    route: vehiclesRoute,
    handler: vehiclePut
  });
