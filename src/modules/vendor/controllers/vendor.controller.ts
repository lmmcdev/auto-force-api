import{
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { Vendor, VendorEntity, VendorStatus, VendorType } from "../entities/vendor.entity";
import { CreateVendorDTO } from "../dto/create-vendor.dto";
import { UpdateVendorDTO } from "../dto/update-vendor.dto";
import { VendorService } from "../services/vendor.service";

const vendorsRoute = "v1/vendors"
export class VendorController{
    constructor(private readonly vendorService : VendorService){}

    async create(createVendorDTO : CreateVendorDTO): Promise<Vendor>{
        return this.vendorService.create(createVendorDTO);
    }

    async findAll(): Promise<Vendor[]>{
        return this.vendorService.findAll();
    }

    async findOne(id: string): Promise<Vendor | null>{
        return this.vendorService.findOne(id);
    }

    async update(
        id: string,
        updateVendorDto : UpdateVendorDTO
    ): Promise <Vendor | null>{
        return this.vendorService.update(id, updateVendorDto);
    }

    async remove(id: string): Promise<void> {
       return this.vendorService.remove(id);
    }

    async findByStatus(status: "Active" | "Inactive"): Promise<Vendor[]> {
        return this.vendorService.findByStatus(status);
    }

    async findByStatusAndType(status: VendorStatus, type : VendorType): Promise<Vendor[]>{
        return this.vendorService.findByStatusAndType(status,type);
    }

    
    
    

}

    //const vendorService : new VendorService();
   // const vendorController : new VendorController(vendorService);

    export async function vendorGet(
        request: HttpRequest,
        context: InvocationContext
    ): Promise<HttpResponseInit>{
        try {
        return {
            status: 200,
            jsonBody: {message: "Here are all the vendor"}
        }
        } catch (error) {
        return{
            status:500,
            jsonBody: {error: "There is not vendor"}
        }
        }
    }

    export async function vendorPost(
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit>{
    try {
      return {
        status: 200,
        jsonBody: {message: "Post vendor is ready"}
      }
    } catch (error) {
      return {
        status: 500,
        jsonBody: {message: "Post vendor is not ready"}
      }
    }
  }

  export async function vendorDelete(
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit>{
    try {
      return {
        status: 200,
        jsonBody: {message: "Delete vendor is ready"}
      }
    } catch (error) {
      return {
        status: 500,
        jsonBody: {message: "Delete vendor is not ready"}
      }
    }
  }

  export async function vendorPut(
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit>{
    try {
      return {
        status: 200,
        jsonBody: {message: "Put vendor is ready"}
      }
    } catch (error) {
      return {
        status: 500,
        jsonBody: {message: "Put vendor is not ready"}
      }
    }
  }

    app.http( "vendor-get-all", {
        methods: ["GET"],
        authLevel: "anonymous",
        route:vendorsRoute,
        handler: vendorGet,
      });

    app.http("vendor-post", {
          methods: ["POST"],
          authLevel: "anonymous",
          route: vendorsRoute,
          handler:vendorPost,
        });
      
    app.http("vendor-delete", {
          methods: ["DELETE"],
          authLevel: "anonymous",
          route: vendorsRoute,
          handler:vendorDelete,
        });

    app.http("vendor-put", {
          methods: ["PUT"],
          authLevel: "anonymous",
          route: vendorsRoute,
          handler:vendorPut,
        });    